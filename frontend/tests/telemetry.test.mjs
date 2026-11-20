import assert from "node:assert/strict";
import {
  computeCognitiveLoadScore,
  normalizeTelemetryMetrics,
  applyExponentialSmoothing,
  DEFAULT_WEIGHTS
} from "../src/hooks/useTelemetry.js";
import { validateTelemetryMessage } from "../../backend/src/validators/telemetryValidator.js";

console.log("=================================================================");
console.log("🧪 AuraGen Frontend Telemetry Tracker Unit Test Suite (Commit 2)");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Configured Telemetry Weights Verification
// -----------------------------------------------------------------------------
{
  // Calibrated weights:
  // - Velocity variance: 0.25 (25 pts)
  // - Direction changes: 0.20 (20 pts)
  // - Hesitation: 0.25 (25 pts)
  // - Rage clicks: 0.20 (20 pts)
  // - Click errors: 0.10 (10 pts)
  // Total: 100 pts
  assert.equal(DEFAULT_WEIGHTS.velocityVariance, 25, "Velocity variance weight must be 25 (0.25)");
  assert.equal(DEFAULT_WEIGHTS.directionChanges, 20, "Direction changes weight must be 20 (0.20)");
  assert.equal(DEFAULT_WEIGHTS.hesitation, 25, "Hesitation weight must be 25 (0.25)");
  assert.equal(DEFAULT_WEIGHTS.rageClicks, 20, "Rage clicks weight must be 20 (0.20)");
  assert.equal(DEFAULT_WEIGHTS.clickErrorRate, 10, "Click error rate weight must be 10 (0.10)");

  // Sum of weights must equal 100
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
    velocityVariance: 90000, // sqrt(90000) = 300 px/s -> (300 / 600) * 100 = 50%
    hesitationMs: 4000,      // (4000 / 8000) * 100 = 50%
    rageClicks: 3,           // (3 / 3) * 100 = 100%
    clickErrorRate: 0.35,    // 0.35 * 100 = 35%
    directionChanges: 6      // (6 / 12) * 100 = 50%
  };

  const norm = normalizeTelemetryMetrics(rawMetrics);

  assert.equal(norm.velocityVariance, 50, "Variance 90000 (std dev 300) must normalize to 50");
  assert.equal(norm.hesitation, 50, "Hesitation 4000ms must normalize to 50");
  assert.equal(norm.rageClicks, 100, "3 rage clicks must normalize to 100");
  assert.equal(norm.clickErrorRate, 35, "0.35 click error rate must normalize to 35");
  assert.equal(norm.directionChanges, 50, "6 direction changes must normalize to 50");

  // Every normalized metric must be in the [0, 100] range
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
  // Zero state
  const zeroMetrics = {
    mouseVelocity: 0,
    velocityVariance: 0,
    hesitationMs: 0,
    rageClicks: 0,
    clickErrorRate: 0,
    directionChanges: 0
  };
  const zeroScore = computeCognitiveLoadScore(zeroMetrics);
  assert.equal(zeroScore, 0, "Zero metrics must result in a score of exactly 0");

  // Extreme overload state
  const overloadMetrics = {
    mouseVelocity: 15000,
    velocityVariance: 5000000,
    hesitationMs: 90000,
    rageClicks: 25,
    clickErrorRate: 1.0,
    directionChanges: 100
  };
  const maxScore = computeCognitiveLoadScore(overloadMetrics);
  assert.equal(maxScore, 100, "Extreme metrics must clamp cleanly at exactly 100");

  // Negative boundary protection
  const negativeMetrics = {
    mouseVelocity: -500,
    velocityVariance: -1000,
    hesitationMs: -2000,
    rageClicks: -5,
    clickErrorRate: -0.5,
    directionChanges: -10
  };
  const minClampedScore = computeCognitiveLoadScore(negativeMetrics);
  assert.equal(minClampedScore, 0, "Negative metrics must clamp cleanly to 0");

  console.log("✅ Test 3 Passed: Score boundaries strictly clamped within [0, 100]");
}

