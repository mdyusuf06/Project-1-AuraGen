import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createAuraGenServer } from "../src/server.js";
import { validateComponentAst, validate, ASTSecurityError } from "../src/services/astValidator.js";

function runAstValidatorUnitTests() {
  console.log("\n🛡️  Running AST Validator Unit Tests...");

  const safeCode = `
    import React, { useState } from "react";
    export default function SafeWizard({ initialValues = {} }) {
      const [documentType, setDocumentType] = useState(initialValues.documentType || "W2");
      return <div className="p-4"><input value={documentType} onChange={(e) => setDocumentType(e.target.value)} /></div>;
    }
  `;
  const returned = validate(safeCode);
  assert.equal(returned, safeCode, "Safe JSX should pass and return the exact code string");

  const unsafePayloads = [
    { label: "window", code: `export default function Bad() { return <div>{window.location.href}</div>; }` },
    { label: "document", code: `export default function Bad() { const c = document.cookie; return <div>{c}</div>; }` },
    { label: "localStorage", code: `export default function Bad() { localStorage.setItem("x", "1"); return <div />; }` },
    { label: "fetch", code: `export default function Bad() { fetch("https://evil.test"); return <div />; }` },
    { label: "<script> tag", code: `export default function Bad() { return <div><script>alert(1)</script></div>; }` },
    { label: "computed global access", code: `export default function Bad() { return <div>{globalThis["fetch"]("/x")}</div>; }` },
    { label: "syntax error", code: `export default function Broken( { return <div>; }` }
  ];

  for (const { label, code } of unsafePayloads) {
    assert.throws(
      () => validate(code),
      (err) => err instanceof ASTSecurityError,
      `AST validator must throw ASTSecurityError for ${label}`
    );
  }

  console.log(`✅ AST Unit Tests Passed: Safe JSX (including "documentType") allowed; ${unsafePayloads.length} unsafe/malformed payloads blocked.`);
}

