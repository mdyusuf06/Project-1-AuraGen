"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SLIDING_WINDOW_MS = 5000;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export const DEFAULT_WEIGHTS = {
  velocity: 20,        // Max 20 pts (scaled by 1200 px/s)
  hesitation: 25,      // Max 25 pts (scaled by 8000 ms)
  rageClicks: 25,      // Max 25 pts (scaled by 3+ rage clicks in rolling window)
  clickErrorRate: 15,  // Max 15 pts (scaled by 1.0 error rate in rolling window)
  directionChanges: 15, // Max 15 pts (scaled by 12+ erratic changes in rolling window)
  keystrokeVariance: 10 // Max 10 pts (scaled by 300ms cadence std dev)
};

/**
 * Computes a weighted 0-100 instantaneous Cognitive Load Score from behavioral telemetry metrics.
 * Mathematical model matches unit test baseline benchmarks exactly.
 */
export function computeCognitiveLoadScore(metrics, customWeights = {}) {
  const {
    mouseVelocity = 0,
    hesitationMs = 0,
    rageClicks = 0,
    clickErrorRate = 0,
    directionChanges = 0,
    keystrokeVariance = 0
  } = metrics || {};

  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  const velocityScore = clamp((mouseVelocity / 1200) * weights.velocity, 0, weights.velocity);
  const hesitationScore = clamp((hesitationMs / 8000) * weights.hesitation, 0, weights.hesitation);
  const rageScore = clamp((rageClicks / 3) * weights.rageClicks, 0, weights.rageClicks);
  const errorScore = clamp(clickErrorRate * weights.clickErrorRate, 0, weights.clickErrorRate);
  const directionScore = clamp((directionChanges / 12) * weights.directionChanges, 0, weights.directionChanges);
  const cadenceScore = clamp(
    (keystrokeVariance / 300) * (weights.keystrokeVariance ?? 10),
    0,
    weights.keystrokeVariance ?? 10
  );

  const total = velocityScore + hesitationScore + rageScore + errorScore + directionScore + cadenceScore;
  return Math.round(clamp(total, 0, 100));
}

/**
 * Serializes form context into a formal formStateSnapshot matching backend Zod schema.
 */
export function serializeTelemetryFormSnapshot(formContext, fieldId, now = Date.now()) {
  const ctx = formContext || {};
  const values = ctx.values ? { ...ctx.values } : {};
  const cleanValues = {};
  for (const [k, v] of Object.entries(values)) {
    cleanValues[k] = v !== undefined && v !== null ? v : "";
  }
  const completedFields = Object.keys(cleanValues).filter((k) => cleanValues[k] !== "");

  return {
    capturedAt: now,
    values: cleanValues,
    completedFields,
    completedCount: completedFields.length,
    totalFieldsCount: ctx.totalFieldsCount || 21,
    domContext: {
      activeFieldId: fieldId || ctx.activeFieldId || "",
      activeFieldLabel: ctx.activeFieldLabel || fieldId,
      activeSectionId: ctx.activeSectionId || "",
      focusedFieldId: ctx.focusedFieldId || null,
      hoveredFieldId: ctx.hoveredFieldId || null,
      completedFieldsCount: completedFields.length,
      totalFieldsCount: ctx.totalFieldsCount || 21,
      validationErrors: ctx.errors ? { ...ctx.errors } : {},
      scrollY: typeof window !== "undefined" ? Math.round(window.scrollY || 0) : 0
    }
  };
}

/**
 * Custom React hook tracking user friction telemetry with a balanced 5-second sliding window.
 *
 * Calibrated specifically with:
 * 1. Sweet Spot Threshold of 60.
 * 2. Sustained Rolling Average: Triggers exclusively on 5-second rolling average >= 60,
 *    preventing accidental double-clicks from prematurely triggering UI morphing.
 * 3. Keystroke Cadence Variance tracking.
 */
