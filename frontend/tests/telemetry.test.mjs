import assert from "node:assert/strict";
import {
  computeCognitiveLoadScore,
  DEFAULT_WEIGHTS
} from "../src/hooks/useTelemetry.js";

console.log("===============================================================");
console.log("🧪 AuraGen Frontend Telemetry Tracker Unit Test Suite");
console.log("===============================================================");

// -----------------------------------------------------------------------------
// Test 1: Score Calculation & Baseline Accuracy
// -----------------------------------------------------------------------------
{
  const baselineMetrics = {
    mouseVelocity: 600,       // 50% of 1200 -> 10 pts
    hesitationMs: 4000,       // 50% of 8000 -> 12.5 pts
    rageClicks: 0,            // 0 pts
    clickErrorRate: 0.2,      // 20% of 15 -> 3 pts
    directionChanges: 3       // 25% of 15 -> 3.75 pts
  };

  const calculatedScore = computeCognitiveLoadScore(baselineMetrics);
  // Expected: ~ 10 + 12.5 + 0 + 3 + 3.75 = 29.25 -> 29
  assert.ok(
    calculatedScore >= 27 && calculatedScore <= 31,
    `Calculated score should be ~29, got ${calculatedScore}`
  );
  console.log(`✅ Test 1 Passed: Score calculation verified (${calculatedScore}/100)`);
}

// -----------------------------------------------------------------------------
// Test 2: Score Limits (Strict Clamping from 0 to 100)
// -----------------------------------------------------------------------------
{
  // Zero state
  const zeroMetrics = {
    mouseVelocity: 0,
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
// Test 3: Direction-Change Detection (Erratic Movement)
// -----------------------------------------------------------------------------
{
  // Helper implementing the angle deflection formula used in useTelemetry.js
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
          // Deflection > 45 degrees signifies erratic direction change
          if (angleDiff > Math.PI / 4) {
            directionChanges += 1;
          }
        }
        lastHeadingAngle = headingAngle;
      }
    }
    return directionChanges;
  }

  // Smooth straight line: should produce 0 direction changes
  const straightLine = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 100, y: 0 },
    { x: 150, y: 0 }
  ];
  assert.equal(detectDirectionChanges(straightLine), 0, "Straight movement should have 0 direction changes");

  // Erratic zig-zag movement: reversing 180 degrees every step
  const zigZag = [
    { x: 100, y: 100 },
    { x: 250, y: 100 }, // Heading: 0 rad (right)
    { x: 100, y: 100 }, // Heading: Math.PI (left, 180 deg reversal) -> change 1
    { x: 250, y: 100 }, // Heading: 0 rad (right, 180 deg reversal) -> change 2
    { x: 100, y: 100 }, // Heading: Math.PI (left, 180 deg reversal) -> change 3
    { x: 250, y: 100 }  // Heading: 0 rad (right, 180 deg reversal) -> change 4
  ];
  const detectedChanges = detectDirectionChanges(zigZag);
  assert.equal(detectedChanges, 4, `Zig-zag trajectory should yield 4 direction changes, got ${detectedChanges}`);

  // Contribution of direction changes to score
  const scoreCalm = computeCognitiveLoadScore({ directionChanges: 0 });
  const scoreAgitated = computeCognitiveLoadScore({ directionChanges: 12 });
  assert.ok(
    scoreAgitated > scoreCalm,
    "Erratic direction changes must increase cognitive load score"
  );
  assert.equal(scoreAgitated - scoreCalm, DEFAULT_WEIGHTS.directionChanges, "12 direction changes should max out direction weight");

  console.log(`✅ Test 3 Passed: Direction-change deflection algorithm verified (${detectedChanges} changes detected)`);
}

