import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  WS_PORT,
  COGNITIVE_LOAD_THRESHOLD,
  GENERATION_COOLDOWN_MS,
  DEFAULT_FORM_FIELDS
} from "./config/constants.js";
import { validateTelemetryMessage } from "./validators/telemetryValidator.js";
import { generateComponent } from "./services/codeGenService.js";
import {
  validateComponentAst,
  validateComponentAstWithAudit,
  validate,
  ASTSecurityError
} from "./services/astValidator.js";
import { createSessionStore } from "./store/sessionStore.js";

/**
 * Creates the HTTP + WebSocket server instance for AuraGen.
 *
 * Implements full messaging protocol:
 * - Handshake: { type: "connected", sessionId, threshold }
 * - Explicit Generation: { type: "generate_request", activeField, userInput, ... }
 * - Telemetry Streaming: { type: "telemetry", metrics, cognitiveLoadScore, ... }
 * - Form Revert: { type: "revert", sessionId }
 * - Strict emitted events:
 *     1. generation_started: Emitted when LLM generation begins
 *     2. component: Emitted when generated code passes security validator
 *     3. validation_failed: Emitted when generated code fails security validation
 *     4. error: Emitted on pipeline crash, malformed payload, or invalid message
 *
 * Session management:
 * - Uses a JavaScript Map (`sessions`) to track connected clients and state
 */
