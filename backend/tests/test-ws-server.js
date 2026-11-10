import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createAuraGenServer } from "../src/server.js";

async function runBackendTests() {
  console.log("=================================================================");
  console.log("🧪 AuraGen Backend WebSocket Server Integration Tests");
  console.log("=================================================================");

  const server = createAuraGenServer({
    port: 0, // Let OS assign a free port
    threshold: 70,
    cooldownMs: 500
  });

  const { port } = await server.start();
  const wsUrl = `ws://localhost:${port}`;

  try {
    // 1. Verify /health endpoint
    const healthRes = await fetch(`http://localhost:${port}/health`);
    assert.equal(healthRes.status, 200, "Health endpoint should return 200");
    const healthJson = await healthRes.json();
    assert.equal(healthJson.status, "ok", "Health status should be ok");
    console.log("✅ Test 1 Passed: HTTP /health endpoint returned 200 OK");

    // Connect WebSocket client and register message listener BEFORE waiting for open
    const ws = new WebSocket(wsUrl);
    const receivedMessages = [];

    ws.on("message", (raw) => {
      receivedMessages.push(JSON.parse(raw.toString("utf-8")));
    });

    await new Promise((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });

    // Wait briefly for initial "connected" handshake message
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(receivedMessages[0]?.type, "connected", "Should receive connected handshake");
    console.log("✅ Test 2 Passed: WebSocket handshake received");

    // 2. Test invalid telemetry rejection
    ws.send(JSON.stringify({ type: "telemetry", cognitiveLoadScore: 999 }));
    await new Promise((r) => setTimeout(r, 100));
    const errorReply = receivedMessages.find((m) => m.type === "error");
    assert.ok(errorReply, "Should receive error message for invalid telemetry");
    console.log("✅ Test 3 Passed: Invalid telemetry rejected with structured error");

    // 3. Test valid telemetry BELOW threshold (should NOT trigger component)
    const countBeforeLow = receivedMessages.length;
    ws.send(
      JSON.stringify({
        type: "telemetry",
        sessionId: "test_sess_01",
        timestamp: Date.now(),
        metrics: {
          mouseVelocity: 120,
          hesitationMs: 800,
          rageClicks: 0,
          clickErrorRate: 0.05
        },
        cognitiveLoadScore: 32,
        activeField: "fullName"
      })
    );
    await new Promise((r) => setTimeout(r, 150));
    const componentAfterLow = receivedMessages.slice(countBeforeLow).find((m) => m.type === "component");
    assert.equal(componentAfterLow, undefined, "Low score should NOT trigger component generation");
    console.log("✅ Test 4 Passed: Low cognitiveLoadScore (32 < 70) logged without triggering generation");

    // 4. Test valid telemetry ABOVE threshold (MUST trigger { type: "component", code })
    ws.send(
      JSON.stringify({
        type: "telemetry",
        sessionId: "test_sess_01",
        timestamp: Date.now(),
        metrics: {
          mouseVelocity: 540,
          hesitationMs: 12400,
          rageClicks: 6,
          clickErrorRate: 0.45
        },
        cognitiveLoadScore: 86,
        activeField: "annualIncome"
      })
    );

    // Wait for component message
    const componentMsg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for component reply")), 3000);
      const check = () => {
        const found = receivedMessages.find((m) => m.type === "component");
        if (found) {
          clearTimeout(timeout);
          resolve(found);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });

    assert.equal(componentMsg.type, "component", "Reply type should be 'component'");
    assert.ok(typeof componentMsg.code === "string" && componentMsg.code.length > 100, "Code string should be non-empty");
    assert.ok(componentMsg.code.includes("export default function DynamicFormWizard"), "Code should include default export component");
    assert.ok(componentMsg.code.includes("annualIncome"), "Code should reference activeField 'annualIncome'");
    console.log("✅ Test 5 Passed: High cognitiveLoadScore (86 >= 70) triggered generateComponent() and returned { type: 'component', code }");

    ws.close();
  } finally {
    await server.stop();
  }

  console.log("\n🎉 All Backend WebSocket Tests Passed!");
}

runBackendTests().catch((err) => {
  console.error("❌ Backend test failed:", err);
  process.exit(1);
});
