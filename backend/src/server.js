import http from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  WS_PORT, COGNITIVE_LOAD_THRESHOLD, GENERATION_COOLDOWN_MS, MAX_MESSAGE_BYTES
} from "./config/constants.js";
import { validateTelemetryMessage } from "./validators/telemetryValidator.js";
import { approveComponentResponse, generateComponent } from "./services/codeGenService.js";
import { publicGenerationError } from "./services/generationErrors.js";
import { createRateLimit } from "./services/rateLimit.js";
import { createSessionStore } from "./store/sessionStore.js";

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

export function createAuraGenServer({
  port = WS_PORT,
  host = process.env.WS_HOST || (process.env.NODE_ENV === "production" ? "127.0.0.1" : undefined),
  threshold = COGNITIVE_LOAD_THRESHOLD,
  cooldownMs = GENERATION_COOLDOWN_MS,
  codeGenerator = generateComponent,
  sessionStore = createSessionStore(),
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
  const sessionGenerations = new WeakMap();

  const httpServer = http.createServer({
    maxHeaderSize: 8192, headersTimeout: 5000, requestTimeout: 10_000, connectionsCheckingInterval: 1000
  }, (req, res) => {
    const origin = req.headers.origin;
    if (origins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      return res.end();
    }
    const pathname = req.url?.split("?")[0];
    const sendJson = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && pathname === "/health") {
      return sendJson(200, {
        status: "ok", service: "auragen-websocket-server", threshold, cooldownMs,
        connectedClients: wss.clients.size, activeSessions: sessionStore.size, timestamp: Date.now()
      });
    }
    if (req.method === "GET" && pathname === "/api/sessions") {
      return sendJson(200, { sessions: sessionStore.listSessions(), total: sessionStore.size });
    }
    const metricsRoute = pathname?.match(/^\/api\/sessions\/([^/]+)\/metrics$/);
    if (req.method === "GET" && metricsRoute) {
      let sessionId;
      try {
        sessionId = decodeURIComponent(metricsRoute[1]);
      } catch {
        return sendJson(400, { error: "Invalid session identifier" });
      }
      const metrics = sessionStore.getSessionMetrics(sessionId);
      return metrics ? sendJson(200, metrics) : sendJson(404, { error: "Session not found", sessionId });
    }
    return sendJson(404, { error: "Not found. Connect via WebSocket or GET /health." });
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
      let sessionGeneration;
      try {
        const validation = validateTelemetryMessage(rawData);
        if (!validation.valid) {
          send(ws, { type: "error", code: "INVALID_TELEMETRY", message: "Invalid telemetry message format", errors: validation.errors });
          return;
        }
        const telemetry = validation.data;
        const { rollingAverageScore, activeField, formFields, sessionId } = telemetry;
        const session = sessionStore.recordTelemetry(telemetry, threshold);
        if (rollingAverageScore < threshold || inFlight || (lastField === activeField && now < nextGenerationAt)) return;
        const previous = sessionGenerations.get(session);
        if (previous?.inFlight || (previous?.field === activeField && now < previous.nextGenerationAt)) return;
        lastField = activeField;
        nextGenerationAt = now + cooldownMs;
        if (!generations.take(ip, now)) {
          send(ws, { type: "error", code: "RATE_LIMIT", message: "Too many generation requests. Try again shortly." });
          return;
        }
        inFlight = started = true;
        sessionGeneration = { inFlight: true, field: activeField, nextGenerationAt: 0 };
        sessionGenerations.set(session, sessionGeneration);
        const generationField = activeField || (formFields === undefined ? "annualIncome" : "");
        const code = await approveComponentResponse(codeGenerator, {
          activeField: generationField,
          formFields,
          score: rollingAverageScore,
          signal: disconnected.signal
        });
        if (ws.readyState !== WebSocket.OPEN) return;
        sessionStore.recordComponentGeneration(sessionId, {
          activeFieldId: generationField, score: rollingAverageScore, codeLength: code.length
        });
        send(ws, { type: "component", code });
      } catch (error) {
        const { code, message, issues } = publicGenerationError(error);
        send(ws, {
          type: "error", code,
          message: code === "INVALID_COMPONENT" ? "Generated component failed AST security validation" : "Component generation failed",
          details: message,
          ...(issues.length > 0 && { issues })
        });
      } finally {
        if (started) {
          inFlight = false;
          nextGenerationAt = Date.now() + cooldownMs;
          sessionGeneration.inFlight = false;
          sessionGeneration.nextGenerationAt = nextGenerationAt;
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
    return new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(port, host, () => {
        httpServer.off("error", reject);
        resolve({ port: httpServer.address().port, httpServer, wss, sessionStore });
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