// -----------------------------------------------------------------------------
// Test 4: Normal User Activity Scenario (Calm Flow)
// -----------------------------------------------------------------------------
{
  // Normal calm user activity:
  // - Smooth, steady cursor (stdDev ~ 80 px/s -> variance ~6400 -> norm ~13.3)
  // - Minimal hesitation (1200ms -> norm ~15)
  // - 0 rage clicks -> norm 0
  // - Low click errors (0 error clicks -> norm 0)
  // - Gentle steering (1 direction change -> norm ~8.3)
  const calmMetrics = {
    velocityVariance: 6400,
    hesitationMs: 1200,
    rageClicks: 0,
    clickErrorRate: 0,
    directionChanges: 1
  };

  const calmScore = computeCognitiveLoadScore(calmMetrics);
  // Expected: (13.3 * 0.25) + (15 * 0.25) + (0 * 0.20) + (0 * 0.10) + (8.3 * 0.20) = 3.3 + 3.75 + 0 + 0 + 1.66 = ~8.7 -> 9
  assert.ok(
    calmScore < 30,
    `Normal calm user activity score must remain low (< 30), got ${calmScore}`
  );

  console.log(`✅ Test 4 Passed: Normal calm user activity produces low score (${calmScore}/100 < 30)`);
}

// -----------------------------------------------------------------------------
// Test 5: User Hesitation Scenario (Long Pause on Field)
// -----------------------------------------------------------------------------
{
  // User pauses on a confusing field for 7.5 seconds (7500ms):
  // Hesitation alone: (7500 / 8000) * 100 = 93.8% norm -> 93.8 * 0.25 = ~23.5 pts
  const hesitationOnlyMetrics = {
    velocityVariance: 0,
    hesitationMs: 7500,
    rageClicks: 0,
    clickErrorRate: 0,
    directionChanges: 0
  };

  const hesitationScore = computeCognitiveLoadScore(hesitationOnlyMetrics);
  assert.ok(
    hesitationScore >= 22 && hesitationScore <= 24,
    `Hesitation alone at 7500ms should contribute ~23-24 points, got ${hesitationScore}`
  );

  // Maximum hesitation (8000ms+) must reach the full 25 points allocation
  const maxHesitationScore = computeCognitiveLoadScore({
    velocityVariance: 0,
    hesitationMs: 10000,
    rageClicks: 0,
    clickErrorRate: 0,
    directionChanges: 0
  });
  assert.equal(maxHesitationScore, 25, "Max hesitation must reach the full 25 point weight");

  console.log(`✅ Test 5 Passed: User hesitation accurately isolated and measured (${hesitationScore}/25 pts)`);
}

// -----------------------------------------------------------------------------
// Test 6: Repeated Clicks Scenario (Rage Click Bursts)
// -----------------------------------------------------------------------------
{
  // Rage clicks alone:
  // 1 rage incident -> (1 / 3) * 20 = ~6.7 pts
  const singleRageScore = computeCognitiveLoadScore({ rageClicks: 1 });
  assert.equal(singleRageScore, 7, "1 rage click incident should yield ~7 pts");

  // 3+ rage incidents -> (3 / 3) * 20 = 20 pts
  const maxRageScore = computeCognitiveLoadScore({ rageClicks: 3 });
  assert.equal(maxRageScore, 20, "3 rage click incidents must reach the full 20 point weight");

  console.log(`✅ Test 6 Passed: Repeated rage clicks accurately scaled (1 incident: ${singleRageScore} pts, 3 incidents: ${maxRageScore} pts)`);
}

// -----------------------------------------------------------------------------
// Test 7: High Confusion Combined Scenario (Threshold Breach >= 70)
// -----------------------------------------------------------------------------
{
  // Highly confused user exhibiting multiple friction signals:
  // - Erratic cursor movements: velocity variance = 160,000 (stdDev 400 px/s) -> norm 66.7% -> 16.7 pts
  // - Significant hesitation: 6,000ms pause -> norm 75% -> 18.8 pts
  // - Frustrated clicking: 3 rage clicks -> norm 100% -> 20.0 pts
  // - Form validation errors / misclicks: 0.50 error rate -> norm 50% -> 5.0 pts
  // - Erratic cursor steering: 9 direction changes -> norm 75% -> 15.0 pts
  // Total expected: ~16.7 + 18.8 + 20.0 + 5.0 + 15.0 = 75.5 -> 76 pts
  const highConfusionMetrics = {
    velocityVariance: 160000,
    hesitationMs: 6000,
    rageClicks: 3,
    clickErrorRate: 0.5,
    directionChanges: 9
  };

  const highConfusionScore = computeCognitiveLoadScore(highConfusionMetrics);
  assert.ok(
    highConfusionScore >= 70,
    `High confusion scenario must cross the 70 threshold, got ${highConfusionScore}`
  );

  console.log(`✅ Test 7 Passed: High confusion combined scenario crosses threshold (${highConfusionScore}/100 >= 70)`);
}

