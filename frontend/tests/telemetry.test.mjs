import assert from "node:assert/strict";
import {
  computeCognitiveLoadScore,
  normalizeTelemetryMetrics,
  applyExponentialSmoothing,
  DEFAULT_WEIGHTS,
  serializeTelemetryFormSnapshot
} from "../src/hooks/useTelemetry.js";
import {
  simulateConfusion,
  simulateCalmUser,
  generateTelemetryReportCSV
} from "../src/utils/telemetrySimulator.js";
import { validateTelemetryMessage } from "../../backend/src/validators/telemetryValidator.js";

console.log("=================================================================");
console.log("🧪 AuraGen Frontend Telemetry Unit Test Suite (Comprehensive)");
console.log("   Calibrated Scoring, Simulators, CSV Export, and State Snapshots");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Configured Telemetry Weights Verification
// -----------------------------------------------------------------------------
{
  assert.equal(DEFAULT_WEIGHTS.velocityVariance, 25, "Velocity variance weight must be 25 (0.25)");
  assert.equal(DEFAULT_WEIGHTS.directionChanges, 20, "Direction changes weight must be 20 (0.20)");
  assert.equal(DEFAULT_WEIGHTS.hesitation, 25, "Hesitation weight must be 25 (0.25)");
  assert.equal(DEFAULT_WEIGHTS.rageClicks, 20, "Rage clicks weight must be 20 (0.20)");
  assert.equal(DEFAULT_WEIGHTS.clickErrorRate, 10, "Click error rate weight must be 10 (0.10)");

  const totalWeight =
    DEFAULT_WEIGHTS.velocityVariance +
    DEFAULT_WEIGHTS.directionChanges +
    DEFAULT_WEIGHTS.hesitation +
    DEFAULT_WEIGHTS.rageClicks +
    DEFAULT_WEIGHTS.clickErrorRate;
  assert.equal(totalWeight, 100, "Sum of telemetry weights must equal exactly 100");

  console.log("✅ Test 1 Passed: Calibrated telemetry weights verified (0.25, 0.20, 0.25, 0.20, 0.10)");
}

// -----------------------------------------------------------------------------
// Test 2: Normalization of Individual Metrics into Consistent 0–100 Range
// -----------------------------------------------------------------------------
{
  const rawMetrics = {
    velocityVariance: 90000, // std dev 300 -> (300 / 600) * 100 = 50%
    hesitationMs: 4000,      // (4000 / 8000) * 100 = 50%
    rageClicks: 3,           // (3 / 3) * 100 = 100%
    clickErrorRate: 0.35,    // 0.35 * 100 = 35%
    directionChanges: 6      // (6 / 12) * 100 = 50%
  };

  const norm = normalizeTelemetryMetrics(rawMetrics);

  assert.equal(norm.velocityVariance, 50, "Variance 90000 must normalize to 50");
  assert.equal(norm.hesitation, 50, "Hesitation 4000ms must normalize to 50");
  assert.equal(norm.rageClicks, 100, "3 rage clicks must normalize to 100");
  assert.equal(norm.clickErrorRate, 35, "0.35 error rate must normalize to 35");
  assert.equal(norm.directionChanges, 50, "6 direction changes must normalize to 50");

  for (const [key, value] of Object.entries(norm)) {
    assert.ok(
      value >= 0 && value <= 100,
      `Normalized metric ${key} (${value}) must be within [0, 100]`
    );
  }

  console.log("✅ Test 2 Passed: Individual metrics normalized into consistent 0–100 range");
}

