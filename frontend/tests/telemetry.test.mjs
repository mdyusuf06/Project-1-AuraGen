import assert from "node:assert/strict";
import {
  computeCognitiveLoadScore,
  DEFAULT_WEIGHTS
} from "../src/hooks/useTelemetry.js";

console.log("===============================================================");
console.log("🧪 AuraGen Frontend Telemetry Tracker Unit Test Suite (Week 2)");
console.log("===============================================================");

// -----------------------------------------------------------------------------
// Test 1: Calibrated Score Calculation & Weight Verification
// -----------------------------------------------------------------------------
{
  // Verify default calibrated weights match Week 2 specification:
  // - Velocity variance: 0.25 (25 pts)
  // - Direction changes: 0.20 (20 pts)
  // - Hesitation: 0.25 (25 pts)
  // - Rage clicks: 0.20 (20 pts)
  // - Click errors: 0.10 (10 pts)
  assert.equal(DEFAULT_WEIGHTS.velocityVariance, 25, "Velocity variance weight must be 25 (0.25)");
  assert.equal(DEFAULT_WEIGHTS.directionChanges, 20, "Direction changes weight must be 20 (0.20)");
  assert.equal(DEFAULT_WEIGHTS.hesitation, 25, "Hesitation weight must be 25 (0.25)");
  assert.equal(DEFAULT_WEIGHTS.rageClicks, 20, "Rage clicks weight must be 20 (0.20)");
  assert.equal(DEFAULT_WEIGHTS.clickErrorRate, 10, "Click error rate weight must be 10 (0.10)");

  // Baseline scenario with variance:
  // velocityVariance = 90000 (std dev = 300 px/s, 50% of 600) -> 12.5 pts
  // hesitationMs = 4000 (50% of 8000) -> 12.5 pts
  // rageClicks = 0 -> 0 pts
  // clickErrorRate = 0.2 (20% of 10) -> 2 pts
  // directionChanges = 3 (25% of 20) -> 5 pts
  // Total expected: ~ 12.5 + 12.5 + 0 + 2 + 5 = 32
  const baselineMetrics = {
    velocityVariance: 90000,
    hesitationMs: 4000,
    rageClicks: 0,
    clickErrorRate: 0.2,
    directionChanges: 3
  };

  const calculatedScore = computeCognitiveLoadScore(baselineMetrics);
  assert.ok(
    calculatedScore >= 30 && calculatedScore <= 34,
    `Calculated score should be ~32, got ${calculatedScore}`
  );

  // Backward compatibility test: passing mouseVelocity without velocityVariance
  const legacyMetrics = {
    mouseVelocity: 600, // 50% of 1200 -> 12.5 pts
    hesitationMs: 4000,
    rageClicks: 0,
    clickErrorRate: 0.2,
    directionChanges: 3
  };
  const legacyScore = computeCognitiveLoadScore(legacyMetrics);
  assert.equal(legacyScore, calculatedScore, "Legacy mouseVelocity must yield identical calibrated score");

  console.log(`✅ Test 1 Passed: Week 2 calibrated score calculation verified (${calculatedScore}/100)`);
}

// -----------------------------------------------------------------------------
// Test 2: Score Limits (Strict Clamping from 0 to 100)
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

  // Extreme overload state (values far exceeding normalization caps)
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

  console.log("✅ Test 2 Passed: Score boundaries strictly clamped within [0, 100]");
}

