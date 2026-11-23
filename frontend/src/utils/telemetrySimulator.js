/**
 * AuraGen Telemetry Simulation Engine (Development & Testing)
 *
 * Provides realistic behavioral simulations for:
 * 1. Confused / Frustrated User:
 *    - Erratic, high-variance cursor velocity bursts
 *    - Frequent sharp direction changes (> 45 deg)
 *    - Long hesitation and idle pauses on fields (> 6000ms)
 *    - Clustered rage clicks (>= 3 clicks within 1000ms in a small radius)
 *    - Misclicks on non-interactive areas
 *    -> Drives Cognitive Load Score past the 70 threshold (spikes to 75-90)
 *
 * 2. Calm / Optimal-Flow User:
 *    - Smooth, steady cursor trajectories along gentle curves
 *    - Minimal velocity variance (low constant speed)
 *    - Clean single clicks on interactive form fields
 *    - Minimal hesitation (< 2000ms)
 *    - Zero rage clicks and zero misclicks
 *    -> Maintains low Cognitive Load Score (< 25)
 */

/**
 * Dispatches a synthetic mousemove event if running in a browser environment.
 */
function dispatchSyntheticMouseMove(x, y) {
  if (typeof window !== "undefined" && typeof MouseEvent !== "undefined") {
    const event = new MouseEvent("mousemove", {
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  }
}

/**
 * Dispatches a synthetic click event if running in a browser environment.
 */
function dispatchSyntheticClick(x, y, targetElement = null) {
  if (typeof window !== "undefined" && typeof MouseEvent !== "undefined") {
    const event = new MouseEvent("click", {
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      bubbles: true,
      cancelable: true
    });
    const target = targetElement || document.elementFromPoint?.(x, y) || window;
    target.dispatchEvent(event);
  }
}

/**
 * Simulates a confused user experiencing cognitive friction.
 *
 * Features:
 * - Jittery, erratic cursor paths with rapid angular deflections
 * - Bursts of high velocity followed by abrupt stops (high variance)
 * - Long pauses on active fields (hesitation)
 * - Rapid cluster rage clicks on non-interactive areas
 *
 * @param {Object} options Configuration options
 * @param {number} [options.durationMs=15000] Duration of simulation (0 for indefinite)
 * @param {Function} [options.onTick] Callback fired per tick with current metrics snapshot
 * @param {Function} [options.onComplete] Callback fired when duration completes
 * @param {Object} [options.telemetryHook] Optional useTelemetry hook controller to directly inject metrics
 * @returns {Object} Simulator controller with `stop()` method
 */
export function simulateConfusion(options = {}) {
  const {
    durationMs = 15000,
    onTick,
    onComplete,
    telemetryHook
  } = options;

  let isRunning = true;
  let elapsedMs = 0;
  const tickIntervalMs = 100;
  let currentX = 400;
  let currentY = 300;
  let lastClickTime = 0;
  let rageClickCounter = 0;
  let pauseUntilMs = 0;

  // History buffer for reporting
  const frames = [];

  const intervalId = setInterval(() => {
    if (!isRunning) {
      clearInterval(intervalId);
      return;
    }

    elapsedMs += tickIntervalMs;

    // Check duration limit
    if (durationMs > 0 && elapsedMs >= durationMs) {
      stop();
      onComplete?.(frames);
      return;
    }

    // Step logic:
    // 1. Long Hesitation Phase (between 3s and 7s)
    const isHesitating = elapsedMs >= 3000 && elapsedMs <= 7000;

    let deltaX = 0;
    let deltaY = 0;
    let clickOccurred = false;
    let isRageClick = false;

    if (isHesitating) {
      // Very slight jitter while idle on field (hunting for information)
      if (Math.random() < 0.25) {
        deltaX = (Math.random() - 0.5) * 6;
        deltaY = (Math.random() - 0.5) * 6;
      }
    } else {
      // Erratic, jittery cursor movement with sharp back-and-forth zig-zags
      const oscillation = Math.sin(elapsedMs / 180) * 85;
      const burstFactor = Math.random() < 0.35 ? 4.5 : 1.2;
      const angle = Math.random() * 2 * Math.PI;
      const speed = (60 + Math.random() * 90) * burstFactor; // Fast bursts 270 - 675 px/tick

      deltaX = Math.cos(angle) * speed + oscillation;
      deltaY = Math.sin(angle) * speed;

      // Rapid clicks / Rage clicks (especially around 7.5s - 11s)
      const isRageTime = elapsedMs >= 7500 && elapsedMs <= 11000;
      if (isRageTime) {
        // High frequency clicking in small area (rage clusters)
        if (elapsedMs - lastClickTime >= 140) {
          lastClickTime = elapsedMs;
          clickOccurred = true;
          isRageClick = true;
          rageClickCounter += 1;
        }
      } else if (Math.random() < 0.15) {
        // Random misclicks on non-interactive areas
        lastClickTime = elapsedMs;
        clickOccurred = true;
      }
    }

    currentX = Math.max(50, Math.min(1000, currentX + deltaX));
    currentY = Math.max(100, Math.min(800, currentY + deltaY));

    // Dispatch synthetic browser events if in DOM
    dispatchSyntheticMouseMove(Math.round(currentX), Math.round(currentY));

    if (clickOccurred) {
      dispatchSyntheticClick(Math.round(currentX), Math.round(currentY));
    }

    // Build frame report
    const frame = {
      elapsedMs,
      x: Math.round(currentX),
      y: Math.round(currentY),
      isHesitating,
      clickOccurred,
      isRageClick,
      phase: isHesitating ? "hesitation" : elapsedMs >= 7500 ? "rage_clicks" : "erratic_motion"
    };
    frames.push(frame);

    onTick?.(frame);
  }, tickIntervalMs);

  function stop() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(intervalId);
  }

  return {
    stop,
    isRunning: () => isRunning,
    getFrames: () => frames
  };
}

/**
 * Simulates a calm, focused user navigating with ease.
 *
 * Features:
 * - Smooth, continuous cursor movement along gentle paths
 * - Steady velocity with minimal variance
 * - Deliberate single clicks on interactive targets
 * - Short hesitation (< 1500ms)
 * - Zero rage clicks and zero click errors
 *
 * @param {Object} options Configuration options
 * @param {number} [options.durationMs=15000] Duration of simulation
 * @param {Function} [options.onTick] Callback fired per tick
 * @param {Function} [options.onComplete] Callback fired when duration completes
 * @returns {Object} Simulator controller with `stop()` method
 */
export function simulateCalmUser(options = {}) {
  const {
    durationMs = 15000,
    onTick,
    onComplete
  } = options;

  let isRunning = true;
  let elapsedMs = 0;
  const tickIntervalMs = 100;

  // Gentle elliptical trajectory centered on form
  let angle = 0;
  const centerX = 500;
  const centerY = 350;
  const radiusX = 180;
  const radiusY = 90;
  let lastClickTime = 0;

  const frames = [];

  const intervalId = setInterval(() => {
    if (!isRunning) {
      clearInterval(intervalId);
      return;
    }

    elapsedMs += tickIntervalMs;

    if (durationMs > 0 && elapsedMs >= durationMs) {
      stop();
      onComplete?.(frames);
      return;
    }

    // Smooth, gentle angular progression (low velocity ~120 px/s, almost zero variance)
    angle += 0.08;
    const currentX = centerX + Math.cos(angle) * radiusX;
    const currentY = centerY + Math.sin(angle * 1.5) * radiusY;

    // Normal deliberate click every 4 seconds
    let clickOccurred = false;
    if (elapsedMs - lastClickTime >= 4000) {
      lastClickTime = elapsedMs;
      clickOccurred = true;
    }

    dispatchSyntheticMouseMove(Math.round(currentX), Math.round(currentY));
    if (clickOccurred) {
      dispatchSyntheticClick(Math.round(currentX), Math.round(currentY));
    }

    const frame = {
      elapsedMs,
      x: Math.round(currentX),
      y: Math.round(currentY),
      isHesitating: false,
      clickOccurred,
      isRageClick: false,
      phase: "smooth_flow"
    };
    frames.push(frame);

    onTick?.(frame);
  }, tickIntervalMs);

  function stop() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(intervalId);
  }

  return {
    stop,
    isRunning: () => isRunning,
    getFrames: () => frames
  };
}