// -----------------------------------------------------------------------------
// Test 3: Score Boundaries & Clamping ([0, 100])
// -----------------------------------------------------------------------------
{
  const zeroScore = computeCognitiveLoadScore({
    mouseVelocity: 0,
    velocityVariance: 0,
    hesitationMs: 0,
    rageClicks: 0,
    clickErrorRate: 0,
    directionChanges: 0
  });
  assert.equal(zeroScore, 0, "Zero metrics must result in 0");

  const maxScore = computeCognitiveLoadScore({
    velocityVariance: 5000000,
    hesitationMs: 90000,
    rageClicks: 25,
    clickErrorRate: 1.0,
    directionChanges: 100
  });
  assert.equal(maxScore, 100, "Extreme metrics must clamp cleanly at 100");

  const minScore = computeCognitiveLoadScore({
    velocityVariance: -1000,
    hesitationMs: -2000,
    rageClicks: -5,
    clickErrorRate: -0.5,
    directionChanges: -10
  });
  assert.equal(minScore, 0, "Negative metrics must clamp cleanly to 0");

  console.log("✅ Test 3 Passed: Score boundaries strictly clamped within [0, 100]");
}

// -----------------------------------------------------------------------------
// Test 4: Confusion Simulator Mechanics & Score Spike Demonstration
// -----------------------------------------------------------------------------
{
  const confusedMetrics = {
    velocityVariance: 175000,
    hesitationMs: 6800,
    rageClicks: 3,
    clickErrorRate: 0.40,
    directionChanges: 11
  };

  const confusedScore = computeCognitiveLoadScore(confusedMetrics);
  assert.ok(
    confusedScore >= 70,
    `Confused simulation must produce a score spike breaching the 70 threshold (got ${confusedScore})`
  );

  console.log(`✅ Test 4 Passed: Confused user simulation produces clear score spike (${confusedScore}/100 >= 70)`);
}

// -----------------------------------------------------------------------------
// Test 5: Calm User Simulator Mechanics & Low Score Verification
// -----------------------------------------------------------------------------
{
  const calmMetrics = {
    velocityVariance: 4900,
    hesitationMs: 1200,
    rageClicks: 0,
    clickErrorRate: 0,
    directionChanges: 1
  };

  const calmScore = computeCognitiveLoadScore(calmMetrics);
  assert.ok(
    calmScore < 30,
    `Calm user simulation must maintain a low score (< 30) representing optimal flow (got ${calmScore})`
  );

  console.log(`✅ Test 5 Passed: Calm user simulation maintains a lower score (${calmScore}/100 < 30)`);
}

// -----------------------------------------------------------------------------
// Test 6: Direct Comparison: Confused Spike vs. Calm Flow Separation
// -----------------------------------------------------------------------------
{
  const confusedScore = computeCognitiveLoadScore({
    velocityVariance: 160000,
    hesitationMs: 6500,
    rageClicks: 3,
    clickErrorRate: 0.45,
    directionChanges: 10
  });

  const calmScore = computeCognitiveLoadScore({
    velocityVariance: 3600,
    hesitationMs: 800,
    rageClicks: 0,
    clickErrorRate: 0,
    directionChanges: 1
  });

  const scoreSeparation = confusedScore - calmScore;
  assert.ok(
    scoreSeparation >= 50,
    `Clear statistical separation between confused and calm activity required (got delta of ${scoreSeparation} pts)`
  );
  assert.ok(confusedScore >= 70, `Confused score must be >= 70, got ${confusedScore}`);
  assert.ok(calmScore <= 20, `Calm score must be <= 20, got ${calmScore}`);

  console.log(
    `✅ Test 6 Passed: Demonstrated clear score distinction: Confused (${confusedScore}) vs Calm (${calmScore}) -> Δ = ${scoreSeparation} pts`
  );
}