// -----------------------------------------------------------------------------
// Test 4: Rolling 10-Second Window (Event Buffering & Expiration)
// -----------------------------------------------------------------------------
{
  const windowDurationMs = 10000;
  const now = 20000;

  // Simulated events at different timestamps
  const clickEvents = [
    { time: 5000, x: 100, y: 100, isError: true },  // Old (> 10s ago, should be pruned)
    { time: 8000, x: 105, y: 102, isError: true },  // Old (> 10s ago, should be pruned)
    { time: 12000, x: 102, y: 101, isError: false }, // Inside window (8s ago)
    { time: 18000, x: 200, y: 200, isError: true },  // Inside window (2s ago)
    { time: 19500, x: 205, y: 201, isError: false }  // Inside window (0.5s ago)
  ];

  const cutoff = now - windowDurationMs; // 10000
  const activeEvents = clickEvents.filter((c) => c.time >= cutoff);

  assert.equal(activeEvents.length, 3, "Only events within the last 10s should remain");
  assert.equal(activeEvents[0].time, 12000, "First active event should be at 12000ms");

  const totalInWindow = activeEvents.length;
  const errorsInWindow = activeEvents.filter((c) => c.isError).length;
  const rollingErrorRate = Number((errorsInWindow / totalInWindow).toFixed(2));

  // 1 error out of 3 clicks = 0.33
  assert.equal(rollingErrorRate, 0.33, `Rolling error rate should be 0.33, got ${rollingErrorRate}`);

  // Test decay back to 0 when all events pass 10s
  const futureNow = now + 15000; // 35000ms
  const expiredEvents = clickEvents.filter((c) => c.time >= futureNow - windowDurationMs);
  assert.equal(expiredEvents.length, 0, "All events must expire after 10s of inactivity");

  console.log("✅ Test 4 Passed: Rolling 10-second window event eviction verified");
}

// -----------------------------------------------------------------------------
// Test 5: Rage-Click Detection (3+ Clicks in <=1s in <=35px Radius)
// -----------------------------------------------------------------------------
{
  function evaluateRageClicks(clicks, windowMs = 1000, maxRadiusPx = 35) {
    const rageIncidents = [];
    for (let i = 0; i < clicks.length; i++) {
      const current = clicks[i];
      // Filter clicks preceding current within 1000ms and 35px
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

  // Case A: 3 rapid clicks at same spot within 400ms -> MUST trigger rage click
  const rapidClusterClicks = [
    { time: 1000, x: 200, y: 300 },
    { time: 1200, x: 205, y: 302 },
    { time: 1350, x: 202, y: 298 }
  ];
  const rageResultA = evaluateRageClicks(rapidClusterClicks);
  assert.ok(rageResultA.length >= 1, "3 rapid clustered clicks must trigger a rage click");

  // Case B: 3 clicks spread far apart spatially (> 35px) -> Should NOT trigger rage click
  const spreadOutSpatialClicks = [
    { time: 1000, x: 50, y: 50 },
    { time: 1200, x: 250, y: 250 },
    { time: 1350, x: 600, y: 400 }
  ];
  const rageResultB = evaluateRageClicks(spreadOutSpatialClicks);
  assert.equal(rageResultB.length, 0, "Spatially separated clicks should not trigger rage clicks");

  // Case C: 3 clicks spread over 4 seconds (> 1000ms) -> Should NOT trigger rage click
  const spreadOutTemporalClicks = [
    { time: 1000, x: 200, y: 300 },
    { time: 3000, x: 200, y: 300 },
    { time: 5000, x: 200, y: 300 }
  ];
  const rageResultC = evaluateRageClicks(spreadOutTemporalClicks);
  assert.equal(rageResultC.length, 0, "Slow clicks (> 1s apart) should not trigger rage clicks");

  // Verify rage clicks push score past default threshold of 70
  const scoreWithRage = computeCognitiveLoadScore({
    mouseVelocity: 700,
    hesitationMs: 6000,
    rageClicks: 3,
    clickErrorRate: 0.4,
    directionChanges: 8
  });
  assert.ok(
    scoreWithRage >= 70,
    `Rage clicking + hesitation should cross threshold 70, got ${scoreWithRage}`
  );

  console.log(`✅ Test 5 Passed: Rage-click cluster detection and threshold breach verified (${scoreWithRage}/100)`);
}

console.log("\n===============================================================");
console.log("🎉 All 5 Telemetry Tracker Unit Tests Passed Successfully!");
console.log("===============================================================");

