import assert from "node:assert/strict";
import {
  GenerationFallbackManager,
  DEFAULT_GENERATION_TIMEOUT_MS,
  FALLBACK_TEMPLATES,
  getFallbackTemplate,
  registerFallbackTemplate
} from "../src/fallback/index.js";

console.log("=================================================================");
console.log("🧪 AuraGen Generation Timeout & Fallback Handling Unit Tests");
console.log("   (Commit 8: 4s Timeout, validation_failed, Templates & Recovery)");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Configuration & Default 4-Second Timeout Constant
// -----------------------------------------------------------------------------
{
  assert.equal(
    DEFAULT_GENERATION_TIMEOUT_MS,
    4000,
    "DEFAULT_GENERATION_TIMEOUT_MS must be exactly 4000 ms (4 seconds)"
  );
  console.log("✅ Test 1 Passed: 4-second generation timeout constant verified");
}

// -----------------------------------------------------------------------------
// Test 2: Pre-Built Template Integration (Pavilson's Templates)
// -----------------------------------------------------------------------------
{
  assert.ok(FALLBACK_TEMPLATES["income-stepper"], "Pre-built template 'income-stepper' must exist");
  assert.ok(FALLBACK_TEMPLATES["loan-details"], "Pre-built template 'loan-details' must exist");
  assert.ok(FALLBACK_TEMPLATES["quick-review"], "Pre-built template 'quick-review' must exist");

  // Template lookup by ID
  const incomeTemplate = getFallbackTemplate("income-stepper");
  assert.equal(incomeTemplate, FALLBACK_TEMPLATES["income-stepper"]);

  // Template lookup by active friction field
  const fieldTemplate = getFallbackTemplate(null, "annualIncome");
  assert.equal(fieldTemplate, FALLBACK_TEMPLATES["income-stepper"]);

  // Template lookup for unavailable / missing template returns null
  const missingTemplate = getFallbackTemplate("unavailable-id");
  assert.equal(missingTemplate, null, "Unavailable templateId must return null");

  // Dynamic template registration
  const mockCustomTemplate = () => {};
  registerFallbackTemplate("custom-tax-wizard", mockCustomTemplate);
  assert.equal(getFallbackTemplate("custom-tax-wizard"), mockCustomTemplate);

  console.log("✅ Test 2 Passed: Pre-built templates resolved correctly and fallback returns null when unavailable");
}

// -----------------------------------------------------------------------------
// Test 3: 4-Second Generation Timeout Activates Fallback
// -----------------------------------------------------------------------------
{
  let fallbackInvoked = false;
  let receivedState = null;

  const manager = new GenerationFallbackManager({
    timeoutMs: 40, // 40ms fast simulation for unit test
    onFallback: (state) => {
      fallbackInvoked = true;
      receivedState = state;
    }
  });

  manager.startGeneration({ activeField: "annualIncome" });
  assert.equal(manager.isGenerating, true, "isGenerating should be true after startGeneration");

  await new Promise((resolve) => setTimeout(resolve, 70));

  assert.equal(fallbackInvoked, true, "Fallback must be activated after timeout expires");
  assert.equal(receivedState.reason, "timeout", "Fallback reason must be 'timeout'");
  assert.ok(
    receivedState.message.includes("4s timeout"),
    `User-friendly message must mention 4s timeout. Got: ${receivedState.message}`
  );
  assert.ok(receivedState.hasTemplate, "Pre-built template must be resolved for annualIncome");
  assert.equal(manager.isGenerating, false, "isGenerating must be false after fallback");

  console.log("✅ Test 3 Passed: Generation timeout triggers fallback with user-friendly message");
}

// -----------------------------------------------------------------------------
// Test 4: Successful Component Arrival Cancels Timeout
// -----------------------------------------------------------------------------
{
  let fallbackInvoked = false;
  let successInvoked = false;

  const manager = new GenerationFallbackManager({
    timeoutMs: 60,
    onFallback: () => {
      fallbackInvoked = true;
    },
    onSuccess: () => {
      successInvoked = true;
    }
  });

  manager.startGeneration({ activeField: "annualIncome" });

  // Simulate component arrival at 20ms (well before 60ms timeout)
  setTimeout(() => {
    manager.handleMessage({
      type: "component",
      code: "export default function GeneratedWizard() { return null; }"
    });
  }, 20);

  // Wait past the timeout mark
  await new Promise((resolve) => setTimeout(resolve, 90));

  assert.equal(successInvoked, true, "onSuccess must be called when component arrives in time");
  assert.equal(fallbackInvoked, false, "Fallback must NOT trigger when component arrives before timeout");
  assert.equal(manager.isGenerating, false);

  console.log("✅ Test 4 Passed: Timeout cancelled successfully when generation succeeds");
}

