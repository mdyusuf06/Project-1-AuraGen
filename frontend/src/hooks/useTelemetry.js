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
  directionChanges: 15 // Max 15 pts (scaled by 12+ erratic changes in rolling window)
};

/**
 * Computes a weighted 0-100 instantaneous Cognitive Load Score from behavioral telemetry metrics.
 */
export function computeCognitiveLoadScore(metrics, customWeights = {}) {
  const {
    mouseVelocity = 0,
    hesitationMs = 0,
    rageClicks = 0,
    clickErrorRate = 0,
    directionChanges = 0
  } = metrics || {};

  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  const velocityScore = clamp((mouseVelocity / 1200) * weights.velocity, 0, weights.velocity);
  const hesitationScore = clamp((hesitationMs / 8000) * weights.hesitation, 0, weights.hesitation);
  const rageScore = clamp((rageClicks / 3) * weights.rageClicks, 0, weights.rageClicks);
  const errorScore = clamp(clickErrorRate * weights.clickErrorRate, 0, weights.clickErrorRate);
  const directionScore = clamp((directionChanges / 12) * weights.directionChanges, 0, weights.directionChanges);

  const total = velocityScore + hesitationScore + rageScore + errorScore + directionScore;
  return Math.round(clamp(total, 0, 100));
}

/**
 * Custom React hook tracking user friction telemetry over a rolling 10-second event window
 * and a 5-second sliding score window.
 *
 * Features:
 * - Mouse velocity, erratic direction changes (> 45 deg), hesitation, rage clicks & click-error rate
 * - 5s sliding window rolling average (`rollingAverageScore`) + `instantScore`
 * - `formStateSnapshot` serialization (values + DOM context) when cognitive load threshold is breached
 * - Zero-rerender trajectory subscription (`subscribeTrajectory`) for live HTML5 <canvas> heatmap
 * - `onThreshold` callback invoked once per threshold breach episode
 */
