"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SLIDING_WINDOW_MS = 5000;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Computes instantaneous 0-100 Cognitive Load Score from behavioral telemetry metrics.
 */
export function computeCognitiveLoadScore({
  mouseVelocity,
  hesitationMs,
  rageClicks,
  clickErrorRate
}) {
  const velocityScore = clamp((mouseVelocity / 1600) * 20, 0, 20);
  const hesitationScore = clamp((hesitationMs / 10000) * 30, 0, 30);
  const rageScore = clamp(rageClicks * 18, 0, 45);
  const errorScore = clamp(clickErrorRate * 35, 0, 35);

  return Math.round(
    clamp(velocityScore + hesitationScore + rageScore + errorScore, 0, 100)
  );
}

/**
 * Custom React hook tracking mouse velocity, field hesitation, rage clicks,
 * click-error rate, 5-second sliding window rolling average, mouse trajectory points,
 * and serialized formStateSnapshot on threshold breach.
 */
export function useTelemetry({
  sessionId,
  activeField,
  formContext = {},
  threshold = 70,
  isConnected,
  sendTelemetry,
  streamIntervalMs = 1000
}) {
  const [telemetrySnapshot, setTelemetrySnapshot] = useState({
    metrics: {
      mouseVelocity: 0,
      hesitationMs: 0,
      rageClicks: 0,
      clickErrorRate: 0,
      clickErrorCount: 0
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

  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;

  const sendTelemetryRef = useRef(sendTelemetry);
  sendTelemetryRef.current = sendTelemetry;

  // Trajectory listeners for zero-rerender HTML5 <canvas> heatmap drawing
  const trajectoryListenersRef = useRef(new Set());

  // Sliding window buffer holding { timestamp, score } over the last 5 seconds
  const scoreWindowRef = useRef([]);

  const trackerRef = useRef({
    lastMouseX: null,
    lastMouseY: null,
    lastMouseTime: null,
    cursorX: 0,
    cursorY: 0,
    smoothedVelocity: 0,
    lastInteractionTime: Date.now(),
    recentClicks: [],
    rageClicks: 0,
    totalClicks: 0,
    errorClicks: 0,
    manualOverrideScore: null,
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

  const emitSnapshot = useCallback(
    (overridePayload = null) => {
      const t = trackerRef.current;
      const now = Date.now();
      const hesitationMs = activeFieldRef.current
        ? Math.max(0, now - t.lastInteractionTime)
        : 0;

      const clickErrorRate =
        t.totalClicks > 0
          ? Number((t.errorClicks / t.totalClicks).toFixed(2))
          : 0;

      const metrics = overridePayload?.metrics || {
        mouseVelocity: Math.round(t.smoothedVelocity),
        hesitationMs: Math.round(hesitationMs),
        rageClicks: t.rageClicks,
        clickErrorRate,
        clickErrorCount: t.errorClicks
      };

      const instantScore =
        overridePayload?.instantScore ??
        (t.manualOverrideScore !== null
          ? t.manualOverrideScore
          : computeCognitiveLoadScore(metrics));

      // Sliding Window: keep only samples within the last 5,000 ms
      const cutoff = now - SLIDING_WINDOW_MS;
      scoreWindowRef.current = scoreWindowRef.current.filter(
        (entry) => entry.timestamp >= cutoff
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

      return payload;
    },
    [sessionId, buildFormStateSnapshot]
  );

  // Attach DOM telemetry listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e) => {
      const t = trackerRef.current;
      const nowPerf = performance.now();
      const nowEpoch = Date.now();
      let instantVelocity = 0;

      if (t.lastMouseX !== null && t.lastMouseTime !== null) {
        const dt = (nowPerf - t.lastMouseTime) / 1000;
        if (dt > 0.008) {
          const dx = e.clientX - t.lastMouseX;
          const dy = e.clientY - t.lastMouseY;
          instantVelocity = Math.hypot(dx, dy) / dt;
          t.smoothedVelocity = t.smoothedVelocity * 0.65 + instantVelocity * 0.35;
        }
      }

      t.lastMouseX = e.clientX;
      t.lastMouseY = e.clientY;
      t.cursorX = e.clientX;
      t.cursorY = e.clientY;
      t.lastMouseTime = nowPerf;

      const currentHesitationMs = activeFieldRef.current
        ? Math.max(0, nowEpoch - t.lastInteractionTime)
        : 0;

      // Publish live point to subscribed heatmap canvas overlays
      if (trajectoryListenersRef.current.size > 0) {
        const point = {
          x: e.clientX,
          y: e.clientY,
          velocity: Math.round(t.smoothedVelocity),
          instantVelocity: Math.round(instantVelocity),
          hesitationMs: currentHesitationMs,
          isErratic: t.smoothedVelocity >= 750 || currentHesitationMs >= 4500,
          time: nowEpoch
        };
        for (const listener of trajectoryListenersRef.current) {
          try {
            listener(point);
          } catch {
            // ignore canvas listener exceptions
          }
        }
      }
    };

    const handleKeyDown = () => {
      trackerRef.current.lastInteractionTime = Date.now();
      trackerRef.current.manualOverrideScore = null;
    };

    const handleClick = (e) => {
      const t = trackerRef.current;
      const now = Date.now();
      t.totalClicks += 1;
      t.lastInteractionTime = now;
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

      if (!isInteractive || isInvalidControl) {
        t.errorClicks += 1;
      }

      // Detect rage clicks: >= 3 clicks within 900ms in a 35px radius
      t.recentClicks = t.recentClicks.filter((c) => now - c.time <= 900);
      const nearClicks = t.recentClicks.filter(
        (c) => Math.hypot(c.x - e.clientX, c.y - e.clientY) <= 35
      );

      if (nearClicks.length >= 2) {
        t.rageClicks += 1;
        emitSnapshot();
      }

      t.recentClicks.push({ x: e.clientX, y: e.clientY, time: now });
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

  // Reset hesitation timer whenever user switches active field
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
        clickErrorCount: 5
      };
      trackerRef.current.rageClicks = simulatedMetrics.rageClicks;
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
      cursorX: trackerRef.current.cursorX,
      cursorY: trackerRef.current.cursorY,
      smoothedVelocity: 0,
      lastInteractionTime: Date.now(),
      recentClicks: [],
      rageClicks: 0,
      totalClicks: 0,
      errorClicks: 0,
      manualOverrideScore: null,
      lastSnapshotSentAt: null
    };
    emitSnapshot({
      activeField: activeFieldRef.current,
      metrics: {
        mouseVelocity: 0,
        hesitationMs: 0,
        rageClicks: 0,
        clickErrorRate: 0,
        clickErrorCount: 0
      },
      instantScore: 0,
      fillWindowWithScore: 0
    });
  }, [emitSnapshot]);

  return {
    telemetrySnapshot,
    subscribeTrajectory,
    triggerSimulatedFriction,
    resetTelemetry
  };
}