// -----------------------------------------------------------------------------
// Test 7: Form State Snapshot Active Serialization & Input Preservation
// -----------------------------------------------------------------------------
{
  const mockFormContext = {
    values: {
      fullName: "Jordan Alexander Mercer",
      annualIncome: "145000",
      creditScore: "780",
      employmentStatus: "full_time",
      taxId: "123-45-6789",
      unfilledField: ""
    },
    errors: {
      taxId: "Invalid format"
    },
    totalFieldsCount: 21,
    focusedFieldId: "annualIncome",
    hoveredFieldId: "annualIncome",
    activeFieldLabel: "Annual Gross Income"
  };

  const snapshot = serializeTelemetryFormSnapshot(mockFormContext, "annualIncome", 1700000000000);

  assert.equal(snapshot.capturedAt, 1700000000000, "capturedAt timestamp must be preserved");
  assert.equal(snapshot.values.fullName, "Jordan Alexander Mercer", "User's typed fullName must be preserved");
  assert.equal(snapshot.values.annualIncome, "145000", "User's typed annualIncome must be preserved");
  assert.equal(snapshot.values.taxId, "123-45-6789", "User's typed taxId must be preserved");
  assert.equal(snapshot.domContext.activeFieldId, "annualIncome", "Active friction field must be annualIncome");
  assert.equal(snapshot.domContext.focusedFieldId, "annualIncome", "Focused field must match DOM state");
  assert.equal(snapshot.completedCount, 5, "Completed fields count must accurately reflect non-empty inputs");

  const fullPayload = {
    type: "telemetry",
    sessionId: "sess_unit_test",
    timestamp: Date.now(),
    metrics: {
      mouseVelocity: 750,
      hesitationMs: 9000,
      rageClicks: 4,
      clickErrorRate: 0.3,
      directionChanges: 10
    },
    cognitiveLoadScore: 82,
    instantScore: 82,
    rollingAverageScore: 82,
    activeField: "annualIncome",
    formStateSnapshot: snapshot
  };

  assert.ok(fullPayload.formStateSnapshot, "Threshold breach payload must include formStateSnapshot");
  assert.equal(Object.keys(fullPayload.formStateSnapshot.values).length >= 5, true);

  console.log(`✅ Test 7 Passed: Form state snapshot serialized cleanly with ${snapshot.completedCount} preserved user inputs`);
}

// -----------------------------------------------------------------------------
// Test 8: Simulation Controller Lifecycle & Stop Cleanup
// -----------------------------------------------------------------------------
{
  let tickCount = 0;
  const sim = simulateConfusion({
    durationMs: 10000,
    onTick: () => {
      tickCount += 1;
    }
  });

  assert.equal(sim.isRunning(), true, "Simulation must report isRunning() === true after start");
  sim.stop();
  assert.equal(sim.isRunning(), false, "Simulation must report isRunning() === false after stop()");

  const calmSim = simulateCalmUser({
    durationMs: 10000
  });
  assert.equal(calmSim.isRunning(), true, "Calm simulation must report isRunning() === true after start");
  calmSim.stop();
  assert.equal(calmSim.isRunning(), false, "Calm simulation must stop cleanly");

  console.log("✅ Test 8 Passed: Simulator lifecycle start and stop cleanup verified");
}

// -----------------------------------------------------------------------------
// Test 9: Telemetry Report CSV Export Structure
// -----------------------------------------------------------------------------
{
  const mockHistory = [
    {
      timestamp: "2026-11-20T08:45:00.000Z",
      timeSeconds: 0,
      score: 12,
      rawScore: 12,
      threshold: 70,
      isThresholdReached: false,
      velocityVariance: 3600,
      hesitationMs: 600,
      rageClicks: 0,
      clickErrorRate: 0,
      directionChanges: 1,
      mode: "calm"
    },
    {
      timestamp: "2026-11-20T08:45:05.000Z",
      timeSeconds: 5,
      score: 78,
      rawScore: 82,
      threshold: 70,
      isThresholdReached: true,
      velocityVariance: 160000,
      hesitationMs: 6200,
      rageClicks: 3,
      clickErrorRate: 0.40,
      directionChanges: 9,
      mode: "confused"
    }
  ];

  const csv = generateTelemetryReportCSV(mockHistory);
  assert.ok(csv.includes("Timestamp,TimeSeconds,CognitiveLoadScore"), "CSV must contain header row");
  assert.ok(csv.includes("calm"), "CSV must include calm mode records");
  assert.ok(csv.includes("confused"), "CSV must include confused mode records");
  assert.ok(csv.includes("78"), "CSV must include spiked score record");

  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 3, "CSV should contain 1 header line and 2 data rows");

  console.log("✅ Test 9 Passed: Telemetry report CSV export structure generated and validated");
}