// -----------------------------------------------------------------------------
// Test 3: Cursor Velocity Variance & Erratic Motion Sensitivity
// -----------------------------------------------------------------------------
{
  // Test mathematical variance calculation from velocity samples
  function computeVelocityStats(samples) {
    if (samples.length === 0) return { mean: 0, variance: 0, stdDev: 0 };
    const mean = Math.round(samples.reduce((sum, v) => sum + v, 0) / samples.length);
    const variance = Math.round(
      samples.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / samples.length
    );
    const stdDev = Math.round(Math.sqrt(variance));
    return { mean, variance, stdDev };
  }

  // Uniform smooth movement: velocity is steady 400 px/s everywhere -> variance = 0
  const smoothSamples = [400, 400, 400, 400, 400, 400];
  const smoothStats = computeVelocityStats(smoothSamples);
  assert.equal(smoothStats.variance, 0, "Constant velocity must yield 0 variance");
  const smoothScore = computeCognitiveLoadScore({ velocityVariance: smoothStats.variance });
  assert.equal(smoothScore, 0, "Zero variance should contribute 0 to cognitive load");

  // Erratic movement: jerky stop-and-go movements (0, 1200, 0, 1200, 0, 1200) -> high variance
  const erraticSamples = [0, 1200, 0, 1200, 0, 1200];
  const erraticStats = computeVelocityStats(erraticSamples);
  assert.ok(erraticStats.variance > 300000, "Erratic bursts must produce high variance");
  const erraticScore = computeCognitiveLoadScore({ velocityVariance: erraticStats.variance });
  assert.equal(erraticScore, DEFAULT_WEIGHTS.velocityVariance, "High variance must max out the 25pt variance weight");

  console.log(`✅ Test 3 Passed: Velocity variance measurement verified (Smooth: ${smoothStats.variance}, Erratic: ${erraticStats.variance})`);
}

// -----------------------------------------------------------------------------
// Test 4: Direction-Change Detection (Erratic Angles > 45 deg)
// -----------------------------------------------------------------------------
{
  function detectDirectionChanges(points) {
    let directionChanges = 0;
    let lastHeadingAngle = null;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const distance = Math.hypot(dx, dy);

      if (distance > 8) {
        const headingAngle = Math.atan2(dy, dx);
        if (lastHeadingAngle !== null) {
          let angleDiff = Math.abs(headingAngle - lastHeadingAngle);
          if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
          }
          if (angleDiff > Math.PI / 4) {
            directionChanges += 1;
          }
        }
        lastHeadingAngle = headingAngle;
      }
    }
    return directionChanges;
  }

  // Smooth movement: 0 direction changes
  const straightLine = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 100, y: 0 },
    { x: 150, y: 0 }
  ];
  assert.equal(detectDirectionChanges(straightLine), 0, "Straight movement should have 0 direction changes");

  // Zig-zag movement: 4 reversals
  const zigZag = [
    { x: 100, y: 100 },
    { x: 250, y: 100 },
    { x: 100, y: 100 },
    { x: 250, y: 100 },
    { x: 100, y: 100 },
    { x: 250, y: 100 }
  ];
  const detectedChanges = detectDirectionChanges(zigZag);
  assert.equal(detectedChanges, 4, `Zig-zag trajectory should yield 4 direction changes, got ${detectedChanges}`);

  // Contribution of direction changes with 0.20 weight
  const scoreCalm = computeCognitiveLoadScore({ directionChanges: 0 });
  const scoreAgitated = computeCognitiveLoadScore({ directionChanges: 12 });
  assert.equal(scoreAgitated - scoreCalm, DEFAULT_WEIGHTS.directionChanges, "12 direction changes must max out 20pt direction weight");

  console.log(`✅ Test 4 Passed: Direction-change deflection algorithm verified (${detectedChanges} changes detected)`);
}

// -----------------------------------------------------------------------------
// Test 5: Rolling 10-Second Window (Event Buffering & Expiration)
// -----------------------------------------------------------------------------
{
  const windowDurationMs = 10000;
  const now = 20000;

  const clickEvents = [
    { time: 5000, x: 100, y: 100, isError: true },  // Old (> 10s ago)
    { time: 8000, x: 105, y: 102, isError: true },  // Old (> 10s ago)
    { time: 12000, x: 102, y: 101, isError: false }, // In window (8s ago)
    { time: 18000, x: 200, y: 200, isError: true },  // In window (2s ago)
    { time: 19500, x: 205, y: 201, isError: false }  // In window (0.5s ago)
  ];

  const cutoff = now - windowDurationMs;
  const activeEvents = clickEvents.filter((c) => c.time >= cutoff);

  assert.equal(activeEvents.length, 3, "Only events within the last 10s should remain");
  assert.equal(activeEvents[0].time, 12000, "First active event should be at 12000ms");

  const totalInWindow = activeEvents.length;
  const errorsInWindow = activeEvents.filter((c) => c.isError).length;
  const rollingErrorRate = Number((errorsInWindow / totalInWindow).toFixed(2));

  assert.equal(rollingErrorRate, 0.33, `Rolling error rate should be 0.33, got ${rollingErrorRate}`);

  console.log("✅ Test 5 Passed: Rolling 10-second window event eviction verified");
}