// -----------------------------------------------------------------------------
// Test 5: validation_failed WebSocket Message Triggers Fallback Immediately
// -----------------------------------------------------------------------------
{
  let fallbackInvoked = false;
  let receivedState = null;

  const manager = new GenerationFallbackManager({
    timeoutMs: 500,
    onFallback: (state) => {
      fallbackInvoked = true;
      receivedState = state;
    }
  });

  manager.startGeneration({ activeField: "annualIncome" });

  // Dispatch validation_failed message immediately
  manager.handleMessage({
    type: "validation_failed",
    errors: [
      { line: 12, column: 4, rule: "no-eval", message: "Banned identifier eval used" }
    ]
  });

  assert.equal(fallbackInvoked, true, "validation_failed must trigger fallback immediately");
  assert.equal(receivedState.reason, "validation_failed");
  assert.ok(receivedState.message.includes("validation constraints"));
  assert.equal(manager.isGenerating, false);

  console.log("✅ Test 5 Passed: validation_failed WebSocket message caught and fallback activated");
}

// -----------------------------------------------------------------------------
// Test 6: Generation Error & Connection Failures Trigger Fallback
// -----------------------------------------------------------------------------
{
  let fallbackInvoked = false;
  let errorState = null;

  const manager = new GenerationFallbackManager({
    timeoutMs: 500,
    onFallback: (state) => {
      fallbackInvoked = true;
      errorState = state;
    }
  });

  manager.startGeneration({ activeField: "annualIncome" });

  // Simulate server generation error
  manager.handleMessage({
    type: "error",
    message: "AST syntax validation failure"
  });

  assert.equal(fallbackInvoked, true, "Server error must trigger fallback");
  assert.equal(errorState.reason, "generation_error");

  // Test connection failure
  let connFallbackInvoked = false;
  let connState = null;
  const connManager = new GenerationFallbackManager({
    timeoutMs: 500,
    onFallback: (state) => {
      connFallbackInvoked = true;
      connState = state;
    }
  });

  connManager.startGeneration({ activeField: "annualIncome" });
  connManager.handleConnectionFailure("Socket closed unexpectedly");

  assert.equal(connFallbackInvoked, true, "Connection failure must trigger fallback");
  assert.equal(connState.reason, "connection_failure");
  assert.ok(connState.message.includes("Connection to assistance service lost"));

  console.log("✅ Test 6 Passed: Generation errors and connection failures trigger fallback safely");
}

// -----------------------------------------------------------------------------
// Test 7: Restore Original Form When Template is Unavailable
// -----------------------------------------------------------------------------
{
  let originalFormRestored = false;
  let fallbackState = null;

  const manager = new GenerationFallbackManager({
    timeoutMs: 30,
    // Provide a template resolver that returns null to simulate unavailable template
    templateResolver: () => null,
    onRestoreOriginal: (state) => {
      originalFormRestored = true;
      fallbackState = state;
    }
  });

  manager.startGeneration({ activeField: "someUnknownField" });

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(originalFormRestored, true, "Original form must be restored when template is unavailable");
  assert.equal(fallbackState.hasTemplate, false);

  console.log("✅ Test 7 Passed: Restores original form when no template is available");
}

// -----------------------------------------------------------------------------
// Test 8: Prevention of Duplicate Fallback Triggers
// -----------------------------------------------------------------------------
{
  let triggerCount = 0;

  const manager = new GenerationFallbackManager({
    timeoutMs: 30,
    onFallback: () => {
      triggerCount += 1;
    }
  });

  manager.startGeneration({ activeField: "annualIncome" });

  // Rapidly dispatch multiple failure signals
  manager.handleMessage({ type: "validation_failed", errors: [] });
  manager.handleMessage({ type: "error", message: "Second failure" });
  manager.handleConnectionFailure("Socket lost");

  // Wait to ensure timeout doesn't fire duplicate
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(triggerCount, 1, "Fallback must only trigger ONCE despite multiple error events");

  console.log("✅ Test 8 Passed: Duplicate fallback triggers strictly prevented");
}

// -----------------------------------------------------------------------------
// Test 9: Timer Cleanup on Cancel / Reset
// -----------------------------------------------------------------------------
{
  let fallbackCalled = false;

  const manager = new GenerationFallbackManager({
    timeoutMs: 30,
    onFallback: () => {
      fallbackCalled = true;
    }
  });

  manager.startGeneration({ activeField: "annualIncome" });
  manager.cancelGeneration();

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(fallbackCalled, false, "Cancelled generation must not trigger fallback");
  assert.equal(manager.timeoutTimer, null, "Timer must be cleared on cancellation");

  console.log("✅ Test 9 Passed: Timers cleanly cleaned up on cancellation");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("=================================================================");
console.log("🎉 All 9 Generation Timeout & Fallback Handling tests passed!");
console.log("=================================================================");