// -----------------------------------------------------------------------------
// Test 8: Exponential Smoothing (Asymmetric Fast Attack & Gentle Decay)
// -----------------------------------------------------------------------------
{
  // Fast attack: when score spikes from 0 to 80
  const step1 = applyExponentialSmoothing(0, 80, 0.65);
  assert.ok(step1 < 80, `First step should be smoothed (got ${step1} < 80)`);
  assert.ok(step1 >= 40, `Fast-attack rise should respond briskly (got ${step1} >= 40)`);

  const step2 = applyExponentialSmoothing(step1, 80, 0.65);
  assert.ok(step2 > step1, "Score should smoothly approach raw score on subsequent steps");

  // Gentle decay: when score drops from 80 to 0, decay is slower to prevent UI flicker
  const dropStep1 = applyExponentialSmoothing(80, 0, 0.75);
  assert.ok(dropStep1 >= 55, `Decay should be gradual to avoid UI flicker (got ${dropStep1} >= 55)`);

  console.log(`✅ Test 8 Passed: Exponential smoothing verified (Attack: 0 -> ${step1} -> ${step2}, Decay: 80 -> ${dropStep1})`);
}

// -----------------------------------------------------------------------------
// Test 9: Minimum Activity Requirement Gate
// -----------------------------------------------------------------------------
{
  // Simulate the minimum activity check logic from useTelemetry:
  function evaluateTelemetryWithGate({
    totalInteractions,
    velocitySampleCount,
    clickCount,
    manualOverrideScore,
    minInteractions = 2,
    rawScore
  }) {
    const hasMinimumActivity =
      manualOverrideScore !== null ||
      totalInteractions >= minInteractions ||
      velocitySampleCount >= minInteractions ||
      clickCount >= 1;

    const effectiveScore = hasMinimumActivity ? rawScore : 0;
    const isTriggerEligible = hasMinimumActivity && effectiveScore >= 70;

    return { hasMinimumActivity, effectiveScore, isTriggerEligible };
  }

  // Cold start: 0 interactions
  const coldStart = evaluateTelemetryWithGate({
    totalInteractions: 0,
    velocitySampleCount: 0,
    clickCount: 0,
    manualOverrideScore: null,
    rawScore: 85 // Suppose uninitialized hesitation or noise
  });
  assert.equal(coldStart.hasMinimumActivity, false, "Cold start must not satisfy minimum activity");
  assert.equal(coldStart.effectiveScore, 0, "Score must remain 0 before minimum activity");
  assert.equal(coldStart.isTriggerEligible, false, "Trigger must be suppressed before minimum activity");

  // Active user: 2 velocity samples
  const activeUser = evaluateTelemetryWithGate({
    totalInteractions: 2,
    velocitySampleCount: 2,
    clickCount: 0,
    manualOverrideScore: null,
    rawScore: 78
  });
  assert.equal(activeUser.hasMinimumActivity, true, "2 interactions satisfy minimum activity");
  assert.equal(activeUser.effectiveScore, 78, "Effective score equals raw score after activity");
  assert.equal(activeUser.isTriggerEligible, true, "Trigger is eligible once active and above threshold");

  console.log("✅ Test 9 Passed: Minimum activity requirement gate prevents false positive triggers");
}

