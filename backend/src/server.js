import http from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  WS_PORT, COGNITIVE_LOAD_THRESHOLD, GENERATION_COOLDOWN_MS, MAX_MESSAGE_BYTES
} from "./config/constants.js";
import { validateTelemetryMessage } from "./validators/telemetryValidator.js";
import { generateComponent } from "./services/codeGenService.js";
<<<<<<< HEAD
import { validateComponentAst } from "./services/astValidator.js";
import { createSessionStore } from "./store/sessionStore.js";

/**
 * Creates the HTTP + WebSocket server instance for AuraGen.
 * Supports dependency injection of `codeGenerator` and `sessionStore` for testing.
 */
=======
import { publicGenerationError } from "./services/generationErrors.js";
import { createRateLimit } from "./services/rateLimit.js";

const localOrigins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"];
const minute = 60_000;

function rejectUpgrade(socket, status) {
  socket.end(`HTTP/1.1 ${status} ${http.STATUS_CODES[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function send(ws, message) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const serialized = JSON.stringify(message);
  if (ws.bufferedAmount + Buffer.byteLength(serialized) > 256 * 1024) {
    ws.terminate();
    return;
  }
  ws.send(serialized);
}

>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
export function createAuraGenServer({
  port = WS_PORT,
  host = process.env.WS_HOST || (process.env.NODE_ENV === "production" ? "127.0.0.1" : undefined),
  threshold = COGNITIVE_LOAD_THRESHOLD,
  cooldownMs = GENERATION_COOLDOWN_MS,
  codeGenerator = generateComponent,
<<<<<<< HEAD
  sessionStore = createSessionStore()
} = {}) {
  // Per-session generation cooldown/in-flight lock
  const generationLocks = new Map();

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
=======
  allowedOrigins = process.env.WS_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()) ??
    (process.env.NODE_ENV === "production" ? [] : localOrigins),
  allowMissingOrigin = process.env.NODE_ENV !== "production",
  authorizeUpgrade = () => true,
  limits = {}
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65_535 ||
      !Number.isFinite(threshold) || threshold < 0 || threshold > 100 ||
      !Number.isInteger(cooldownMs) || cooldownMs < 0) {
    throw new Error("Invalid AuraGen WebSocket configuration.");
  }
  const {
    maxClients = 100, maxClientsPerIp = 16, upgradesPerIp = 60,
    messagesPerClient = 300, messagesPerIp = 2400, generationsPerIp = 30
  } = limits;
  const origins = new Set(allowedOrigins);
  const ipConnections = new Map();
  const upgrades = createRateLimit(upgradesPerIp, minute, 1024);
  const messages = createRateLimit(messagesPerIp, minute, 1024);
  const generations = createRateLimit(generationsPerIp, minute, 1024);

  const httpServer = http.createServer({
    maxHeaderSize: 8192, headersTimeout: 5000, requestTimeout: 10_000, connectionsCheckingInterval: 1000
  }, (req, res) => {
    const healthy = req.method === "GET" && req.url === "/health";
    res.writeHead(healthy ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify(healthy ? {
      status: "ok",
      service: "auragen-websocket-server",
      threshold,
      cooldownMs,
      connectedClients: wss.clients.size,
      timestamp: Date.now()
    } : { error: "Not found. Connect via WebSocket or GET /health." }));
  });
  httpServer.maxConnections = maxClients + 32;
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES, perMessageDeflate: false });

  httpServer.on("upgrade", (req, socket, head) => {
    const ip = socket.remoteAddress || "unknown";
    const origin = req.headers.origin;
    if (!upgrades.take(ip)) return rejectUpgrade(socket, 429);
    if (origin === undefined ? !allowMissingOrigin : !origins.has(origin)) return rejectUpgrade(socket, 403);
    if (wss.clients.size >= maxClients || (ipConnections.get(ip) ?? 0) >= maxClientsPerIp) {
      return rejectUpgrade(socket, 503);
    }
    try {
      if (authorizeUpgrade(req) !== true) return rejectUpgrade(socket, 401);
    } catch {
      return rejectUpgrade(socket, 401);
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, ip));
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
  });

  wss.on("connection", (ws, ip) => {
    ipConnections.set(ip, (ipConnections.get(ip) ?? 0) + 1);
    const localMessages = createRateLimit(messagesPerClient, minute, 1);
    const disconnected = new AbortController();
    let inFlight = false;
    let lastField;
    let nextGenerationAt = 0;
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    // ws owns error shutdown, including the close frame for oversized messages.
    ws.on("error", () => {});
    ws.on("close", () => {
      disconnected.abort();
      const remaining = ipConnections.get(ip) - 1;
      if (remaining > 0) ipConnections.set(ip, remaining);
      else ipConnections.delete(ip);
    });
    send(ws, { type: "connected", threshold, timestamp: Date.now() });

<<<<<<< HEAD
    // Notify client of successful connection and active cognitive load threshold
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

      // Aggregate packet into the in-memory LRU session store
      sessionStore.recordTelemetry(telemetry, threshold);

      const snapshotFieldCount = formStateSnapshot?.values
        ? Object.keys(formStateSnapshot.values).filter((k) => formStateSnapshot.values[k] !== "").length
        : 0;

      console.log(
        `[Telemetry] ${new Date(timestamp).toISOString()} | session="${sessionId}" | field="${activeFieldId || "none"}" | instant=${instantScore} | rolling5s=${rollingAverageScore}/${threshold} | vel=${metrics.mouseVelocity} | hes=${metrics.hesitationMs}ms | rage=${metrics.rageClicks}${formStateSnapshot ? ` | snapshotFields=${snapshotFieldCount}` : ""}`
      );

      // Evaluate threshold using the smoothed 5-second rolling average score
      if (rollingAverageScore < threshold) {
        return;
      }

      // Guard against flooding generation requests for the same session/field during cooldown
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

      console.log(
        `[CodeGen] 🚨 Threshold breached (rolling5s=${rollingAverageScore} >= ${threshold}, instant=${instantScore}) at "${activeFieldId}". Calling generateComponent()...`
      );

      try {
        const preservedUserInput = formStateSnapshot?.values || telemetry.userInput || {};
        const rawCode = await codeGenerator({
          activeField: activeFieldId || "annualIncome",
          formFields,
          userInput: preservedUserInput,
          domContext: formStateSnapshot?.domContext,
          score: rollingAverageScore
        });

        // AST security validation before sending code to the client
        const code = validateComponentAst(rawCode);

        lockState.lastTriggeredAt = Date.now();
        lockState.inFlight = false;
        generationLocks.set(sessionId, lockState);

        sessionStore.recordComponentGeneration(sessionId, {
          activeFieldId: activeFieldId || "annualIncome",
          score: rollingAverageScore,
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
=======
    ws.on("message", async (rawData, binary) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const now = Date.now();
      if (!localMessages.take(ws, now) || !messages.take(ip, now)) {
        send(ws, { type: "error", code: "RATE_LIMIT", message: "Too many telemetry messages." });
        ws.close(1008, "Rate limit");
        return;
      }
      if (binary) {
        send(ws, { type: "error", code: "INVALID_TELEMETRY", message: "Invalid telemetry message format", errors: ["Send JSON as a text message."] });
        return;
      }

      let started = false;
      try {
        const validation = validateTelemetryMessage(rawData);
        if (!validation.valid) {
          send(ws, { type: "error", code: "INVALID_TELEMETRY", message: "Invalid telemetry message format", errors: validation.errors });
          return;
        }
        const { cognitiveLoadScore, activeField, formFields } = validation.data;
        if (cognitiveLoadScore < threshold || inFlight || (lastField === activeField && now < nextGenerationAt)) return;
        lastField = activeField;
        nextGenerationAt = now + cooldownMs;
        if (!generations.take(ip, now)) {
          send(ws, { type: "error", code: "RATE_LIMIT", message: "Too many generation requests. Try again shortly." });
          return;
        }
        inFlight = started = true;
        const code = await codeGenerator({
          activeField: activeField || (formFields === undefined ? "annualIncome" : ""),
          formFields,
          score: cognitiveLoadScore,
          signal: disconnected.signal
        });
        send(ws, { type: "component", code });
      } catch (error) {
        const { code, message, issues } = publicGenerationError(error);
        send(ws, {
          type: "error", code, message: "Component generation failed", details: message,
          ...(issues.length > 0 && { issues })
        });
      } finally {
        if (started) {
          inFlight = false;
          nextGenerationAt = Date.now() + cooldownMs;
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
        }
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) ws.terminate();
      else {
        ws.isAlive = false;
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }
    }
    for (const limiter of [upgrades, messages, generations]) limiter.prune();
  }, 30_000).unref();
  wss.once("close", () => clearInterval(heartbeat));

  function start() {
<<<<<<< HEAD
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
        resolve({ port: boundPort, httpServer, wss, sessionStore });
=======
    return new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(port, host, () => {
        httpServer.off("error", reject);
        resolve({ port: httpServer.address().port, httpServer, wss });
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
      });
    });
  }

  async function stop() {
    for (const ws of wss.clients) ws.terminate();
    await Promise.all([
      new Promise((resolve) => wss.close(resolve)),
      new Promise((resolve) => httpServer.close(resolve))
    ]);
  }

  return { httpServer, wss, sessionStore, start, stop };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const server = createAuraGenServer();
    const { port } = await server.start();
    console.log(`AuraGen backend listening on port ${port}`);
    for (const event of ["SIGINT", "SIGTERM"]) process.once(event, () => { void server.stop(); });
  } catch {
    console.error("AuraGen backend could not start. Check the WebSocket settings and port availability.");
    process.exitCode = 1;
  }
}