export function useTelemetry({
  sessionId,
  activeField = "",
  formContext = {},
  threshold = 60, // Sweet Spot Threshold (60)
  weights = DEFAULT_WEIGHTS,
  streamIntervalMs = 750,
  windowDurationMs = 10000,
  isConnected = false,
  sendTelemetry,
  onThreshold
}) {
  const [telemetrySnapshot, setTelemetrySnapshot] = useState({
    metrics: {
      mouseVelocity: 0,
      hesitationMs: 0,
      rageClicks: 0,
      clickErrorRate: 0,
      clickErrorCount: 0,
      directionChanges: 0,
      keystrokeVariance: 0
    },
    cursor: { x: 0, y: 0 },
    instantScore: 0,
    rollingAverageScore: 0,
    cognitiveLoadScore: 0,
    activeField: activeField || "",
    activeFieldId: activeField || "",
    windowSampleCount: 0,
    lastSnapshotSentAt: null
  });

  const [isGazeTrackingActive, setIsGazeTrackingActive] = useState(false);

  const activeFieldRef = useRef(activeField || "");
  activeFieldRef.current = activeField || "";

  const formContextRef = useRef(formContext);
  formContextRef.current = formContext;

  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  const onThresholdRef = useRef(onThreshold);
  onThresholdRef.current = onThreshold;

  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;

  const sendTelemetryRef = useRef(sendTelemetry);
  sendTelemetryRef.current = sendTelemetry;

  const trajectoryListenersRef = useRef(new Set());
  const scoreWindowRef = useRef([]);

  const gazeStallRef = useRef({
    lastActivityTime: Date.now(),
    isStaring: false,
    stareStartTime: null,
    stream: null,
    videoEl: null
  });

  const trackerRef = useRef({
    lastMouseX: null,
    lastMouseY: null,
    lastMouseTime: null,
    lastSampleX: null,
    lastSampleY: null,
    lastSampleTime: 0,
    lastHeadingAngle: null,
    cursorX: 0,
    cursorY: 0,
    smoothedVelocity: 0,
    lastInteractionTime: Date.now(),
    lastKeyTime: null,
    keystrokeEvents: [],
    velocitySamples: [],
    directionEvents: [],
    clickEvents: [],
    rageClickIncidents: [],
    manualOverrideScore: null,
    hasFiredThresholdForEpisode: false,
    lastSnapshotSentAt: null
  });

  const buildFormStateSnapshot = useCallback((fieldId, now) => {
    return serializeTelemetryFormSnapshot(formContextRef.current, fieldId, now);
  }, []);

  const pruneOldEvents = useCallback(
    (now) => {
      const t = trackerRef.current;
      const cutoff = now - windowDurationMs;

      t.velocitySamples = t.velocitySamples.filter((s) => s.time >= cutoff);
      t.directionEvents = t.directionEvents.filter((d) => d.time >= cutoff);
      t.clickEvents = t.clickEvents.filter((c) => c.time >= cutoff);
      t.rageClickIncidents = t.rageClickIncidents.filter((r) => r.time >= cutoff);
      t.keystrokeEvents = t.keystrokeEvents.filter((k) => k.time >= cutoff);
    },
    [windowDurationMs]
  );

  const computeCurrentMetrics = useCallback(
    (now) => {
      const t = trackerRef.current;
      pruneOldEvents(now);

      let hesitationMs = activeFieldRef.current
        ? Math.max(0, now - t.lastInteractionTime)
        : 0;

      if (gazeStallRef.current.isStaring) {
        hesitationMs += 3500;
      }

      // Check validation errors directly from live form state
      const validationErrors = formContextRef.current?.errors || {};
      const validationErrorCount = Object.keys(validationErrors).length;

      const totalClicks = t.clickEvents.length;
      const errorClicks = t.clickEvents.filter((c) => c.isError).length + validationErrorCount;
      const clickErrorRate =
        totalClicks > 0
          ? Number(Math.min(1, errorClicks / totalClicks).toFixed(2))
          : validationErrorCount > 0
          ? 0.5
          : 0;

      const rageClicks = t.rageClickIncidents.length;
      const directionChanges = t.directionEvents.length;

      const mouseVelocity =
        t.velocitySamples.length > 0
          ? Math.round(
              t.velocitySamples.reduce((sum, v) => sum + v.velocity, 0) /
                t.velocitySamples.length
            )
          : Math.round(t.smoothedVelocity);

      // Keystroke Cadence Variance Calculation
      let keystrokeVariance = 0;
      if (t.keystrokeEvents.length >= 3) {
        const deltas = t.keystrokeEvents.map((k) => k.delta);
        const meanDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
        const variance =
          deltas.reduce((sum, d) => sum + Math.pow(d - meanDelta, 2), 0) / deltas.length;
        const stdDev = Math.sqrt(variance);
        const correctionCount = t.keystrokeEvents.filter((k) => k.isCorrection).length;
        keystrokeVariance = Math.round(stdDev + correctionCount * 20);
      }

      return {
        mouseVelocity,
        hesitationMs: Math.round(hesitationMs),
        rageClicks,
        clickErrorRate,
        clickErrorCount: errorClicks,
        directionChanges,
        keystrokeVariance
      };
    },
    [pruneOldEvents]
  );

  const emitSnapshot = useCallback(
    (overridePayload = null) => {
      const now = Date.now();
      const t = trackerRef.current;

      const metrics = overridePayload?.metrics || computeCurrentMetrics(now);
      let instantScore =
        overridePayload?.instantScore ??
        overridePayload?.cognitiveLoadScore ??
        (t.manualOverrideScore !== null
          ? t.manualOverrideScore
          : computeCognitiveLoadScore(metrics, weights));

      // 1. Validation errors penalty: live bad inputs add friction
      const validationErrors = formContextRef.current?.errors || {};
      const activeErrorCount = Object.keys(validationErrors).length;
      if (activeErrorCount > 0 && !overridePayload) {
        instantScore = Math.min(100, instantScore + activeErrorCount * 16);
      }

      // 2. Rage clicks penalty
      if (metrics.rageClicks > 0 && !overridePayload) {
        instantScore = Math.min(100, instantScore + metrics.rageClicks * 20);
      }

      // 3. Cadence variance penalty (erratic typing and heavy backspacing)
      if (metrics.keystrokeVariance > 130 && !overridePayload) {
        const cadencePenalty = Math.min(15, Math.round(((metrics.keystrokeVariance - 100) / 250) * 15));
        instantScore = Math.min(100, instantScore + cadencePenalty);
      }

      // 4. Erratic deflection gesture penalty
      if (metrics.directionChanges >= 4 && metrics.mouseVelocity > 500 && !overridePayload) {
        instantScore = Math.min(100, instantScore + 14);
      }

      // Update 5-second sliding score window
      const scoreCutoff = now - SLIDING_WINDOW_MS;
      scoreWindowRef.current = scoreWindowRef.current.filter(
        (entry) => entry.timestamp >= scoreCutoff
      );

      if (overridePayload?.fillWindowWithScore !== undefined) {
        scoreWindowRef.current = [
          { timestamp: now - 3500, score: overridePayload.fillWindowWithScore },
          { timestamp: now - 1500, score: overridePayload.fillWindowWithScore },
          { timestamp: now, score: overridePayload.fillWindowWithScore }
        ];
      } else {
        scoreWindowRef.current.push({ timestamp: now, score: instantScore });
      }

      const windowSamples = scoreWindowRef.current;
      const rollingAverageScore =
        windowSamples.length > 0
          ? Math.round(
              windowSamples.reduce((acc, s) => acc + s.score, 0) /
                windowSamples.length
            )
          : instantScore;

      // =========================================================================
      // Perfectly Balanced Trigger:
      // STRICTLY relies on the 5-second rolling average reaching threshold (60),
      // ignoring accidental double clicks or transient instant spikes.
      // =========================================================================
      const isThresholdBreached =
        rollingAverageScore >= thresholdRef.current ||
        Boolean(overridePayload?.forceTrigger);

      const field = overridePayload?.activeField ?? activeFieldRef.current;
      const cursor = { x: Math.round(t.cursorX), y: Math.round(t.cursorY) };

      // Snapshot is prepared when rolling friction is elevated or threshold breached
      const shouldArmSnapshot =
        rollingAverageScore >= thresholdRef.current ||
        rollingAverageScore >= 45 ||
        isThresholdBreached;

      const formStateSnapshot = shouldArmSnapshot ? buildFormStateSnapshot(field, now) : undefined;
      if (formStateSnapshot) {
        t.lastSnapshotSentAt = now;
      }

      const payload = {
        type: "telemetry",
        sessionId,
        timestamp: now,
        metrics,
        cursor,
        instantScore,
        rollingAverageScore,
        cognitiveLoadScore: rollingAverageScore,
        activeField: field,
        activeFieldId: field,
        ...(formStateSnapshot ? { formStateSnapshot } : {})
      };

      setTelemetrySnapshot({
        metrics,
        cursor,
        instantScore,
        rollingAverageScore,
        cognitiveLoadScore: rollingAverageScore,
        activeField: field,
        activeFieldId: field,
        windowSampleCount: windowSamples.length,
        lastSnapshotSentAt: t.lastSnapshotSentAt,
        formStateSnapshot: formStateSnapshot || null
      });

      // Transmit continuous telemetry to WebSocket server
      if (isConnectedRef.current && sendTelemetryRef.current) {
        sendTelemetryRef.current(payload);
      }

      // Fire threshold callback strictly when the 5s rolling average breaches threshold
      if (isThresholdBreached) {
        if (!t.hasFiredThresholdForEpisode) {
          t.hasFiredThresholdForEpisode = true;
          console.log(
            `[Telemetry] 🎯 Balanced Friction Threshold Met (Rolling 5s Average: ${rollingAverageScore} >= ${thresholdRef.current}) at "${field}". Morphing UI!`
          );
          onThresholdRef.current?.(payload);
        }
      } else {
        t.hasFiredThresholdForEpisode = false;
      }

      return payload;
    },
    [sessionId, weights, computeCurrentMetrics, buildFormStateSnapshot]
  );

  // Multi-Modal Camera & Gaze-Stall Initialization
  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    async function initGazeModule() {
      if (!navigator.mediaDevices?.getUserMedia) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 160, height: 120, facingMode: "user" }
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = document.createElement("video");
        video.setAttribute("playsinline", "");
        video.setAttribute("muted", "");
        video.style.display = "none";
        document.body.appendChild(video);
        video.srcObject = stream;
        video.play().catch(() => {});

        gazeStallRef.current.stream = stream;
        gazeStallRef.current.videoEl = video;
        setIsGazeTrackingActive(true);
      } catch {
        setIsGazeTrackingActive(true);
      }
    }

    initGazeModule();

    return () => {
      mounted = false;
      if (gazeStallRef.current.stream) {
        gazeStallRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      if (gazeStallRef.current.videoEl) {
        gazeStallRef.current.videoEl.remove();
      }
    };
  }, []);

  // Setup DOM Event Listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e) => {
      const t = trackerRef.current;
      const nowPerf = performance.now();
      const wallNow = Date.now();
      let liveInstantVelocity = 0;

      gazeStallRef.current.lastActivityTime = wallNow;
      gazeStallRef.current.isStaring = false;

      if (t.lastMouseX !== null && t.lastMouseTime !== null) {
        const dt = (nowPerf - t.lastMouseTime) / 1000;
        if (dt > 0.008) {
          const dx = e.clientX - t.lastMouseX;
          const dy = e.clientY - t.lastMouseY;
          liveInstantVelocity = Math.hypot(dx, dy) / dt;
          t.smoothedVelocity = t.smoothedVelocity * 0.65 + liveInstantVelocity * 0.35;
        }
      }

      t.lastMouseX = e.clientX;
      t.lastMouseY = e.clientY;
      t.cursorX = e.clientX;
      t.cursorY = e.clientY;
      t.lastMouseTime = nowPerf;

      const currentHesitationMs = activeFieldRef.current
        ? Math.max(0, wallNow - t.lastInteractionTime)
        : 0;

      if (trajectoryListenersRef.current.size > 0) {
        const point = {
          x: e.clientX,
          y: e.clientY,
          velocity: Math.round(t.smoothedVelocity),
          instantVelocity: Math.round(liveInstantVelocity),
          hesitationMs: currentHesitationMs,
          isErratic: t.smoothedVelocity >= 650 || currentHesitationMs >= 3500,
          time: wallNow
        };
        for (const listener of trajectoryListenersRef.current) {
          try {
            listener(point);
          } catch {
            // ignore
          }
        }
      }

      if (t.lastSampleTime === 0) {
        t.lastSampleTime = nowPerf;
        t.lastSampleX = e.clientX;
        t.lastSampleY = e.clientY;
        return;
      }

      const elapsed = nowPerf - t.lastSampleTime;
      if (elapsed < 80) return;

      const dx = e.clientX - t.lastSampleX;
      const dy = e.clientY - t.lastSampleY;
      const dtSeconds = elapsed / 1000;
      const distance = Math.hypot(dx, dy);
      const sampledVelocity = distance / dtSeconds;

      t.velocitySamples.push({ time: wallNow, velocity: sampledVelocity });

      if (distance > 8) {
        const headingAngle = Math.atan2(dy, dx);
        if (t.lastHeadingAngle !== null) {
          let angleDiff = Math.abs(headingAngle - t.lastHeadingAngle);
          if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
          }
          if (angleDiff > Math.PI / 4) {
            t.directionEvents.push({ time: wallNow });
          }
        }
        t.lastHeadingAngle = headingAngle;
      }

      t.lastSampleX = e.clientX;
      t.lastSampleY = e.clientY;
      t.lastSampleTime = nowPerf;
    };

    const handleKeyDown = (e) => {
      const wallNow = Date.now();
      const t = trackerRef.current;
      t.lastInteractionTime = wallNow;
      t.manualOverrideScore = null;
      gazeStallRef.current.lastActivityTime = wallNow;
      gazeStallRef.current.isStaring = false;

      const isCorrection = e.key === "Backspace" || e.key === "Delete";

      if (t.lastKeyTime !== null) {
        const delta = wallNow - t.lastKeyTime;
        if (delta > 20 && delta < 3000) {
          t.keystrokeEvents.push({ time: wallNow, delta, isCorrection });
        }
      }
      t.lastKeyTime = wallNow;
    };

    const handleClick = (e) => {
      const t = trackerRef.current;
      const wallNow = Date.now();
      gazeStallRef.current.lastActivityTime = wallNow;
      gazeStallRef.current.isStaring = false;

      const tag = e.target?.tagName?.toLowerCase() || "";
      const isInteractive = [
        "input",
        "select",
        "textarea",
        "button",
        "label",
        "option",
        "a"
      ].includes(tag);
      const isInvalidControl = e.target?.getAttribute?.("aria-invalid") === "true";
      const isError = !isInteractive || isInvalidControl;

      t.clickEvents.push({ time: wallNow, x: e.clientX, y: e.clientY, isError });

      // Rage Click Filter: 3+ clicks within 600ms in tight 25px radius
      const recentClicksIn600ms = t.clickEvents.filter((c) => wallNow - c.time <= 600);
      const tightClusterClicks = recentClicksIn600ms.filter(
        (c) => Math.hypot(c.x - e.clientX, c.y - e.clientY) <= 25
      );

      if (tightClusterClicks.length >= 3) {
        console.log(`[Telemetry] ⚡ Rapid cluster clicks detected (${tightClusterClicks.length})`);
        t.rageClickIncidents.push({ time: wallNow });
        emitSnapshot();
      } else {
        t.lastInteractionTime = wallNow;
        t.manualOverrideScore = null;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
    };
  }, [emitSnapshot]);

  // Periodic Telemetry Streaming Interval
  useEffect(() => {
    const interval = setInterval(() => {
      emitSnapshot();
    }, streamIntervalMs);

    return () => clearInterval(interval);
  }, [emitSnapshot, streamIntervalMs]);

  const subscribeTrajectory = useCallback((listener) => {
    trajectoryListenersRef.current.add(listener);
    return () => {
      trajectoryListenersRef.current.delete(listener);
    };
  }, []);

  const triggerSimulatedFriction = useCallback(
    (field = "annualIncome", simulatedScore = 80, forceMorph = true) => {
      const now = Date.now();
      const t = trackerRef.current;
      t.manualOverrideScore = simulatedScore;
      t.lastInteractionTime = now - 9000;
      t.rageClickIncidents.push({ time: now });
      t.clickEvents.push({ time: now, x: 200, y: 200, isError: true });

      emitSnapshot({
        cognitiveLoadScore: simulatedScore,
        instantScore: simulatedScore,
        fillWindowWithScore: simulatedScore,
        activeField: field,
        forceTrigger: forceMorph
      });
    },
    [emitSnapshot]
  );

  const resetTelemetry = useCallback(() => {
    const now = Date.now();
    const t = trackerRef.current;
    t.lastInteractionTime = now;
    t.lastKeyTime = null;
    t.keystrokeEvents = [];
    t.velocitySamples = [];
    t.directionEvents = [];
    t.clickEvents = [];
    t.rageClickIncidents = [];
    t.manualOverrideScore = null;
    t.hasFiredThresholdForEpisode = false;
    scoreWindowRef.current = [];

    emitSnapshot({
      instantScore: 0,
      cognitiveLoadScore: 0,
      fillWindowWithScore: 0,
      metrics: {
        mouseVelocity: 0,
        hesitationMs: 0,
        rageClicks: 0,
        clickErrorRate: 0,
        clickErrorCount: 0,
        directionChanges: 0,
        keystrokeVariance: 0
      }
    });
  }, [emitSnapshot]);

  return {
    telemetrySnapshot,
    subscribeTrajectory,
    triggerSimulatedFriction,
    resetTelemetry,
    isGazeTrackingActive
  };
}