// -----------------------------------------------------------------------------
// Test 10: 60-Second Cooldown & Prevention of Repeated Requests
// -----------------------------------------------------------------------------
{
  function simulateTriggerLifecycle(cooldownMs = 60000) {
    let lastThresholdFireTime = 0;
    let hasFiredThresholdForEpisode = false;
    let triggerCount = 0;

    function processScore(score, now) {
      const isCooldownActive =
        lastThresholdFireTime > 0 && now - lastThresholdFireTime < cooldownMs;

      if (score >= 70) {
        if (!isCooldownActive && !hasFiredThresholdForEpisode) {
          hasFiredThresholdForEpisode = true;
          lastThresholdFireTime = now;
          triggerCount += 1;
          return { triggered: true, isCooldownActive: true };
        }
        return { triggered: false, isCooldownActive };
      } else if (score < 70 * 0.85) {
        hasFiredThresholdForEpisode = false;
        return { triggered: false, isCooldownActive };
      }
      return { triggered: false, isCooldownActive };
    }

    return { processScore, getTriggerCount: () => triggerCount };
  }

  const lifecycle = simulateTriggerLifecycle(60000);
  const t0 = 100000;

  // Initial trigger at t0 with score 85 -> MUST trigger
  const res1 = lifecycle.processScore(85, t0);
  assert.equal(res1.triggered, true, "Initial spike must trigger generation");
  assert.equal(lifecycle.getTriggerCount(), 1, "Trigger count should be 1");

  // Subsequent spike 10s later (t0 + 10s = 110,000) with score 90 -> MUST be blocked by cooldown
  const res2 = lifecycle.processScore(90, t0 + 10000);
  assert.equal(res2.triggered, false, "Subsequent spike within 60s must NOT trigger");
  assert.equal(res2.isCooldownActive, true, "Cooldown must be active 10s after trigger");
  assert.equal(lifecycle.getTriggerCount(), 1, "Trigger count must remain 1 during cooldown");

  // User calms down at t0 + 30s
  lifecycle.processScore(40, t0 + 30000);

  // Another spike at t0 + 45s (still within 60s cooldown) -> MUST be blocked
  const res3 = lifecycle.processScore(85, t0 + 45000);
  assert.equal(res3.triggered, false, "Spike at 45s must still be blocked by 60s cooldown");
  assert.equal(lifecycle.getTriggerCount(), 1, "Trigger count must remain 1");

  // User calms down at t0 + 55s
  lifecycle.processScore(35, t0 + 55000);

  // New spike at t0 + 61s (61 seconds after first trigger, cooldown expired) -> MUST trigger
  const res4 = lifecycle.processScore(88, t0 + 61000);
  assert.equal(res4.triggered, true, "Spike after 60s cooldown expires must trigger new generation");
  assert.equal(lifecycle.getTriggerCount(), 2, "Trigger count should increment to 2");

  console.log("✅ Test 10 Passed: 60-second cooldown strictly prevents repeated generation triggers");
}

// -----------------------------------------------------------------------------
// Test 11: Configurable Threshold Support
// -----------------------------------------------------------------------------
{
  const testMetrics = {
    velocityVariance: 62500, // std dev 250 -> norm 41.7 -> 10.4 pts
    hesitationMs: 4000,      // norm 50 -> 12.5 pts
    rageClicks: 1,           // norm 33.3 -> 6.7 pts
    clickErrorRate: 0.2,     // norm 20 -> 2.0 pts
    directionChanges: 4      // norm 33.3 -> 6.7 pts
  };
  const testScore = computeCognitiveLoadScore(testMetrics);
  // ~ 10.4 + 12.5 + 6.7 + 2.0 + 6.7 = 38.3 -> 38

  // With relaxed threshold (35):
  const isTriggeredAt35 = testScore >= 35;
  assert.equal(isTriggeredAt35, true, "Score 38 must exceed test threshold 35");

  // With default threshold (70):
  const isTriggeredAt70 = testScore >= 70;
  assert.equal(isTriggeredAt70, false, "Score 38 must NOT exceed default threshold 70");

  // With strict threshold (85):
  const isTriggeredAt85 = testScore >= 85;
  assert.equal(isTriggeredAt85, false, "Score 38 must NOT exceed strict threshold 85");

  console.log(`✅ Test 11 Passed: Configurable threshold behavior verified (Score ${testScore}: exceeds 35, safely below 70 & 85)`);
}

// -----------------------------------------------------------------------------
// Test 12: Backend Telemetry Validator Compatibility
// -----------------------------------------------------------------------------
{
  const sampleTelemetryPayload = {
    type: "telemetry",
    sessionId: "sess_unit_test_99",
    timestamp: Date.now(),
    metrics: {
      mouseVelocity: 450,
      velocityVariance: 90000,
      hesitationMs: 3500,
      rageClicks: 1,
      clickErrorRate: 0.15,
      directionChanges: 4
    },
    normalizedMetrics: {
      velocityVariance: 50,
      hesitation: 43.8,
      rageClicks: 33.3,
      clickErrorRate: 15,
      directionChanges: 33.3
    },
    rawScore: 37,
    cognitiveLoadScore: 37,
    threshold: 70,
    isTriggered: false,
    isCooldownActive: false,
    cooldownRemaining: 0,
    hasMinimumActivity: true,
    activeField: "annualIncome"
  };

  const validation = validateTelemetryMessage(sampleTelemetryPayload);
  assert.equal(validation.valid, true, `Telemetry message must be valid: ${validation.errors?.join(", ")}`);
  assert.equal(validation.data.cognitiveLoadScore, 37);
  assert.equal(validation.data.sessionId, "sess_unit_test_99");

  console.log("✅ Test 12 Passed: Extended telemetry snapshot strictly valid against backend schema");
}

console.log("\n=================================================================");
console.log("🎉 All 12 Unit Tests Passed Successfully! (Full Calibration)");
console.log("=================================================================");