export function createAuraGenServer({
  port = WS_PORT,
  threshold = COGNITIVE_LOAD_THRESHOLD,
  cooldownMs = GENERATION_COOLDOWN_MS,
  codeGenerator = generateComponent,
  validator = validate,
  sessionStore = createSessionStore()
} = {}) {
  // JavaScript Map to track connected clients and their runtime session states
  const sessions = new Map();

  // Semantic component cache keyed by formId + frictionField + validationErrors + privacyMode (max 100)
  const componentCache = new Map();
  const MAX_CACHE_ENTRIES = 100;

  function buildSemanticCacheKey({ formId = "default", activeField = "", validationErrors = {}, privacyMode = "cloud" }) {
    const errKeys = Object.keys(validationErrors || {}).sort().join(",");
    return `${formId}::${activeField}::${errKeys}::${privacyMode}`;
  }

  function getCachedComponent(key, userInput = {}) {
    if (!componentCache.has(key)) return null;
    const entry = componentCache.get(key);
    // Refresh LRU position
    componentCache.delete(key);
    componentCache.set(key, entry);
    // Hydrate latest userInput into initialValues default if present
    if (userInput && Object.keys(userInput).length > 0 && entry.code.includes("initialValues = {")) {
      return entry.code.replace(
        /initialValues\s*=\s*\{[^}]*\}/,
        `initialValues = ${JSON.stringify(userInput)}`
      );
    }
    return entry.code;
  }

  function setCachedComponent(key, code) {
    if (componentCache.has(key)) componentCache.delete(key);
    componentCache.set(key, { code, cachedAt: Date.now() });
    if (componentCache.size > MAX_CACHE_ENTRIES) {
      const oldest = componentCache.keys().next().value;
      if (oldest !== undefined) componentCache.delete(oldest);
    }
  }

  function streamComponentChunks(ws, sessionId, activeField, code) {
    if (ws.readyState !== WebSocket.OPEN || !code) return;
    const totalChunks = 6;
    const chunkSize = Math.max(1, Math.ceil(code.length / totalChunks));
    for (let i = 0; i < totalChunks; i++) {
      const chunk = code.slice(i * chunkSize, (i + 1) * chunkSize);
      if (!chunk) continue;
      ws.send(
        JSON.stringify({
          type: "component_chunk",
          sessionId,
          activeField,
          chunk,
          index: i,
          totalChunks,
          progress: Math.min(100, Math.round(((i + 1) / totalChunks) * 100)),
          timestamp: Date.now()
        })
      );
    }
  }

  function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(payload));
  }

  /**
   * Evaluates component code through the security validator (`validate`).
   * Supports both validator functions that throw ASTSecurityError and those
   * returning { isValid: false, errors: [...] }.
   */
  function runSecurityValidation(code) {
    try {
      const useDefaultValidator = validator === validate;
      if (useDefaultValidator) {
        const audit = validateComponentAstWithAudit(code);
        return {
          valid: true,
          code: audit.code,
          astAudit: {
            parseTimeMs: audit.parseTimeMs,
            nodesInspected: audit.nodesInspected,
            blockedRulesChecked: audit.blockedRulesChecked,
            passed: true
          }
        };
      }

      const res = validator(code);
      if (res && typeof res === "object") {
        if (res.isValid === false || res.valid === false || res.passed === false) {
          const errs = res.errors || (res.error ? [res.error] : ["Security validation failed"]);
          return {
            valid: false,
            message: "Generated component failed security validation",
            errors: errs.map((e) =>
              typeof e === "string" ? { rule: "security-violation", message: e } : e
            )
          };
        }
      }
      return {
        valid: true,
        code: typeof res === "string" ? res : code,
        astAudit: { parseTimeMs: 0.5, nodesInspected: 0, blockedRulesChecked: 10, passed: true }
      };
    } catch (err) {
      return {
        valid: false,
        message: err.message || "Generated component failed security validation",
        errors: [
          {
            rule: err.details?.rule || err.name || "ASTSecurityError",
            message: err.message
          }
        ],
        rawError: err
      };
    }
  }

  const httpServer = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      res.end();
      return;
    }

    const requestUrl = new URL(req.url || "/", "http://localhost");
    const pathname = requestUrl.pathname;

    // Health check endpoint
    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "auragen-websocket-server",
        threshold,
        cooldownMs,
        connectedClients: wss.clients.size,
        activeSessions: sessions.size,
        storedSessions: sessionStore.size,
        cacheSize: componentCache.size,
        timestamp: Date.now()
      });
      return;
    }

    // List all tracked sessions
    if (req.method === "GET" && pathname === "/api/sessions") {
      const activeList = Array.from(sessions.values()).map((s) => ({
        sessionId: s.sessionId,
        clientIp: s.clientIp,
        connectedAt: s.connectedAt,
        lastActiveAt: s.lastActiveAt,
        activeField: s.activeField,
        inFlight: s.inFlight,
        generationCount: s.generationCount
      }));

      sendJson(res, 200, {
        activeSessions: activeList,
        sessions: sessionStore.listSessions(),
        total: sessions.size
      });
      return;
    }

    // Historical friction metrics for a specific session: GET /api/sessions/:sessionId/metrics
    const sessionMetricsMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/metrics$/);
    if (req.method === "GET" && sessionMetricsMatch) {
      const sessionId = decodeURIComponent(sessionMetricsMatch[1]);
      const metrics = sessionStore.getSessionMetrics(sessionId);

      if (!metrics) {
        sendJson(res, 404, {
          error: "Session not found",
          sessionId
        });
        return;
      }

      sendJson(res, 200, metrics);
      return;
    }

    sendJson(res, 404, {
      error: "Not found. Available routes: GET /health, GET /api/sessions, GET /api/sessions/:sessionId/metrics"
    });
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws, req) => {
    const urlObj = new URL(req.url || "/", "http://localhost");
    const initialSessionId =
      urlObj.searchParams.get("sessionId") ||
      `sess_${Math.random().toString(36).slice(2, 10)}`;
    const clientIp = req.socket.remoteAddress || "unknown";

    ws.isAlive = true;
    ws.sessionId = initialSessionId;

    // Session Management: Register client in JavaScript Map
    const sessionInfo = {
      sessionId: initialSessionId,
      ws,
      clientIp,
      connectedAt: Date.now(),
      lastActiveAt: Date.now(),
      activeField: null,
      inFlight: false,
      lastTriggeredAt: 0,
      generationCount: 0
    };
    sessions.set(initialSessionId, sessionInfo);

    console.log(
      `[WS] Client connected from ${clientIp} [session: "${initialSessionId}"] (Active sessions: ${sessions.size})`
    );

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Notify client of successful connection and active cognitive load threshold
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "connected",
          sessionId: initialSessionId,
          threshold,
          timestamp: Date.now()
        })
      );
    }

    ws.on("message", async (rawData) => {
      let parsed = null;
      try {
        parsed =
          typeof rawData === "string"
            ? JSON.parse(rawData)
            : JSON.parse(rawData.toString("utf-8"));
      } catch (parseErr) {
        console.warn("[WS] Failed to parse incoming JSON:", parseErr.message);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid JSON format: unable to parse message",
              timestamp: Date.now()
            })
          );
        }
        return;
      }

      if (!parsed || typeof parsed !== "object") {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Message payload must be a non-null JSON object",
              timestamp: Date.now()
            })
          );
        }
        return;
      }

      const rawType = parsed.type;
      const msgType = String(rawType || "").toLowerCase();

      // Synchronize session ID in JavaScript Map
      const sid = parsed.sessionId || ws.sessionId;
      if (sid) {
        if (ws.sessionId && ws.sessionId !== sid) {
          sessions.delete(ws.sessionId);
        }
        ws.sessionId = sid;

        let s = sessions.get(sid);
        if (!s) {
          s = {
            sessionId: sid,
            ws,
            clientIp,
            connectedAt: Date.now(),
            inFlight: false,
            lastTriggeredAt: 0,
            generationCount: 0
          };
          sessions.set(sid, s);
        } else {
          s.ws = ws;
        }

        s.lastActiveAt = Date.now();
        if (parsed.activeField || parsed.activeFieldId) {
          s.activeField = parsed.activeField || parsed.activeFieldId;
        }
      }

      const currentSession = sessions.get(sid) || {
        sessionId: sid,
        ws,
        inFlight: false,
        lastTriggeredAt: 0,
        generationCount: 0
      };

      // -----------------------------------------------------------------------
      // Protocol Handler 1: Explicit generate_request
      // -----------------------------------------------------------------------
      if (msgType === "generate_request") {
        const targetField =
          parsed.activeField || parsed.activeFieldId || parsed.field || "annualIncome";
        const userInput =
          parsed.userInput ||
          parsed.formValues ||
          parsed.formStateSnapshot?.values ||
          {};
        const domContext =
          parsed.domContext || parsed.formStateSnapshot?.domContext || {};
        const formFields = parsed.formFields || DEFAULT_FORM_FIELDS;
        const formId = parsed.formId || parsed.domContext?.formId || "infotact-finance-v1";
        const privacyMode = parsed.privacyMode || "cloud";
        const score = typeof parsed.score === "number" ? parsed.score : 85;
        const templateId = parsed.templateId || null;

        // Guard against duplicate in-flight requests for this session
        if (currentSession.inFlight) {
          console.warn(`[CodeGen] Generation already in flight for session "${sid}". Skipping duplicate.`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "error",
                sessionId: sid,
                message: "Component generation already in flight for this session",
                timestamp: Date.now()
              })
            );
          }
          return;
        }

        currentSession.inFlight = true;
        currentSession.activeField = targetField;
        const genStartMs = performance.now();

        // 1. Emit strict event: generation_started
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "generation_started",
              sessionId: sid,
              activeField: targetField,
              formId,
              privacyMode,
              timestamp: Date.now()
            })
          );
        }

        const cacheKey = buildSemanticCacheKey({
          formId,
          activeField: targetField,
          validationErrors: domContext?.validationErrors,
          privacyMode
        });

        let rawCode = codeGenerator === generateComponent ? getCachedComponent(cacheKey, userInput) : null;
        const isCacheHit = Boolean(rawCode);

        if (!isCacheHit) {
          console.log(
            `[CodeGen] 🚀 generate_request for "${sid}" (${formId}, field="${targetField}", privacy=${privacyMode}). Routing to pipeline...`
          );

          try {
            // 2. Route to LLM / Privacy pipeline (generateComponent)
            rawCode = await codeGenerator({
              activeField: targetField,
              formFields,
              userInput,
              domContext,
              formId,
              privacyMode,
              score
            });
          } catch (genErr) {
            currentSession.inFlight = false;
            console.error(
              `[CodeGen] ❌ LLM pipeline generation failed for session "${sid}":`,
              genErr.message
            );
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  sessionId: sid,
                  message: genErr.message || "Component generation pipeline failed",
                  details: genErr.stack || genErr.message,
                  timestamp: Date.now()
                })
              );
            }
            return;
          }
        } else {
          console.log(`[CodeGen] ⚡ Semantic cache hit for key "${cacheKey}"`);
        }

        // 3. Pass output through AST security validator (with timing & node count audit)
        const validation = runSecurityValidation(rawCode);

        currentSession.inFlight = false;
        currentSession.lastTriggeredAt = Date.now();

        if (!validation.valid) {
          console.error(
            `[CodeGen] ❌ Security validator rejected generated code for session "${sid}":`,
            validation.message
          );
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "validation_failed",
                sessionId: sid,
                activeField: targetField,
                templateId,
                message: validation.message,
                errors: validation.errors,
                timestamp: Date.now()
              })
            );
          }
          return;
        }

        const code = validation.code;
        if (!isCacheHit && codeGenerator === generateComponent) {
          setCachedComponent(cacheKey, code);
        }

        // 4. Stream component_chunk tokens followed by final validated component event
        streamComponentChunks(ws, sid, targetField, code);

        const generationMs = Math.round(performance.now() - genStartMs);
        currentSession.generationCount = (currentSession.generationCount || 0) + 1;

        sessionStore.recordComponentGeneration(sid, {
          activeFieldId: targetField,
          score,
          codeLength: code.length
        });

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "component",
              code,
              cached: isCacheHit,
              generationMs,
              privacyMode,
              formId,
              astAudit: validation.astAudit,
              sessionId: sid,
              activeField: targetField,
              timestamp: Date.now()
            })
          );
          console.log(
            `[CodeGen] ✅ AST-validated (${validation.astAudit?.parseTimeMs}ms, ${validation.astAudit?.nodesInspected} nodes) & sent { type: "component" } (${code.length} chars, cached=${isCacheHit}) to "${sid}".`
          );
        }
        return;
      }

      // -----------------------------------------------------------------------
      // Protocol Handler 2: Form Revert Synchronization
      // -----------------------------------------------------------------------
      if (msgType === "revert") {
        console.log(`[WS] Revert message received for session "${sid}". Resetting in-flight state.`);
        currentSession.inFlight = false;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "reverted",
              sessionId: sid,
              timestamp: Date.now()
            })
          );
        }
        return;
      }

      // -----------------------------------------------------------------------
      // Protocol Handler 3: Ping / Keep-alive
      // -----------------------------------------------------------------------
      if (msgType === "ping") {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "pong",
              timestamp: Date.now()
            })
          );
        }
        return;
      }

      // -----------------------------------------------------------------------
      // Protocol Handler 4: Telemetry Streaming & Threshold Breach Evaluation
      // -----------------------------------------------------------------------
      const telemetryValidation = validateTelemetryMessage(rawData);

      if (!telemetryValidation.valid) {
        console.warn(`[WS] Rejected invalid telemetry message (Zod):`, telemetryValidation.errors);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              sessionId: sid,
              message: "Invalid telemetry message format",
              errors: telemetryValidation.errors,
              timestamp: Date.now()
            })
          );
        }
        return;
      }

      const telemetry = telemetryValidation.data;
      const {
        sessionId: tSessionId,
        timestamp,
        metrics,
        instantScore,
        rollingAverageScore,
        activeFieldId,
        formStateSnapshot,
        formFields
      } = telemetry;

      // Aggregate packet into the in-memory LRU session store
      sessionStore.recordTelemetry(telemetry, threshold);

      const snapshotFieldCount = formStateSnapshot?.values
        ? Object.keys(formStateSnapshot.values).filter((k) => formStateSnapshot.values[k] !== "").length
        : 0;

      console.log(
        `[Telemetry] ${new Date(timestamp).toISOString()} | session="${tSessionId}" | field="${activeFieldId || "none"}" | instant=${instantScore} | rolling5s=${rollingAverageScore}/${threshold} | vel=${metrics.mouseVelocity} | hes=${metrics.hesitationMs}ms | rage=${metrics.rageClicks}${formStateSnapshot ? ` | snapshotFields=${snapshotFieldCount}` : ""}`
      );

      // Evaluate threshold using the smoothed 5-second rolling average score
      if (rollingAverageScore < threshold) {
        return;
      }

      // Guard against flooding generation requests for the same session/field during cooldown
      const now = Date.now();
      if (currentSession.inFlight) {
        console.log(`[CodeGen] Generation already in flight for session "${tSessionId}". Skipping.`);
        return;
      }

      const withinCooldown =
        now - currentSession.lastTriggeredAt < cooldownMs && currentSession.activeField === activeFieldId;

      if (withinCooldown) {
        console.log(
          `[CodeGen] Cooldown active for session "${tSessionId}" on field "${activeFieldId}". Skipping duplicate trigger.`
        );
        return;
      }

      currentSession.inFlight = true;
      currentSession.activeField = activeFieldId;

      console.log(
        `[CodeGen] 🚨 Threshold breached (rolling5s=${rollingAverageScore} >= ${threshold}, instant=${instantScore}) at "${activeFieldId}". Calling generateComponent()...`
      );

      // Emit generation_started event
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "generation_started",
            sessionId: tSessionId,
            activeField: activeFieldId || "annualIncome",
            timestamp: Date.now()
          })
        );
      }

      try {
        const genStartMs = performance.now();
        const preservedUserInput = formStateSnapshot?.values || telemetry.userInput || {};
        const formId = telemetry.formId || formStateSnapshot?.domContext?.activeSectionId || "infotact-finance-v1";
        const privacyMode = telemetry.privacyMode || "cloud";
        const cacheKey = buildSemanticCacheKey({
          formId,
          activeField: activeFieldId || "annualIncome",
          validationErrors: formStateSnapshot?.domContext?.validationErrors,
          privacyMode
        });

        let rawCode = codeGenerator === generateComponent ? getCachedComponent(cacheKey, preservedUserInput) : null;
        const isCacheHit = Boolean(rawCode);

        if (!isCacheHit) {
          rawCode = await codeGenerator({
            activeField: activeFieldId || "annualIncome",
            formFields,
            userInput: preservedUserInput,
            domContext: formStateSnapshot?.domContext,
            formId,
            privacyMode,
            score: rollingAverageScore
          });
        }

        // Pass output through security validator
        const valRes = runSecurityValidation(rawCode);

        currentSession.lastTriggeredAt = Date.now();
        currentSession.inFlight = false;

        if (!valRes.valid) {
          console.error(
            `[CodeGen] ❌ Security validation rejected generated code for session "${tSessionId}":`,
            valRes.message
          );

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "error",
                sessionId: tSessionId,
                message: "Generated component failed AST security validation",
                details: valRes.message,
                timestamp: Date.now()
              })
            );

            ws.send(
              JSON.stringify({
                type: "validation_failed",
                sessionId: tSessionId,
                activeField: activeFieldId || "annualIncome",
                message: valRes.message,
                errors: valRes.errors,
                timestamp: Date.now()
              })
            );
          }
          return;
        }

        const code = valRes.code;
        if (!isCacheHit && codeGenerator === generateComponent) {
          setCachedComponent(cacheKey, code);
        }

        streamComponentChunks(ws, tSessionId, activeFieldId || "annualIncome", code);

        const generationMs = Math.round(performance.now() - genStartMs);
        currentSession.generationCount = (currentSession.generationCount || 0) + 1;

        sessionStore.recordComponentGeneration(tSessionId, {
          activeFieldId: activeFieldId || "annualIncome",
          score: rollingAverageScore,
          codeLength: code.length
        });

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "component",
              code,
              cached: isCacheHit,
              generationMs,
              privacyMode,
              formId,
              astAudit: valRes.astAudit,
              sessionId: tSessionId,
              activeField: activeFieldId || "annualIncome",
              timestamp: Date.now()
            })
          );
          console.log(
            `[CodeGen] ✅ AST-validated & sent { type: "component", code } (${code.length} chars, cached=${isCacheHit}, ${generationMs}ms) to session "${tSessionId}".`
          );
        }
      } catch (err) {
        currentSession.inFlight = false;
        console.error(`[CodeGen] ❌ Blocked or failed component for session "${tSessionId}":`, err.message);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              sessionId: tSessionId,
              message:
                err.name === "ASTSecurityError"
                  ? "Generated component failed AST security validation"
                  : "Component generation failed",
              details: err.message,
              timestamp: Date.now()
            })
          );
        }
      }
    });

    ws.on("close", (code, reason) => {
      // Session Management: Remove disconnected client from JavaScript Map
      if (ws.sessionId) {
        sessions.delete(ws.sessionId);
      }
      for (const [id, s] of sessions.entries()) {
        if (s.ws === ws) {
          sessions.delete(id);
        }
      }
      console.log(
        `[WS] Client disconnected (code=${code}, reason="${reason?.toString() || ""}", remaining active: ${sessions.size})`
      );
    });

    ws.on("error", (err) => {
      console.error("[WS] Client socket error:", err.message);
    });
  });

  // Heartbeat interval to terminate stale connections
  const heartbeatTimer = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatTimer);
  });

  function start() {
    return new Promise((resolve) => {
      httpServer.listen(port, () => {
        const address = httpServer.address();
        const boundPort = typeof address === "object" && address ? address.port : port;
        console.log("=================================================================");
        console.log(`🚀 AuraGen WebSocket Server listening on ws://localhost:${boundPort}`);
        console.log(`🩺 Health check: http://localhost:${boundPort}/health`);
        console.log(`📊 Session metrics API: http://localhost:${boundPort}/api/sessions/:sessionId/metrics`);
        console.log(`🧠 Cognitive Load Threshold: ${threshold}`);
        console.log(`⏱️  Generation Cooldown: ${cooldownMs}ms`);
        console.log("=================================================================");
        resolve({ port: boundPort, httpServer, wss, sessions, sessionStore });
      });
    });
  }

  function stop() {
    clearInterval(heartbeatTimer);
    return new Promise((resolve) => {
      for (const client of wss.clients) {
        client.terminate();
      }
      wss.close(() => {
        httpServer.close(() => resolve());
      });
    });
  }

  return { httpServer, wss, sessions, sessionStore, start, stop };
}

// Start server directly when run via `node src/server.js`
const isDirectExecution =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());

if (isDirectExecution) {
  const server = createAuraGenServer();
  server.start();

  const shutdown = async () => {
    console.log("\n[WS] Shutting down AuraGen WebSocket server...");
    await server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