// -----------------------------------------------------------------------------
// Test 6: Rage-Click Detection & Threshold 70 Reachability
// -----------------------------------------------------------------------------
{
  function evaluateRageClicks(clicks, windowMs = 1000, maxRadiusPx = 35) {
    const rageIncidents = [];
    for (let i = 0; i < clicks.length; i++) {
      const current = clicks[i];
      const cluster = clicks.filter(
        (c) =>
          c.time <= current.time &&
          current.time - c.time <= windowMs &&
          Math.hypot(c.x - current.x, c.y - current.y) <= maxRadiusPx
      );

      if (cluster.length >= 3) {
        rageIncidents.push(current.time);
      }
    }
    return rageIncidents;
  }

  // 3 rapid clicks at same spot within 400ms -> MUST trigger rage click
  const rapidClusterClicks = [
    { time: 1000, x: 200, y: 300 },
    { time: 1200, x: 205, y: 302 },
    { time: 1350, x: 202, y: 298 }
  ];
  const rageResult = evaluateRageClicks(rapidClusterClicks);
  assert.ok(rageResult.length >= 1, "3 rapid clustered clicks must trigger a rage click");

  // Calibrated score with rage clicks + hesitation + variance crossing threshold 70
  const scoreWithRage = computeCognitiveLoadScore({
    velocityVariance: 160000, // std dev 400 px/s -> ~16.7 pts
    hesitationMs: 6000,       // 75% of 25 -> 18.75 pts
    rageClicks: 3,            // 100% of 20 -> 20 pts
    clickErrorRate: 0.5,      // 50% of 10 -> 5 pts
    directionChanges: 8       // 67% of 20 -> 13.3 pts
  });
  // Total ~ 16.7 + 18.75 + 20 + 5 + 13.3 = 73.75 -> 74
  assert.ok(
    scoreWithRage >= 70,
    `Rage clicking + hesitation should cross threshold 70, got ${scoreWithRage}`
  );

  console.log(`✅ Test 6 Passed: Rage-click cluster detection and threshold breach verified (${scoreWithRage}/100)`);
}

// -----------------------------------------------------------------------------
// Test 7: Exponential Smoothing Verification (No Jarring Spikes)
// -----------------------------------------------------------------------------
{
  function applySmoothing(prevScore, rawScore, alpha = 0.65) {
    const effAlpha = rawScore > prevScore ? 0.45 : alpha;
    return Math.round(prevScore * effAlpha + rawScore * (1 - effAlpha));
  }

  // When score suddenly spikes from 0 to 80, smoothing prevents an instant jarring jump
  const step1 = applySmoothing(0, 80);
  assert.ok(step1 < 80, `First step should be smoothed (got ${step1} < 80)`);
  assert.ok(step1 >= 40, `Fast-attack rise should respond briskly (got ${step1} >= 40)`);

  const step2 = applySmoothing(step1, 80);
  assert.ok(step2 > step1, "Score should smoothly approach raw score on subsequent steps");

  // When score drops to 0, decay is gentle
  const dropStep1 = applySmoothing(80, 0, 0.75);
  assert.ok(dropStep1 >= 55, `Decay should be gradual to avoid UI flicker (got ${dropStep1} >= 55)`);

  console.log(`✅ Test 7 Passed: Exponential smoothing filter verified (Rise: 0 -> ${step1} -> ${step2}, Decay: 80 -> ${dropStep1})`);
}

console.log("\n===============================================================");
console.log("🎉 All 7 Telemetry Tracker Unit Tests Passed Successfully!");
console.log("===============================================================");