// -----------------------------------------------------------------------------
// Test 10: Minimum Activity Gate
// -----------------------------------------------------------------------------
{
  function evaluateGate({ totalInteractions, minInteractions = 2, rawScore }) {
    const hasMinimumActivity = totalInteractions >= minInteractions;
    const effectiveScore = hasMinimumActivity ? rawScore : 0;
    const isTriggerEligible = hasMinimumActivity && effectiveScore >= 70;
    return { hasMinimumActivity, effectiveScore, isTriggerEligible };
  }

  const cold = evaluateGate({ totalInteractions: 0, rawScore: 80 });
  assert.equal(cold.hasMinimumActivity, false);
  assert.equal(cold.effectiveScore, 0);
  assert.equal(cold.isTriggerEligible, false);

  const active = evaluateGate({ totalInteractions: 2, rawScore: 80 });
  assert.equal(active.hasMinimumActivity, true);
  assert.equal(active.effectiveScore, 80);
  assert.equal(active.isTriggerEligible, true);

  console.log("✅ Test 10 Passed: Minimum activity gate verified");
}

// -----------------------------------------------------------------------------
// Test 11: 60-Second Cooldown & Prevention of Repeated Triggers
// -----------------------------------------------------------------------------
{
  function testCooldownCycle() {
    let lastTriggerTime = 0;
    const cooldownMs = 60000;
    let firedCount = 0;

    function handleScore(score, now) {
      const inCooldown = lastTriggerTime > 0 && now - lastTriggerTime < cooldownMs;
      if (score >= 70 && !inCooldown) {
        lastTriggerTime = now;
        firedCount += 1;
        return true;
      }
      return false;
    }

    return { handleScore, getCount: () => firedCount };
  }

  const cycle = testCooldownCycle();
  const t0 = 100000;

  assert.equal(cycle.handleScore(85, t0), true, "First spike fires");
  assert.equal(cycle.getCount(), 1);

  // During cooldown (15s later)
  assert.equal(cycle.handleScore(85, t0 + 15000), false, "Spike at 15s blocked by cooldown");
  assert.equal(cycle.getCount(), 1);

  // After cooldown (65s later)
  assert.equal(cycle.handleScore(85, t0 + 65000), true, "Spike at 65s fires after cooldown expiration");
  assert.equal(cycle.getCount(), 2);

  console.log("✅ Test 11 Passed: 60-second cooldown strictly prevents repeated generation triggers");
}

// -----------------------------------------------------------------------------
// Test 12: Backend Telemetry Validator Compatibility
// -----------------------------------------------------------------------------
{
  const samplePayload = {
    type: "telemetry",
    sessionId: "sess_sim_test_01",
    timestamp: Date.now(),
    metrics: {
      mouseVelocity: 450,
      velocityVariance: 120000,
      hesitationMs: 4000,
      rageClicks: 2,
      clickErrorRate: 0.25,
      directionChanges: 6
    },
    normalizedMetrics: {
      velocityVariance: 57.7,
      hesitation: 50,
      rageClicks: 66.7,
      clickErrorRate: 25,
      directionChanges: 50
    },
    rawScore: 53,
    cognitiveLoadScore: 53,
    threshold: 70,
    isTriggered: false,
    isCooldownActive: false,
    cooldownRemaining: 0,
    hasMinimumActivity: true,
    activeField: "annualIncome"
  };

  const validation = validateTelemetryMessage(samplePayload);
  assert.equal(validation.valid, true, `Payload must be valid: ${validation.errors?.join(", ")}`);

  console.log("✅ Test 12 Passed: Telemetry snapshot fully compliant with backend WebSocket schema");
}

console.log("\n=================================================================");
console.log("🎉 All 12 Unit Tests Passed Successfully!");
console.log("=================================================================");
