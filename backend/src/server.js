import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  WS_PORT,
  COGNITIVE_LOAD_THRESHOLD,
  GENERATION_COOLDOWN_MS
} from "./config/constants.js";
import { validateTelemetryMessage } from "./validators/telemetryValidator.js";
import { generateComponent } from "./services/codeGenService.js";

/**
 * Creates the HTTP + WebSocket server instance for AuraGen.
 * Supports dependency injection of `codeGenerator` for automated testing.
 */
export function createAuraGenServer({
  port = WS_PORT,
  threshold = COGNITIVE_LOAD_THRESHOLD,
  cooldownMs = GENERATION_COOLDOWN_MS,
  codeGenerator = generateComponent
} = {}) {
  // Per-session generation tracking to avoid duplicate concurrent LLM invocations
  const sessionStates = new Map();

  const httpServer = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "auragen-websocket-server",
          threshold,
          cooldownMs,
          connectedClients: wss.clients.size,
          timestamp: Date.now()
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Connect via WebSocket or GET /health." }));
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
        console.warn(`[WS] Rejected invalid telemetry message:`, validation.errors);
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
      const { sessionId, timestamp, metrics, cognitiveLoadScore, activeField, userInput, formFields } = telemetry;

      // Structured telemetry logging
      console.log(
        `[Telemetry] ${new Date(timestamp).toISOString()} | session="${sessionId}" | field="${activeField || "none"}" | score=${cognitiveLoadScore}/${threshold} | vel=${metrics.mouseVelocity} | hes=${metrics.hesitationMs}ms | rage=${metrics.rageClicks} | errRate=${metrics.clickErrorRate}`
      );

      // Check cognitive load threshold
      if (cognitiveLoadScore < threshold) {
        return;
      }

      // Guard against flooding generation requests for the same session/field during cooldown
      const now = Date.now();
      const state = sessionStates.get(sessionId) || {
        inFlight: false,
        lastTriggeredAt: 0,
        lastField: null
      };

      if (state.inFlight) {
        console.log(`[CodeGen] Generation already in flight for session "${sessionId}". Skipping.`);
        return;
      }

      const withinCooldown =
        now - state.lastTriggeredAt < cooldownMs && state.lastField === activeField;

      if (withinCooldown) {
        console.log(
          `[CodeGen] Cooldown active for session "${sessionId}" on field "${activeField}". Skipping duplicate trigger.`
        );
        return;
      }

      state.inFlight = true;
      state.lastField = activeField;
      sessionStates.set(sessionId, state);

      console.log(
        `[CodeGen] 🚨 Cognitive load threshold reached (${cognitiveLoadScore} >= ${threshold}) at "${activeField}". Calling generateComponent()...`
      );

      try {
        const code = await codeGenerator({
          activeField: activeField || "annualIncome",
          formFields,
          userInput,
          score: cognitiveLoadScore
        });

        state.lastTriggeredAt = Date.now();
        state.inFlight = false;
        sessionStates.set(sessionId, state);

        if (ws.readyState === WebSocket.OPEN) {
          const reply = {
            type: "component",
            code
          };
          ws.send(JSON.stringify(reply));
          console.log(
            `[CodeGen] ✅ Sent { type: "component", code } (${code.length} chars) to session "${sessionId}".`
          );
        }
      } catch (err) {
        state.inFlight = false;
        sessionStates.set(sessionId, state);
        console.error(`[CodeGen] ❌ Failed to generate component for session "${sessionId}":`, err);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Component generation failed",
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
        console.log(`🩺 Health check endpoint: http://localhost:${boundPort}/health`);
        console.log(`🧠 Cognitive Load Threshold: ${threshold}`);
        console.log(`⏱️  Generation Cooldown: ${cooldownMs}ms`);
        console.log("=================================================================");
        resolve({ port: boundPort, httpServer, wss });
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

  return { httpServer, wss, start, stop };
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

