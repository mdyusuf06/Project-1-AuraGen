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
 * Supports dependency injection of `codeGenerator` and `sessionStore` for testing.
 */
export function createAuraGenServer({
  port = WS_PORT,
  threshold = COGNITIVE_LOAD_THRESHOLD,
  cooldownMs = GENERATION_COOLDOWN_MS,
  codeGenerator = generateComponent,
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
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws, req) => {
    const clientIp = req.socket.remoteAddress || "unknown";
    ws.isAlive = true;

    console.log(`[WS] Client connected from ${clientIp} (Total clients: ${wss.clients.size})`);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

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
        resolve({ port: boundPort, httpServer, wss, sessionStore });
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