export function useTelemetry({
  sessionId,
  activeField = "",
  formContext = {},
  threshold = 70,
  weights = DEFAULT_WEIGHTS,
  streamIntervalMs = 1000,
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
      directionChanges: 0
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

  // Trajectory listeners for zero-rerender HTML5 <canvas> heatmap drawing
  const trajectoryListenersRef = useRef(new Set());

  // 5-second sliding window buffer holding { timestamp, score }
  const scoreWindowRef = useRef([]);

  // Tracker state holding rolling 10s event buffers + cursor telemetry
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
    velocitySamples: [],
    directionEvents: [],
    clickEvents: [],        // { time, x, y, isError }
    rageClickIncidents: [], // { time }
    manualOverrideScore: null,
    hasFiredThresholdForEpisode: false,
    lastSnapshotSentAt: null
  });

  const buildFormStateSnapshot = useCallback((fieldId, now) => {
    const ctx = formContextRef.current || {};
    const values = ctx.values ? { ...ctx.values } : {};
    const completedFieldsCount = Object.values(values).filter(
      (v) => v !== "" && v !== null && v !== undefined
    ).length;

    return {
      capturedAt: now,
      values,
      domContext: {
        activeFieldId: fieldId,
        activeFieldLabel: ctx.activeFieldLabel || fieldId,
        activeSectionId: ctx.activeSectionId || "",
        completedFieldsCount,
        totalFieldsCount: ctx.totalFieldsCount || 21,
        validationErrors: ctx.errors ? { ...ctx.errors } : {},
        scrollY: typeof window !== "undefined" ? Math.round(window.scrollY || 0) : 0
      }
    };
  }, []);

  // Prune events outside the rolling event window (default 10s)
  const pruneOldEvents = useCallback(
    (now) => {
      const t = trackerRef.current;
      const cutoff = now - windowDurationMs;

      t.velocitySamples = t.velocitySamples.filter((s) => s.time >= cutoff);
      t.directionEvents = t.directionEvents.filter((d) => d.time >= cutoff);
      t.clickEvents = t.clickEvents.filter((c) => c.time >= cutoff);
      t.rageClickIncidents = t.rageClickIncidents.filter((r) => r.time >= cutoff);
    },
    [windowDurationMs]
  );

  // Compute metrics snapshot over the rolling window
  const computeCurrentMetrics = useCallback(
    (now) => {
      const t = trackerRef.current;
      pruneOldEvents(now);

      const hesitationMs = activeFieldRef.current
        ? Math.max(0, now - t.lastInteractionTime)
        : 0;

      const totalClicks = t.clickEvents.length;
      const errorClicks = t.clickEvents.filter((c) => c.isError).length;
      const clickErrorRate =
        totalClicks > 0 ? Number((errorClicks / totalClicks).toFixed(2)) : 0;

      const rageClicks = t.rageClickIncidents.length;
      const directionChanges = t.directionEvents.length;

      const mouseVelocity =
        t.velocitySamples.length > 0
          ? Math.round(
              t.velocitySamples.reduce((sum, v) => sum + v.velocity, 0) /
                t.velocitySamples.length
            )
          : Math.round(t.smoothedVelocity);

      return {
        mouseVelocity,
        hesitationMs: Math.round(hesitationMs),
        rageClicks,
        clickErrorRate,
        clickErrorCount: errorClicks,
        directionChanges
      };
    },
    [pruneOldEvents]
  );

  // Emits snapshot to state, invokes onThreshold on breach, and streams via WebSocket
  const emitSnapshot = useCallback(
    (overridePayload = null) => {
      const now = Date.now();
      const t = trackerRef.current;

      const metrics = overridePayload?.metrics || computeCurrentMetrics(now);
      const instantScore =
        overridePayload?.instantScore ??
        overridePayload?.cognitiveLoadScore ??
        (t.manualOverrideScore !== null
          ? t.manualOverrideScore
          : computeCognitiveLoadScore(metrics, weights));

      // 5-second Sliding Window calculation for smoothed rollingAverageScore
      const scoreCutoff = now - SLIDING_WINDOW_MS;
      scoreWindowRef.current = scoreWindowRef.current.filter(
        (entry) => entry.timestamp >= scoreCutoff
      );

      if (overridePayload?.fillWindowWithScore !== undefined) {
        scoreWindowRef.current = [
          { timestamp: now - 1000, score: overridePayload.fillWindowWithScore },
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

      const field = overridePayload?.activeField ?? activeFieldRef.current;
      const cursor = { x: Math.round(t.cursorX), y: Math.round(t.cursorY) };
      const isThresholdBreached = rollingAverageScore >= thresholdRef.current;

      // Serialize form values & DOM context whenever cognitive load threshold is breached
      const formStateSnapshot = isThresholdBreached
        ? buildFormStateSnapshot(field, now)
        : undefined;

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
        lastSnapshotSentAt: t.lastSnapshotSentAt
      });

      if (isConnectedRef.current && sendTelemetryRef.current) {
        sendTelemetryRef.current(payload);
      }

      // Trigger onThreshold callback once per breach episode
      if (isThresholdBreached) {
        if (!t.hasFiredThresholdForEpisode) {
          t.hasFiredThresholdForEpisode = true;
          onThresholdRef.current?.(payload);
        }
      } else {
        t.hasFiredThresholdForEpisode = false;
      }

      return payload;
    },
    [sessionId, weights, computeCurrentMetrics, buildFormStateSnapshot]
  );

  // Setup DOM event listeners (smooth trajectory heatmap + 100ms sampling for direction/velocity)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e) => {
      const t = trackerRef.current;
      const nowPerf = performance.now();
      const wallNow = Date.now();
      let liveInstantVelocity = 0;

      // High-frequency velocity update for smooth canvas trajectory heatmap
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

      // Publish live point to subscribed HTML5 <canvas> heatmap overlays
      if (trajectoryListenersRef.current.size > 0) {
        const point = {
          x: e.clientX,
          y: e.clientY,
          velocity: Math.round(t.smoothedVelocity),
          instantVelocity: Math.round(liveInstantVelocity),
          hesitationMs: currentHesitationMs,
          isErratic: t.smoothedVelocity >= 750 || currentHesitationMs >= 4500,
          time: wallNow
        };
        for (const listener of trajectoryListenersRef.current) {
          try {
            listener(point);
          } catch {
            // ignore canvas listener exceptions
          }
        }
      }

      // 100ms sampling for rolling window velocity & erratic direction changes
      if (t.lastSampleTime === 0) {
        t.lastSampleTime = nowPerf;
        t.lastSampleX = e.clientX;
        t.lastSampleY = e.clientY;
        return;
      }

      const elapsed = nowPerf - t.lastSampleTime;
      if (elapsed < 100) return;

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
          // Deflection > 45 degrees signifies erratic direction change
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

    const handleKeyDown = () => {
      trackerRef.current.lastInteractionTime = Date.now();
      trackerRef.current.manualOverrideScore = null;
    };

    const handleClick = (e) => {
      const t = trackerRef.current;
      const wallNow = Date.now();
      t.lastInteractionTime = wallNow;
      t.manualOverrideScore = null;

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
      const isInvalidControl =
        e.target?.getAttribute?.("aria-invalid") === "true";
      const isError = !isInteractive || isInvalidControl;

      t.clickEvents.push({ time: wallNow, x: e.clientX, y: e.clientY, isError });

      // Rage click detection: >= 3 clicks within 1000ms in a 35px radius
      const recentClicksInArea = t.clickEvents.filter(
        (c) =>
          wallNow - c.time <= 1000 &&
          Math.hypot(c.x - e.clientX, c.y - e.clientY) <= 35
      );

      if (recentClicksInArea.length >= 3) {
        t.rageClickIncidents.push({ time: wallNow });
        emitSnapshot();
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });

    const intervalId = setInterval(() => {
      trackerRef.current.smoothedVelocity *= 0.55;
      emitSnapshot();
    }, streamIntervalMs);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
      clearInterval(intervalId);
    };
  }, [emitSnapshot, streamIntervalMs]);

  // Reset hesitation timer when field focus switches
  useEffect(() => {
    trackerRef.current.lastInteractionTime = Date.now();
  }, [activeField]);

  const subscribeTrajectory = useCallback((listener) => {
    if (typeof listener !== "function") return () => {};
    trajectoryListenersRef.current.add(listener);
    return () => {
      trajectoryListenersRef.current.delete(listener);
    };
  }, []);

  const triggerSimulatedFriction = useCallback(
    (field = "annualIncome", score = 88) => {
      const simulatedMetrics = {
        mouseVelocity: 840,
        hesitationMs: 11500,
        rageClicks: 5,
        clickErrorRate: 0.42,
        clickErrorCount: 5,
        directionChanges: 14
      };
      trackerRef.current.smoothedVelocity = simulatedMetrics.mouseVelocity;
      trackerRef.current.manualOverrideScore = score;

      return emitSnapshot({
        activeField: field,
        metrics: simulatedMetrics,
        instantScore: score,
        fillWindowWithScore: score
      });
    },
    [emitSnapshot]
  );

  const resetTelemetry = useCallback(() => {
    scoreWindowRef.current = [];
    trackerRef.current = {
      lastMouseX: null,
      lastMouseY: null,
      lastMouseTime: null,
      lastSampleX: null,
      lastSampleY: null,
      lastSampleTime: 0,
      lastHeadingAngle: null,
      cursorX: trackerRef.current.cursorX,
      cursorY: trackerRef.current.cursorY,
      smoothedVelocity: 0,
      lastInteractionTime: Date.now(),
      velocitySamples: [],
      directionEvents: [],
      clickEvents: [],
      rageClickIncidents: [],
      manualOverrideScore: null,
      hasFiredThresholdForEpisode: false,
      lastSnapshotSentAt: null
    };

    emitSnapshot({
      activeField: activeFieldRef.current,
      metrics: {
        mouseVelocity: 0,
        hesitationMs: 0,
        rageClicks: 0,
        clickErrorRate: 0,
        clickErrorCount: 0,
        directionChanges: 0
      },
      instantScore: 0,
      fillWindowWithScore: 0
    });
  }, [emitSnapshot]);

  const score = telemetrySnapshot.cognitiveLoadScore;
  const isFrustrated = score >= threshold;

  return {
    metrics: telemetrySnapshot.metrics,
    score,
    activeField: telemetrySnapshot.activeField,
    isFrustrated,
    telemetrySnapshot,
    subscribeTrajectory,
    triggerSimulatedFriction,
    resetTelemetry
  };
}
