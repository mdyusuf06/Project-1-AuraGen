import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { WebSocket } from "ws";
import { MAX_MESSAGE_BYTES } from "../src/config/constants.js";
import { createAuraGenServer } from "../src/server.js";
import { createWizardGenerator } from "../src/services/codeGenService.js";
import { field } from "./wizard-scenarios.js";

function nextMessage(socket) {
  return once(socket, "message", { signal: AbortSignal.timeout(3000) })
    .then(([raw]) => JSON.parse(raw.toString()));
}

async function open(port, options) {
  const socket = new WebSocket(`ws://localhost:${port}`, options);
  assert.equal((await nextMessage(socket)).type, "connected");
  return socket;
}

async function start(t, options) {
  const server = createAuraGenServer({ port: 0, cooldownMs: 0, ...options });
  t.after(() => server.stop());
  return (await server.start()).port;
}

function telemetry(overrides = {}) {
  return JSON.stringify({
    type: "telemetry", sessionId: "session", timestamp: Date.now(),
    metrics: { mouseVelocity: 4, hesitationMs: 20, rageClicks: 0, clickErrorRate: 0.1 },
    cognitiveLoadScore: 90, activeField: "contact", formFields: [field("contact")],
    ...overrides
  });
}

test("upgrade respects browser origin and an existing authorization callback", async (t) => {
  const origin = "https://portal.example.test";
  const port = await start(t, {
    allowMissingOrigin: false, allowedOrigins: [origin],
    authorizeUpgrade: (request) => request.headers.cookie === "session=test"
  });
  for (const [options, status] of [
    [{ origin: "https://other.example.test" }, 403],
    [{}, 403],
    [{ origin }, 401]
  ]) {
    const socket = new WebSocket(`ws://localhost:${port}`, options);
    await assert.rejects(once(socket, "open"), { message: `Unexpected server response: ${status}` });
  }
  await open(port, { origin, headers: { Cookie: "session=test" } });
});

test("validated telemetry flows through the mock provider to the legacy JSX response", async (t) => {
  let calls = 0;
  const privateValue = "a private applicant value";
  const codeGenerator = createWizardGenerator({ invoke: async (messages) => {
    calls++;
    assert.ok(!JSON.stringify(messages).includes(privateValue));
    return {
      content: JSON.stringify({ steps: [{ id: "contact", fields: [{ name: "contact", component: "Input" }] }] }),
      response_metadata: { finish_reason: "stop" }
    };
  } }).generateComponent;
  const port = await start(t, { codeGenerator });
  const socket = await open(port, { origin: "http://localhost:3000" });
  let reply = nextMessage(socket);
  socket.send(telemetry({ cognitiveLoadScore: 5, formFields: [field("contact"), field("contact")] }));
  assert.equal((await reply).code, "INVALID_TELEMETRY");
  assert.equal(calls, 0);
  reply = nextMessage(socket);
  socket.send(telemetry({ userInput: { contact: privateValue } }));
  const result = await reply;
  assert.deepEqual(Object.keys(result), ["type", "code"]);
  assert.equal(result.type, "component");
  assert.match(result.code, /export default function DynamicFormWizard/);
  assert.ok(!result.code.includes(privateValue));
  assert.equal(calls, 1);
});

test("provider and unexpected server errors are sanitized on WebSocket", async (t) => {
  const internal = "private text from an upstream stack";
  const port = await start(t, {
    codeGenerator: createWizardGenerator({ invoke: async () => {
      throw Object.assign(new Error(internal), { status: 401 });
    } }).generateComponent
  });
  const socket = await open(port);
  const reply = nextMessage(socket);
  socket.send(telemetry());
  const result = await reply;
  assert.equal(result.type, "error");
  assert.equal(result.code, "OPENAI_AUTH");
  assert.equal(result.message, "Component generation failed");
  assert.ok(!JSON.stringify(result).includes(internal));

  const otherPort = await start(t, { codeGenerator: () => { throw new Error(internal); } });
  const other = await open(otherPort);
  const failed = nextMessage(other);
  other.send(telemetry());
  assert.deepEqual(await failed, {
    type: "error", code: "GENERATION_FAILED", message: "Component generation failed",
    details: "Wizard generation could not be completed."
  });
});

test("oversized frames close before provider processing", async (t) => {
  const port = await start(t, { codeGenerator: () => assert.fail("oversized frame reached generation") });
  const socket = await open(port);
  const disconnected = once(socket, "close", { signal: AbortSignal.timeout(3000) });
  socket.send("x".repeat(MAX_MESSAGE_BYTES + 1));
  assert.equal((await disconnected)[0], 1009);
});

test("message floods receive one structured error and close", async (t) => {
  const port = await start(t, { limits: { messagesPerClient: 1 } });
  const socket = await open(port);
  const invalid = nextMessage(socket);
  socket.send(Buffer.from("{}"));
  assert.equal((await invalid).code, "INVALID_TELEMETRY");
  const rateLimited = nextMessage(socket);
  const disconnected = once(socket, "close", { signal: AbortSignal.timeout(3000) });
  socket.send(telemetry());
  assert.equal((await rateLimited).code, "RATE_LIMIT");
  assert.equal((await disconnected)[0], 1008);
});

test("generation rate limits apply across connections and session IDs", async (t) => {
  let calls = 0;
  const port = await start(t, {
    limits: { generationsPerIp: 1 },
    codeGenerator: async () => { calls++; return "fixture source"; }
  });
  const first = await open(port);
  const second = await open(port);
  const reply = nextMessage(first);
  first.send(telemetry({ sessionId: "one" }));
  assert.equal((await reply).type, "component");
  const rejected = nextMessage(second);
  second.send(telemetry({ sessionId: "two" }));
  assert.equal((await rejected).code, "RATE_LIMIT");
  assert.equal(calls, 1);
});

test("backend start reads dotenv settings and binds a real health endpoint", { timeout: 10_000 }, async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "auragen-test-"));
  const envFile = join(folder, "backend.env");
  await writeFile(envFile, "WS_PORT=0\nWS_HOST=127.0.0.1\nCOGNITIVE_LOAD_THRESHOLD=79\nUSE_TEAMMATE_CODEGEN=false\n");
  const env = { ...process.env, DOTENV_CONFIG_PATH: envFile };
  for (const key of ["WS_PORT", "WS_HOST", "COGNITIVE_LOAD_THRESHOLD", "USE_TEAMMATE_CODEGEN", "REQUEST_TIMEOUT_MS"]) delete env[key];
  const child = spawn(process.execPath, [fileURLToPath(new URL("../src/server.js", import.meta.url))], {
    env, stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exit = once(child, "exit");
      child.kill();
      await exit;
    }
    await rm(folder, { recursive: true, force: true });
  });
  const signal = AbortSignal.timeout(7000);
  let stdout = "";
  for await (const chunk of child.stdout.iterator({ destroyOnReturn: false })) {
    signal.throwIfAborted();
    stdout += chunk;
    const port = stdout.match(/listening on port (\d+)/)?.[1];
    if (port) {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { signal });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).threshold, 79);
      return;
    }
  }
  assert.fail("Backend did not report its listening port");
});