async function runBackendTests() {
  console.log("=================================================================");
  console.log("🧪 AuraGen Backend WebSocket & Session Store Integration Tests");
  console.log("=================================================================");

  runAstValidatorUnitTests();

  const server = createAuraGenServer({
    port: 0,
    threshold: 70,
    cooldownMs: 500
  });

  const { port, sessions } = await server.start();
  const wsUrl = `ws://localhost:${port}`;
  const httpBase = `http://localhost:${port}`;

  try {
    // 1. Verify /health endpoint
    const healthRes = await fetch(`${httpBase}/health`);
    assert.equal(healthRes.status, 200, "Health endpoint should return 200");
    const healthJson = await healthRes.json();
    assert.equal(healthJson.status, "ok");
    assert.equal(typeof healthJson.activeSessions, "number");
    console.log("✅ Test 1 Passed: HTTP /health endpoint returned 200 OK");

    // 2. Connect WebSocket client (register message listener BEFORE awaiting open)
    const ws = new WebSocket(wsUrl);
    const receivedMessages = [];

    ws.on("message", (raw) => {
      receivedMessages.push(JSON.parse(raw.toString("utf-8")));
    });

    await new Promise((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(receivedMessages[0]?.type, "connected");
    assert.ok(sessions.size >= 1, "Connected client must be tracked in sessions Map");
    console.log("✅ Test 2 Passed: WebSocket handshake received and tracked in sessions Map");

    // 3. Test strict Zod invalid telemetry rejection
    ws.send(
      JSON.stringify({
        type: "telemetry",
        sessionId: "",
        timestamp: -1,
        metrics: { mouseVelocity: -5, hesitationMs: 0, rageClicks: 0, clickErrorRate: 2 },
        cognitiveLoadScore: 999,
        activeField: "annualIncome"
      })
    );
    await new Promise((r) => setTimeout(r, 100));
    const errorReply = receivedMessages.find((m) => m.type === "error");
    assert.ok(errorReply && errorReply.errors.length >= 4, "Zod should catch multiple invalid schema fields");
    console.log("✅ Test 3 Passed: Zod validation rejected malformed telemetry payload");

    // 4. Test valid telemetry BELOW threshold (instantScore & rollingAverageScore)
    const sessionId = "test_sess_upgrade_01";
    const countBeforeLow = receivedMessages.length;
    ws.send(
      JSON.stringify({
        type: "telemetry",
        sessionId,
        timestamp: Date.now(),
        metrics: {
          mouseVelocity: 120,
          hesitationMs: 800,
          rageClicks: 0,
          clickErrorRate: 0.05
        },
        cognitiveLoadScore: 28,
        instantScore: 32,
        rollingAverageScore: 28,
        activeField: "fullName",
        activeFieldId: "fullName",
        cursor: { x: 200, y: 150 }
      })
    );
    await new Promise((r) => setTimeout(r, 150));
    const componentAfterLow = receivedMessages.slice(countBeforeLow).find((m) => m.type === "component");
    assert.equal(componentAfterLow, undefined, "Low rollingAverageScore should NOT trigger component generation");
    console.log("✅ Test 4 Passed: Low rollingAverageScore (28 < 70) stored without triggering generation");

    // 5. Test valid telemetry ABOVE threshold WITH formStateSnapshot
    ws.send(
      JSON.stringify({
        type: "telemetry",
        sessionId,
        timestamp: Date.now(),
        metrics: {
          mouseVelocity: 640,
          hesitationMs: 12400,
          rageClicks: 6,
          clickErrorRate: 0.45
        },
        cognitiveLoadScore: 84,
        instantScore: 91,
        rollingAverageScore: 84,
        activeField: "annualIncome",
        activeFieldId: "annualIncome",
        cursor: { x: 420, y: 310 },
        formStateSnapshot: {
          values: {
            fullName: "Jordan Mercer",
            email: "jordan@infotact.com",
            taxId: "123-45-6789"
          },
          domContext: {
            activeFieldId: "annualIncome",
            activeFieldLabel: "Adjusted Gross Annual Income (USD)",
            activeSectionId: "income",
            completedFieldsCount: 3,
            totalFieldsCount: 21
          }
        }
      })
    );

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

    assert.equal(componentMsg.type, "component");
    assert.ok(componentMsg.code.includes("export default function DynamicFormWizard"));
    assert.ok(componentMsg.code.includes("Jordan Mercer"), "Stub should preserve formStateSnapshot.values");
    assert.ok(componentMsg.code.includes("annualIncome"));
    console.log("✅ Test 5 Passed: High rollingAverageScore (84 >= 70) triggered generateComponent() with preserved formStateSnapshot");

    // 6. Test In-Memory Session Store API: GET /api/sessions/:sessionId/metrics
    const metricsRes = await fetch(`${httpBase}/api/sessions/${sessionId}/metrics`);
    assert.equal(metricsRes.status, 200, "Session metrics API should return 200");
    const metricsJson = await metricsRes.json();

    assert.equal(metricsJson.sessionId, sessionId);
    assert.equal(metricsJson.summary.packetCount, 2);
    assert.equal(metricsJson.summary.thresholdBreaches, 1);
    assert.equal(metricsJson.summary.generatedComponentsCount, 1);
    assert.equal(metricsJson.summary.peakInstantScore, 91);
    assert.equal(metricsJson.summary.peakRollingScore, 84);
    assert.equal(metricsJson.history.length, 2);
    assert.equal(metricsJson.lastFormStateSnapshot.values.fullName, "Jordan Mercer");
    assert.ok(metricsJson.fieldFrictionBreakdown.some((f) => f.fieldId === "annualIncome"));
    console.log("✅ Test 6 Passed: GET /api/sessions/:sessionId/metrics returned aggregated history & snapshot");

    // 7. Test 404 for unknown session
    const missingRes = await fetch(`${httpBase}/api/sessions/does_not_exist/metrics`);
    assert.equal(missingRes.status, 404);
    console.log("✅ Test 7 Passed: Unknown session returned 404");

    // 8. Test explicit generate_request protocol -> generation_started & component
    const genMessages = [];
    ws.on("message", (raw) => genMessages.push(JSON.parse(raw.toString("utf-8"))));

    ws.send(
      JSON.stringify({
        type: "generate_request",
        sessionId: "explicit_gen_session",
        activeField: "creditScore",
        userInput: { fullName: "Sam Vance", creditScore: "740" },
        score: 82
      })
    );

    const startedMsg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for generation_started")), 3000);
      const check = () => {
        const found = genMessages.find((m) => m.type === "generation_started" && m.sessionId === "explicit_gen_session");
        if (found) {
          clearTimeout(timeout);
          resolve(found);
        } else {
          setTimeout(check, 30);
        }
      };
      check();
    });

    assert.equal(startedMsg.type, "generation_started");
    assert.equal(startedMsg.activeField, "creditScore");

    const explicitComponentMsg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for explicit component")), 3000);
      const check = () => {
        const found = genMessages.find((m) => m.type === "component" && m.sessionId === "explicit_gen_session");
        if (found) {
          clearTimeout(timeout);
          resolve(found);
        } else {
          setTimeout(check, 30);
        }
      };
      check();
    });

    assert.equal(explicitComponentMsg.type, "component");
    assert.ok(explicitComponentMsg.code.includes("creditScore"));
    console.log("✅ Test 8 Passed: generate_request emitted generation_started followed by component");

    ws.close();
  } finally {
    await server.stop();
  }

  // 9. Test server AST security gate rejects malicious codeGenerator output (emits validation_failed & error)
  const maliciousServer = createAuraGenServer({
    port: 0,
    threshold: 70,
    cooldownMs: 100,
    codeGenerator: async () =>
      `export default function Evil() { fetch("https://attacker.test"); return <div><script>alert(1)</script></div>; }`
  });
  const { port: malPort } = await maliciousServer.start();
  try {
    const malWs = new WebSocket(`ws://localhost:${malPort}`);
    const malMessages = [];
    malWs.on("message", (raw) => malMessages.push(JSON.parse(raw.toString("utf-8"))));

    await new Promise((resolve, reject) => {
      malWs.on("open", resolve);
      malWs.on("error", reject);
    });

    malWs.send(
      JSON.stringify({
        type: "telemetry",
        sessionId: "test_malicious_block",
        timestamp: Date.now(),
        metrics: { mouseVelocity: 800, hesitationMs: 10000, rageClicks: 6, clickErrorRate: 0.5 },
        cognitiveLoadScore: 90,
        instantScore: 90,
        rollingAverageScore: 90,
        activeField: "annualIncome"
      })
    );

    const astErrorMsg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for AST rejection error")), 3000);
      const check = () => {
        const err = malMessages.find((m) => m.type === "error");
        if (err) {
          clearTimeout(timeout);
          resolve(err);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });

    assert.equal(astErrorMsg.message, "Generated component failed AST security validation");
    assert.equal(malMessages.find((m) => m.type === "component"), undefined, "Unsafe component must never be sent");
    console.log("✅ Test 9 Passed: WebSocket server blocked unsafe code via AST validator before sending");

    // 10. Test generate_request emitting validation_failed event on malicious code
    malWs.send(
      JSON.stringify({
        type: "generate_request",
        sessionId: "test_gen_val_failed",
        activeField: "taxId"
      })
    );

    const valFailedMsg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for validation_failed")), 3000);
      const check = () => {
        const found = malMessages.find((m) => m.type === "validation_failed" && m.sessionId === "test_gen_val_failed");
        if (found) {
          clearTimeout(timeout);
          resolve(found);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });

    assert.equal(valFailedMsg.type, "validation_failed");
    assert.equal(valFailedMsg.sessionId, "test_gen_val_failed");
    assert.ok(valFailedMsg.errors.length > 0);
    console.log("✅ Test 10 Passed: generate_request with unsafe code emitted strict validation_failed event");

    malWs.close();
  } finally {
    await maliciousServer.stop();
  }

  // 11. Test pipeline error handling emits strict event type: error
  const failingPipelineServer = createAuraGenServer({
    port: 0,
    codeGenerator: async () => {
      throw new Error("OpenAI API rate limit exceeded");
    }
  });
  const { port: failPort, sessions: failSessions } = await failingPipelineServer.start();
  try {
    const failWs = new WebSocket(`ws://localhost:${failPort}`);
    const failMessages = [];
    failWs.on("message", (raw) => failMessages.push(JSON.parse(raw.toString("utf-8"))));

    await new Promise((resolve, reject) => {
      failWs.on("open", resolve);
      failWs.on("error", reject);
    });

    failWs.send(
      JSON.stringify({
        type: "generate_request",
        sessionId: "sess_fail_test",
        activeField: "loanAmount"
      })
    );

    const started = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for generation_started")), 3000);
      const check = () => {
        const found = failMessages.find((m) => m.type === "generation_started");
        if (found) {
          clearTimeout(timeout);
          resolve(found);
        } else {
          setTimeout(check, 30);
        }
      };
      check();
    });
    assert.equal(started.type, "generation_started");

    const errorEvent = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for pipeline error")), 3000);
      const check = () => {
        const found = failMessages.find((m) => m.type === "error" && m.sessionId === "sess_fail_test");
        if (found) {
          clearTimeout(timeout);
          resolve(found);
        } else {
          setTimeout(check, 30);
        }
      };
      check();
    });

    assert.equal(errorEvent.type, "error");
    assert.ok(errorEvent.details.includes("rate limit") || errorEvent.message.includes("rate limit"));
    console.log("✅ Test 11 Passed: Pipeline exception properly emitted strict error event");

    // 12. Test Session Management JavaScript Map cleanup on disconnect
    assert.equal(failSessions.size, 1, "Active session should exist before disconnect");
    failWs.close();
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(failSessions.size, 0, "Session should be removed from JavaScript Map on disconnect");
    console.log("✅ Test 12 Passed: JavaScript Map tracks active clients and cleans up upon disconnection");
  } finally {
    await failingPipelineServer.stop();
  }

  console.log("\n🎉 All 12 Backend Messaging Protocol, Session Management & AST Security Tests Passed!");
}

runBackendTests().catch((err) => {
  console.error("❌ Backend test failed:", err);
  process.exit(1);
});