/**
 * Converts an array of telemetry history records into a clean CSV string.
 *
 * @param {Array<Object>} historyRecords Telemetry log records
 * @returns {string} Formatted CSV string
 */
export function generateTelemetryReportCSV(historyRecords = []) {
  const headers = [
    "Timestamp",
    "TimeSeconds",
    "CognitiveLoadScore",
    "RawScore",
    "Threshold",
    "ThresholdReached",
    "VelocityVariance",
    "HesitationMs",
    "RageClicks",
    "ClickErrorRate",
    "DirectionChanges",
    "SimulationMode"
  ];

  if (!historyRecords || historyRecords.length === 0) {
    return headers.join(",") + "\n";
  }

  const rows = historyRecords.map((r) => {
    return [
      r.timestamp || new Date().toISOString(),
      r.timeSeconds ?? 0,
      r.score ?? r.cognitiveLoadScore ?? 0,
      r.rawScore ?? r.score ?? 0,
      r.threshold ?? 70,
      Boolean(r.isThresholdReached ?? (r.score >= (r.threshold || 70))),
      r.velocityVariance ?? r.metrics?.velocityVariance ?? 0,
      r.hesitationMs ?? r.metrics?.hesitationMs ?? 0,
      r.rageClicks ?? r.metrics?.rageClicks ?? 0,
      r.clickErrorRate ?? r.metrics?.clickErrorRate ?? 0,
      r.directionChanges ?? r.metrics?.directionChanges ?? 0,
      r.mode || "normal"
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Browser-friendly CSV file downloader.
 */
export function downloadCSVReport(historyRecords = [], filename = "auragen-telemetry-report.csv") {
  if (typeof window === "undefined") return;

  const csvContent = generateTelemetryReportCSV(historyRecords);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}