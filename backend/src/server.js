import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  WS_PORT,
  COGNITIVE_LOAD_THRESHOLD,
  GENERATION_COOLDOWN_MS
} from "./config/constants.js";
import { validateTelemetryMessage } from "./validators/telemetryValidator.js";
import { generateComponent } from "./services/codeGenService.js";
import { validateComponentAst } from "./services/astValidator.js";
import { createSessionStore } from "./store/sessionStore.js";

/**
 * Creates the HTTP + WebSocket server instance for AuraGen.
 * Features:
 *  - Responsive Cognitive Friction Threshold (default: 55)
 *  - Memory Leak Protection: 5-minute Garbage Collection cron purging stale sessions
 *  - Predictive Pre-Warming: Pre-warms the code generation pipeline when score hits 42
 *  - Comprehensive formStateSnapshot + validation error ingestion for targeted wizard generation
 *  - AST Security Validation gate
 */
export function createAuraGenServer({
  port = WS_PORT,
  threshold = COGNITIVE_LOAD_THRESHOLD,
  cooldownMs = GENERATION_COOLDOWN_MS,
  codeGenerator = generateComponent,
  sessionStore = createSessionStore()
} = {}) {
  const generationLocks = new Map();
  const sessionLastSeen = new Map();
  const preWarmCache = new Map(); // Key: `${sessionId}:${field}`, Value: { promise, timestamp }

  function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(payload));
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
        activeSessions: sessionStore.size,
        timestamp: Date.now()
      });
      return;
    }

    // List all tracked sessions
    if (req.method === "GET" && pathname === "/api/sessions") {
      sendJson(res, 200, {
        sessions: sessionStore.listSessions(),
        total: sessionStore.size
      });
      return;
    }

    // Historical friction metrics for a specific session
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
    const clientIp = req.socket.remoteAddress || "unknown";
    ws.isAlive = true;

    console.log(`[WS] Client connected from ${clientIp} (Total clients: ${wss.clients.size})`);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "connected",
          threshold,
          timestamp: Date.now()
        })
      );
    }

    ws.on("message", async (rawData) => {
      const validation = validateTelemetryMessage(rawData);

      if (!validation.valid) {
        console.warn(`[WS] Rejected invalid telemetry message (Zod):`, validation.errors);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid telemetry message format",
              errors: validation.errors
            })
          );
        }
        return;
      }

      const telemetry = validation.data;
      const {
        sessionId,
        timestamp,
        metrics,
        instantScore,
        rollingAverageScore,
        activeFieldId,
        formStateSnapshot,
        formFields
      } = telemetry;

      sessionLastSeen.set(sessionId, Date.now());
      sessionStore.recordTelemetry(telemetry, threshold);

      const snapshotFieldCount = formStateSnapshot?.values
        ? Object.keys(formStateSnapshot.values).filter((k) => formStateSnapshot.values[k] !== "").length
        : 0;

      const validationErrorCount = formStateSnapshot?.domContext?.validationErrors
        ? Object.keys(formStateSnapshot.domContext.validationErrors).length
        : 0;

      console.log(
        `[Telemetry] ${new Date(timestamp).toISOString()} | session="${sessionId}" | field="${activeFieldId || "none"}" | instant=${instantScore} | rolling5s=${rollingAverageScore}/${threshold} | vel=${metrics.mouseVelocity} | hes=${metrics.hesitationMs}ms | rage=${metrics.rageClicks}${validationErrorCount > 0 ? ` | errors=${validationErrorCount}` : ""}${formStateSnapshot ? ` | snapshotFields=${snapshotFieldCount}` : ""}`
      );

      // =========================================================================
      // Predictive Pre-Warming (Score >= 42 but < threshold)
      // =========================================================================
      const preWarmThreshold = Math.max(35, threshold - 13);
      if (rollingAverageScore >= preWarmThreshold && rollingAverageScore < threshold) {
        const cacheKey = `${sessionId}:${activeFieldId || "annualIncome"}`;
        const existing = preWarmCache.get(cacheKey);
        const now = Date.now();

        if (!existing || now - existing.timestamp > 30000) {
          console.log(`[PreWarm] ⚡ Pre-warming LLM pipeline for session "${sessionId}" on field "${activeFieldId}" (rolling5s=${rollingAverageScore})`);
          const preservedUserInput = formStateSnapshot?.values || telemetry.userInput || {};
          const preWarmPromise = codeGenerator({
            activeField: activeFieldId || "annualIncome",
            formFields,
            userInput: preservedUserInput,
            domContext: formStateSnapshot?.domContext,
            score: rollingAverageScore
          }).catch((err) => {
            console.warn(`[PreWarm] Background pre-warm failed:`, err.message);
            return null;
          });

          preWarmCache.set(cacheKey, {
            promise: preWarmPromise,
            timestamp: now
          });
        }
      }

      // Check threshold using smoothed 5-second rolling average score or instant breach
      if (rollingAverageScore < threshold && instantScore < threshold) {
        return;
      }

      const now = Date.now();
      const lockState = generationLocks.get(sessionId) || {
        inFlight: false,
        lastTriggeredAt: 0,
        lastField: null
      };

      if (lockState.inFlight) {
        console.log(`[CodeGen] Generation already in flight for session "${sessionId}". Skipping.`);
        return;
      }

      const withinCooldown =
        now - lockState.lastTriggeredAt < cooldownMs && lockState.lastField === activeFieldId;

      if (withinCooldown) {
        console.log(
          `[CodeGen] Cooldown active for session "${sessionId}" on field "${activeFieldId}". Skipping duplicate trigger.`
        );
        return;
      }

      lockState.inFlight = true;
      lockState.lastField = activeFieldId;
      generationLocks.set(sessionId, lockState);

      const triggerScore = Math.max(rollingAverageScore, instantScore);
      console.log(
        `[CodeGen] 🚨 Threshold breached (triggerScore=${triggerScore} >= ${threshold}, rolling=${rollingAverageScore}, instant=${instantScore}) at "${activeFieldId}". Calling generateComponent()...`
      );

      try {
        const preservedUserInput = formStateSnapshot?.values || telemetry.userInput || {};
        const cacheKey = `${sessionId}:${activeFieldId || "annualIncome"}`;
        const cachedPreWarm = preWarmCache.get(cacheKey);

        let rawCode = null;
        if (cachedPreWarm && now - cachedPreWarm.timestamp < 35000) {
          console.log(`[CodeGen] ⚡ Zero-latency hit! Using pre-warmed component for session "${sessionId}".`);
          rawCode = await cachedPreWarm.promise;
          preWarmCache.delete(cacheKey);
        }

        if (!rawCode) {
          rawCode = await codeGenerator({
            activeField: activeFieldId || "annualIncome",
            formFields,
            userInput: preservedUserInput,
            domContext: formStateSnapshot?.domContext,
            score: triggerScore
          });
        }

        // AST security validation before sending code to the client
        const code = validateComponentAst(rawCode);

        lockState.lastTriggeredAt = Date.now();
        lockState.inFlight = false;
        generationLocks.set(sessionId, lockState);

        sessionStore.recordComponentGeneration(sessionId, {
          activeFieldId: activeFieldId || "annualIncome",
          score: triggerScore,
          codeLength: code.length
        });

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "component",
              code
            })
          );
          console.log(
            `[CodeGen] ✅ AST-validated & sent { type: "component", code } (${code.length} chars, preservedFields=${Object.keys(preservedUserInput).length}) to session "${sessionId}".`
          );
        }
      } catch (err) {
        lockState.inFlight = false;
        generationLocks.set(sessionId, lockState);
        console.error(`[CodeGen] ❌ Blocked or failed component for session "${sessionId}":`, err.message);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message:
                err.name === "ASTSecurityError"
                  ? "Generated component failed AST security validation"
                  : "Component generation failed",
              details: err.message
            })
          );
        }
      }
    });

    ws.on("close", (code, reason) => {
      console.log(
        `[WS] Client disconnected (code=${code}, reason="${reason?.toString() || ""}", remaining=${wss.clients.size})`
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

  // Enterprise Garbage Collection Cron: Purges stale sessions & memory leak buffers every 5 minutes
  const gcTimer = setInterval(() => {
    const now = Date.now();
    const STALE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    let purgedCount = 0;
    for (const [sId, lastSeen] of sessionLastSeen.entries()) {
      if (now - lastSeen > STALE_TIMEOUT_MS) {
        sessionLastSeen.delete(sId);
        generationLocks.delete(sId);
        purgedCount++;
      }
    }

    for (const [k, item] of preWarmCache.entries()) {
      if (now - item.timestamp > 60000) {
        preWarmCache.delete(k);
      }
    }

    if (purgedCount > 0) {
      console.log(`[GC] 🧹 Garbage Collection: Purged ${purgedCount} stale sessions (Active sessions: ${sessionLastSeen.size})`);
    }
  }, 5 * 60 * 1000);

  wss.on("close", () => {
    clearInterval(heartbeatTimer);
    clearInterval(gcTimer);
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
        console.log(`⚡ Predictive Pre-Warming: Enabled (Score >= ${Math.max(35, threshold - 13)})`);
        console.log(`🧹 Enterprise Stale GC Cron: Active (5min cycle)`);
        console.log("=================================================================");
        resolve({ port: boundPort, httpServer, wss, sessionStore });
      });
    });
  }

  function stop() {
    clearInterval(heartbeatTimer);
    clearInterval(gcTimer);
    preWarmCache.clear();
    generationLocks.clear();
    sessionLastSeen.clear();
    return new Promise((resolve) => {
      for (const client of wss.clients) {
        client.terminate();
      }
      wss.close(() => {
        httpServer.close(() => resolve());
      });
    });
  }

  return { httpServer, wss, sessionStore, start, stop };
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
