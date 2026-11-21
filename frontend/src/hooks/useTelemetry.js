"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  simulateConfusion as runSimulateConfusion,
  simulateCalmUser as runSimulateCalmUser,
  generateTelemetryReportCSV,
  downloadCSVReport
} from "../utils/telemetrySimulator.js";

// Re-export simulation utilities for external access
export {
  runSimulateConfusion as simulateConfusion,
  runSimulateCalmUser as simulateCalmUser,
  generateTelemetryReportCSV,
  downloadCSVReport
};

const SLIDING_WINDOW_MS = 5000;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Week 2 Calibrated Cognitive Load Weights:
 * - Velocity variance: 0.25 (25 pts)
 * - Direction changes: 0.20 (20 pts)
 * - Hesitation: 0.25 (25 pts)
 * - Rage clicks: 0.20 (20 pts)
 * - Click errors: 0.10 (10 pts)
 * Total: 100 pts
 */
export const DEFAULT_WEIGHTS = {
  velocityVariance: 25, // 0.25 (scaled by standard deviation ~600 px/s or variance ~360,000)
  directionChanges: 20, // 0.20 (scaled by 12+ erratic changes in rolling window)
  hesitation: 25,       // 0.25 (scaled by 8000 ms idle on field)
  rageClicks: 20,       // 0.20 (scaled by 3+ rage clicks in rolling window)
  clickErrorRate: 10    // 0.10 (scaled by 1.0 error rate in rolling window)
};

/**
 * Normalizes individual raw telemetry metrics into a consistent 0-100 range.
 *
 * Normalization scales:
 * - velocityVariance: stdDev (sqrt of variance) normalized against 600 px/s (or mouseVelocity against 1200 px/s fallback)
 * - directionChanges: scaled against 12 erratic changes in rolling window
 * - hesitation: scaled against 8000 ms pause on active field
 * - rageClicks: scaled against 3 rapid click clusters
 * - clickErrorRate: 0.0 to 1.0 scaled to 0-100%
 *
 * @param {Object} metrics Raw metrics
 * @returns {Object} Normalized metrics, each in [0, 100]
 */
export function normalizeTelemetryMetrics(metrics) {
  const {
    mouseVelocity = 0,
    velocityVariance = null,
    hesitationMs = 0,
    rageClicks = 0,
    clickErrorRate = 0,
    directionChanges = 0
  } = metrics || {};

  // Velocity Variance normalization (0 - 100)
  let normVariance = 0;
  if (velocityVariance !== null && velocityVariance !== undefined && velocityVariance >= 0) {
    const stdDev =
      velocityVariance > 2500 ? Math.sqrt(velocityVariance) : velocityVariance;
    normVariance = clamp((stdDev / 600) * 100, 0, 100);
  } else if (mouseVelocity !== undefined && mouseVelocity !== null && mouseVelocity >= 0) {
    normVariance = clamp((mouseVelocity / 1200) * 100, 0, 100);
  }

  // Hesitation normalization (0 - 100, max 8000ms)
  const normHesitation = clamp((hesitationMs / 8000) * 100, 0, 100);

  // Rage clicks normalization (0 - 100, max 3 incidents)
  const normRageClicks = clamp((rageClicks / 3) * 100, 0, 100);

  // Click error rate normalization (0 - 100)
  const normClickErrors = clamp(clickErrorRate * 100, 0, 100);

  // Direction changes normalization (0 - 100, max 12 changes)
  const normDirection = clamp((directionChanges / 12) * 100, 0, 100);

  return {
    velocityVariance: Number(normVariance.toFixed(1)),
    hesitation: Number(normHesitation.toFixed(1)),
    rageClicks: Number(normRageClicks.toFixed(1)),
    clickErrorRate: Number(normClickErrors.toFixed(1)),
    directionChanges: Number(normDirection.toFixed(1))
  };
}

/**
 * Computes a weighted 0-100 Cognitive Load Score from telemetry metrics.
 * Supports Week 2 calibrated weights:
 * - Velocity variance: 0.25 (25%)
 * - Direction changes: 0.20 (20%)
 * - Hesitation: 0.25 (25%)
 * - Rage clicks: 0.20 (20%)
 * - Click errors: 0.10 (10%)
 *
 * Accepts weights configured either as points (e.g. 25) or decimals (e.g. 0.25).
 */
export function computeCognitiveLoadScore(metrics, customWeights = {}) {
  const norm = normalizeTelemetryMetrics(metrics);
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // Allow weights specified either as points (25) or fractions (0.25)
  const getWeightFraction = (key, fallbackKey, defaultPts) => {
    const val = weights[key] ?? (fallbackKey ? weights[fallbackKey] : undefined) ?? defaultPts;
    return val > 1 ? val / 100 : val;
  };

  const wVariance = getWeightFraction("velocityVariance", "velocity", 25);
  const wHesitation = getWeightFraction("hesitation", null, 25);
  const wRage = getWeightFraction("rageClicks", null, 20);
  const wError = getWeightFraction("clickErrorRate", null, 10);
  const wDirection = getWeightFraction("directionChanges", null, 20);

  const total =
    norm.velocityVariance * wVariance +
    norm.hesitation * wHesitation +
    norm.rageClicks * wRage +
    norm.clickErrorRate * wError +
    norm.directionChanges * wDirection;

  return Math.round(clamp(total, 0, 100));
}

/**
 * Applies asymmetric exponential smoothing to prevent sudden score fluctuations.
 * Uses fast-attack (alpha ~ 0.45) for rising cognitive load to remain responsive,
 * and gentle decay (alpha ~ 0.65 - 0.75) for falling load to prevent UI flicker.
 */
export function applyExponentialSmoothing(prevScore, rawScore, alpha = 0.65) {
  if (typeof prevScore !== "number" || isNaN(prevScore)) return rawScore;
  const effAlpha = rawScore > prevScore ? Math.min(alpha, 0.45) : alpha;
  return Math.round(prevScore * effAlpha + rawScore * (1 - effAlpha));
}

/**
 * Pure utility function to actively serialize form context into a compliant formStateSnapshot.
 * Useful for headless testing, offline serialization, or manual telemetry dispatching.
 */
export function serializeTelemetryFormSnapshot(formContext = {}, activeField = "", now = Date.now()) {
  const values = formContext?.values ? { ...formContext.values } : {};
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
    totalFieldsCount: formContext?.totalFieldsCount || 21,
    domContext: {
      activeFieldId: activeField || "",
      activeFieldLabel: formContext?.activeFieldLabel || activeField,
      activeSectionId: formContext?.activeSectionId || "",
      focusedFieldId: formContext?.focusedFieldId || null,
      hoveredFieldId: formContext?.hoveredFieldId || null,
      completedFieldsCount: completedFields.length,
      totalFieldsCount: formContext?.totalFieldsCount || 21,
      validationErrors: formContext?.errors ? { ...formContext.errors } : {},
      scrollY: typeof window !== "undefined" ? Math.round(window.scrollY || 0) : 0
    }
  };
}

/**
 * Custom React hook tracking user friction telemetry over a rolling 10-second window
 * and a 5-second sliding score window.
 *
 * Full-Stack Monorepo Features:
 * - 100ms mousemove sampling gate & cursor velocity variance measurement
 * - Direction changes tracking (erratic angles > 45 deg)
 * - User hesitation & pause tracking
 * - Rage click clusters (>= 3 in 1s / 35px) and click-error rate
 * - Metric normalization into consistent 0–100 scale per metric channel
 * - Exponential smoothing to prevent sudden score fluctuations
 * - 5-second sliding window rolling average (rollingAverageScore) + instantScore
 * - formStateSnapshot serialization (values + DOM context) on threshold breach
 * - Zero-rerender trajectory subscription (subscribeTrajectory) for live HTML5 <canvas> heatmap
 * - Configurable Cognitive Load threshold and custom weights
 * - Minimum activity requirement to prevent cold-start false triggers
 * - 60-second cooldown after a trigger episode, preventing repeated generation calls
 * - onThreshold callback invoked when score crosses threshold
 * - 1000ms WebSocket streaming cadence
 * - Development confusion & calm simulation suite
 * - Real-time telemetry history and CSV report generator
 */
export function useTelemetry({
  sessionId,
  activeField = "",
  formContext = {},
  threshold = 70,
  weights = DEFAULT_WEIGHTS,
  streamIntervalMs = 1000,
  windowDurationMs = 10000,
  smoothingAlpha = 0.65,
  cooldownMs = 60000,
  minInteractions = 2,
  isConnected = false,
  sendTelemetry,
  onThreshold
}) {
  const [telemetrySnapshot, setTelemetrySnapshot] = useState({
    metrics: {
      mouseVelocity: 0,
      velocityVariance: 0,
      hesitationMs: 0,
      rageClicks: 0,
      clickErrorRate: 0,
      clickErrorCount: 0,
      directionChanges: 0
    },
    normalizedMetrics: {
      velocityVariance: 0,
      hesitation: 0,
      rageClicks: 0,
      clickErrorRate: 0,
      directionChanges: 0
    },
    cursor: { x: 0, y: 0 },
    instantScore: 0,
    rawScore: 0,
    rollingAverageScore: 0,
    cognitiveLoadScore: 0,
    activeField: activeField || "",
    activeFieldId: activeField || "",
    threshold,
    isTriggered: false,
    isCooldownActive: false,
    cooldownRemaining: 0,
    hasMinimumActivity: false,
    windowSampleCount: 0,
    lastSnapshotSentAt: null,
    formStateSnapshot: null
  });

  const [simulationMode, setSimulationMode] = useState("idle"); // "idle" | "confused" | "calm"
  const [telemetryHistory, setTelemetryHistory] = useState([]);

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

  const cooldownMsRef = useRef(cooldownMs);
  cooldownMsRef.current = cooldownMs;

  const minInteractionsRef = useRef(minInteractions);
  minInteractionsRef.current = minInteractions;

  const simulationModeRef = useRef("idle");
  simulationModeRef.current = simulationMode;

  const activeSimulationRef = useRef(null);

  // Trajectory listeners for zero-rerender HTML5 <canvas> heatmap drawing
  const trajectoryListenersRef = useRef(new Set());

  // 5-second sliding window buffer holding { timestamp, score }
  const scoreWindowRef = useRef([]);

  // Tracker state holding rolling window buffers
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
    velocityVariance: 0,
    lastInteractionTime: Date.now(),
    totalInteractions: 0,
    hasUserInteracted: false,
    // Rolling 10s Window Buffers: { time, ... }
    velocitySamples: [],
    directionEvents: [],
    clickEvents: [],        // { time, x, y, isError }
    rageClickIncidents: [], // { time }
    // Exponential smoothing & cooldown
    smoothedScore: 0,
    manualOverrideScore: null,
    hasFiredThresholdForEpisode: false,
    lastSnapshotSentAt: null,
    lastThresholdFireTime: 0
  });

  const buildFormStateSnapshot = useCallback((fieldId, now) => {
    const ctx = formContextRef.current || {};

    // 1. If pre-serialized snapshot exists from FinancialForm, adopt and normalize
    if (ctx.formStateSnapshot && typeof ctx.formStateSnapshot === "object") {
      const snap = ctx.formStateSnapshot;
      const values = snap.values ? { ...snap.values } : (ctx.values ? { ...ctx.values } : {});
      const cleanValues = {};
      for (const [k, v] of Object.entries(values)) {
        cleanValues[k] = v !== undefined && v !== null ? v : "";
      }
      const completedFields = Object.keys(cleanValues).filter((k) => cleanValues[k] !== "");
      return {
        capturedAt: now,
        values: cleanValues,
        completedFields: snap.completedFields || completedFields,
        completedCount: snap.completedCount ?? completedFields.length,
        totalFieldsCount: snap.totalFieldsCount || ctx.totalFieldsCount || 21,
        domContext: {
          activeFieldId: fieldId || snap.domContext?.activeFieldId || "",
          activeFieldLabel: ctx.activeFieldLabel || snap.domContext?.activeFieldLabel || fieldId,
          activeSectionId: ctx.activeSectionId || snap.domContext?.activeSectionId || "",
          focusedFieldId: ctx.focusedFieldId || snap.domContext?.focusedFieldId || null,
          hoveredFieldId: ctx.hoveredFieldId || snap.domContext?.hoveredFieldId || null,
          completedFieldsCount: snap.completedCount ?? completedFields.length,
          totalFieldsCount: snap.totalFieldsCount || ctx.totalFieldsCount || 21,
          validationErrors: ctx.errors ? { ...ctx.errors } : (snap.domContext?.validationErrors || {}),
          scrollY: typeof window !== "undefined" ? Math.round(window.scrollY || 0) : 0
        }
      };
    }

    // 2. Fallback to extracting from raw ctx.values
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
        activeFieldId: fieldId || "",
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

  // Compute metrics snapshot over the rolling window (including velocity variance)
  const computeCurrentMetrics = useCallback(
    (now) => {
      const t = trackerRef.current;
      pruneOldEvents(now);

      const hesitationMs =
        t.hasUserInteracted && activeFieldRef.current
          ? Math.max(0, now - t.lastInteractionTime)
          : 0;

      const totalClicks = t.clickEvents.length;
      const errorClicks = t.clickEvents.filter((c) => c.isError).length;
      const clickErrorRate =
        totalClicks > 0 ? Number((errorClicks / totalClicks).toFixed(2)) : 0;

      const rageClicks = t.rageClickIncidents.length;
      const directionChanges = t.directionEvents.length;

      // Compute mean velocity and velocity variance over the rolling window
      const n = t.velocitySamples.length;
      let meanVelocity = Math.round(t.smoothedVelocity);
      let velocityVariance = 0;

      if (n > 0) {
        meanVelocity = Math.round(
          t.velocitySamples.reduce((sum, v) => sum + v.velocity, 0) / n
        );
        velocityVariance = Math.round(
          t.velocitySamples.reduce(
            (sum, v) => sum + Math.pow(v.velocity - meanVelocity, 2),
            0
          ) / n
        );
      }
      t.velocityVariance = velocityVariance;

      return {
        mouseVelocity: meanVelocity,
        velocityVariance,
        hesitationMs: Math.round(hesitationMs),
        rageClicks,
        clickErrorRate,
        clickErrorCount: errorClicks,
        directionChanges
      };
    },
    [pruneOldEvents]
  );

  // Emits snapshot to state, records history, and streams via WebSocket with exponential smoothing
  const emitSnapshot = useCallback(
    (overridePayload = null) => {
      const now = Date.now();
      const t = trackerRef.current;

      // Minimum activity requirement check
      const hasMinimumActivity =
        t.manualOverrideScore !== null ||
        overridePayload?.cognitiveLoadScore !== undefined ||
        simulationModeRef.current !== "idle" ||
        t.totalInteractions >= minInteractionsRef.current ||
        t.velocitySamples.length >= minInteractionsRef.current ||
        t.clickEvents.length >= 1;

      const metrics = overridePayload?.metrics || computeCurrentMetrics(now);
      const normalizedMetrics = normalizeTelemetryMetrics(metrics);

      // Raw score computed using configured weights, or 0 if minimum activity not yet met
      let rawScore = 0;
      if (hasMinimumActivity) {
        rawScore =
          overridePayload?.rawScore ??
          overridePayload?.instantScore ??
          overridePayload?.cognitiveLoadScore ??
          (t.manualOverrideScore !== null
            ? t.manualOverrideScore
            : computeCognitiveLoadScore(metrics, weights));
      }

      const instantScore = rawScore;

      // Apply exponential smoothing to the final score
      let cognitiveLoadScore;
      if (
        t.manualOverrideScore !== null ||
        overridePayload?.cognitiveLoadScore !== undefined ||
        !hasMinimumActivity
      ) {
        cognitiveLoadScore = rawScore;
        t.smoothedScore = rawScore;
      } else {
        cognitiveLoadScore = applyExponentialSmoothing(
          t.smoothedScore,
          rawScore,
          smoothingAlpha
        );
        t.smoothedScore = cognitiveLoadScore;
      }

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
      } else if (hasMinimumActivity) {
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

      // Cooldown tracking (60s default)
      const currentCooldownMs = cooldownMsRef.current;
      const isCooldownActive =
        t.lastThresholdFireTime > 0 &&
        now - t.lastThresholdFireTime < currentCooldownMs;
      const cooldownRemaining = isCooldownActive
        ? Math.max(0, Math.ceil((currentCooldownMs - (now - t.lastThresholdFireTime)) / 1000))
        : 0;

      const field = overridePayload?.activeField ?? activeFieldRef.current;
      const activeThreshold = thresholdRef.current;

      // Trigger condition
      let isTriggered = t.hasFiredThresholdForEpisode;

      const isThresholdBreached =
        (cognitiveLoadScore >= activeThreshold || rollingAverageScore >= activeThreshold) &&
        hasMinimumActivity;

      if (isThresholdBreached) {
        if (!isCooldownActive && !t.hasFiredThresholdForEpisode) {
          t.hasFiredThresholdForEpisode = true;
          t.lastThresholdFireTime = now;
          isTriggered = true;
        }
      } else if (
        cognitiveLoadScore < activeThreshold * 0.85 &&
        rollingAverageScore < activeThreshold * 0.85
      ) {
        // Hysteresis reset
        t.hasFiredThresholdForEpisode = false;
        isTriggered = false;
      }

      // Serialize form values & DOM context whenever cognitive load threshold is breached
      const formStateSnapshot = isThresholdBreached
        ? buildFormStateSnapshot(field, now)
        : undefined;

      if (formStateSnapshot) {
        t.lastSnapshotSentAt = now;
      }

      const cursor = { x: Math.round(t.cursorX), y: Math.round(t.cursorY) };

      const payload = {
        type: "telemetry",
        sessionId,
        timestamp: now,
        metrics,
        normalizedMetrics,
        cursor,
        instantScore,
        rawScore,
        rollingAverageScore,
        cognitiveLoadScore,
        threshold: activeThreshold,
        isTriggered,
        isCooldownActive,
        cooldownRemaining,
        hasMinimumActivity,
        activeField: field,
        activeFieldId: field,
        ...(formStateSnapshot ? { formStateSnapshot } : {})
      };

      setTelemetrySnapshot({
        metrics,
        normalizedMetrics,
        cursor,
        instantScore,
        rawScore,
        rollingAverageScore,
        cognitiveLoadScore,
        threshold: activeThreshold,
        isTriggered,
        isCooldownActive,
        cooldownRemaining,
        hasMinimumActivity,
        activeField: field,
        activeFieldId: field,
        windowSampleCount: windowSamples.length,
        lastSnapshotSentAt: t.lastSnapshotSentAt,
        formStateSnapshot: formStateSnapshot || null
      });

      // Record to time-series history (keeping last 60 data points for live chart & CSV)
      setTelemetryHistory((prev) => {
        const timeSec = prev.length > 0 ? (prev[prev.length - 1].timeSeconds || 0) + 1 : 0;
        const historyItem = {
          timestamp: new Date(now).toISOString(),
          timeSeconds: timeSec,
          score: cognitiveLoadScore,
          rawScore,
          threshold: activeThreshold,
          isThresholdReached: cognitiveLoadScore >= activeThreshold,
          isTriggered: Boolean(isTriggered),
          activeField: field,
          velocityVariance: metrics.velocityVariance,
          hesitationMs: metrics.hesitationMs,
          rageClicks: metrics.rageClicks,
          clickErrorRate: metrics.clickErrorRate,
          directionChanges: metrics.directionChanges,
          mode: simulationModeRef.current
        };
        const next = [...prev, historyItem];
        return next.length > 60 ? next.slice(-60) : next;
      });

      if (isConnectedRef.current && sendTelemetryRef.current) {
        sendTelemetryRef.current(payload);
      }

      // Invoke onThreshold callback on breach
      if (isTriggered && onThresholdRef.current) {
        onThresholdRef.current(payload);
      }

      return payload;
    },
    [sessionId, weights, smoothingAlpha, computeCurrentMetrics, buildFormStateSnapshot]
  );

  // Setup DOM event listeners (smooth trajectory heatmap + 100ms sampling for direction/velocity)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e) => {
      const t = trackerRef.current;
      const nowPerf = performance.now();
      const wallNow = Date.now();
      let liveInstantVelocity = 0;

      t.hasUserInteracted = true;

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
        t.totalInteractions += 1;
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
      t.totalInteractions += 1;

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

    const handleKeyDown = () => {
      const t = trackerRef.current;
      t.hasUserInteracted = true;
      t.totalInteractions += 1;
      t.lastInteractionTime = Date.now();
      t.manualOverrideScore = null;
    };

    const handleClick = (e) => {
      const t = trackerRef.current;
      const wallNow = Date.now();
      t.hasUserInteracted = true;
      t.totalInteractions += 1;
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
      trackerRef.current.smoothedVelocity *= 0.6;
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
    if (activeField) {
      trackerRef.current.hasUserInteracted = true;
    }
  }, [activeField]);

  const subscribeTrajectory = useCallback((listener) => {
    if (typeof listener !== "function") return () => {};
    trajectoryListenersRef.current.add(listener);
    return () => {
      trajectoryListenersRef.current.delete(listener);
    };
  }, []);

  // Clean up active simulation on unmount
  useEffect(() => {
    return () => {
      if (activeSimulationRef.current) {
        activeSimulationRef.current.stop();
        activeSimulationRef.current = null;
      }
    };
  }, []);

  /**
   * Stop any active simulation and restore idle state.
   */
  const stopSimulation = useCallback(() => {
    if (activeSimulationRef.current) {
      activeSimulationRef.current.stop();
      activeSimulationRef.current = null;
    }
    setSimulationMode("idle");
    simulationModeRef.current = "idle";
    trackerRef.current.manualOverrideScore = null;
  }, []);

  /**
   * Starts the confused user simulation:
   * Drives erratic mouse movements, pauses, rage clicks, and misclicks.
   * Produces a clear score spike breaching the 70 threshold.
   */
  const startConfusionSimulation = useCallback(() => {
    stopSimulation();
    setSimulationMode("confused");
    simulationModeRef.current = "confused";
    trackerRef.current.hasUserInteracted = true;

    // Reset cooldown to allow live demo demonstration of trigger
    trackerRef.current.lastThresholdFireTime = 0;
    trackerRef.current.hasFiredThresholdForEpisode = false;

    let tickCount = 0;
    const simInterval = setInterval(() => {
      tickCount += 1;
      const now = Date.now();
      const t = trackerRef.current;

      const burstVelocity = 500 + Math.random() * 600;
      t.smoothedVelocity = burstVelocity;
      t.velocitySamples.push({ time: now, velocity: burstVelocity });

      if (tickCount % 2 === 0) {
        t.directionEvents.push({ time: now });
        t.directionEvents.push({ time: now });
      }

      if (tickCount >= 3) {
        t.lastInteractionTime = now - Math.min(8500, tickCount * 1200);
      }

      if (tickCount >= 5) {
        t.clickEvents.push({ time: now, x: 300, y: 300, isError: true });
        t.clickEvents.push({ time: now - 100, x: 305, y: 302, isError: true });
        t.clickEvents.push({ time: now - 200, x: 302, y: 304, isError: true });
        t.rageClickIncidents.push({ time: now });
      }

      emitSnapshot();
    }, 700);

    activeSimulationRef.current = {
      stop: () => {
        clearInterval(simInterval);
      }
    };
  }, [stopSimulation, emitSnapshot]);

  /**
   * Starts the calm user simulation:
   * Drives smooth, steady movements, clean clicks, and minimal hesitation.
   * Maintains a low Cognitive Load Score (< 25).
   */
  const startCalmSimulation = useCallback(() => {
    stopSimulation();
    setSimulationMode("calm");
    simulationModeRef.current = "calm";
    trackerRef.current.hasUserInteracted = true;

    trackerRef.current.velocitySamples = [];
    trackerRef.current.directionEvents = [];
    trackerRef.current.clickEvents = [];
    trackerRef.current.rageClickIncidents = [];
    trackerRef.current.lastInteractionTime = Date.now();

    let tickCount = 0;
    const simInterval = setInterval(() => {
      tickCount += 1;
      const now = Date.now();
      const t = trackerRef.current;

      const steadyVelocity = 180 + (Math.sin(tickCount) * 20);
      t.smoothedVelocity = steadyVelocity;
      t.velocitySamples.push({ time: now, velocity: steadyVelocity });

      t.lastInteractionTime = now - 500;

      if (tickCount % 4 === 0) {
        t.clickEvents.push({ time: now, x: 450, y: 300, isError: false });
      }

      emitSnapshot();
    }, 700);

    activeSimulationRef.current = {
      stop: () => {
        clearInterval(simInterval);
      }
    };
  }, [stopSimulation, emitSnapshot]);

  /**
   * Manual friction simulation helper for single-click synthetic spikes
   */
  const triggerSimulatedFriction = useCallback(
    (field = "annualIncome", score = 88, options = {}) => {
      const { force = false } = options;
      const simulatedMetrics = {
        mouseVelocity: 680,
        velocityVariance: 145000,
        hesitationMs: 11000,
        rageClicks: 4,
        clickErrorRate: 0.45,
        clickErrorCount: 4,
        directionChanges: 14
      };

      if (force) {
        trackerRef.current.lastThresholdFireTime = 0;
        trackerRef.current.hasFiredThresholdForEpisode = false;
      }

      trackerRef.current.hasUserInteracted = true;
      trackerRef.current.manualOverrideScore = score;
      trackerRef.current.smoothedScore = score;

      return emitSnapshot({
        activeField: field,
        metrics: simulatedMetrics,
        rawScore: score,
        instantScore: score,
        fillWindowWithScore: score
      });
    },
    [emitSnapshot]
  );

  const resetTelemetry = useCallback(() => {
    stopSimulation();
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
      velocityVariance: 0,
      lastInteractionTime: Date.now(),
      totalInteractions: 0,
      hasUserInteracted: false,
      velocitySamples: [],
      directionEvents: [],
      clickEvents: [],
      rageClickIncidents: [],
      smoothedScore: 0,
      manualOverrideScore: null,
      hasFiredThresholdForEpisode: false,
      lastSnapshotSentAt: null,
      lastThresholdFireTime: 0
    };

    setTelemetryHistory([]);

    emitSnapshot({
      activeField: activeFieldRef.current,
      metrics: {
        mouseVelocity: 0,
        velocityVariance: 0,
        hesitationMs: 0,
        rageClicks: 0,
        clickErrorRate: 0,
        clickErrorCount: 0,
        directionChanges: 0
      },
      rawScore: 0,
      instantScore: 0,
      fillWindowWithScore: 0
    });
  }, [stopSimulation, emitSnapshot]);

  const exportTelemetryCSV = useCallback(() => {
    downloadCSVReport(telemetryHistory);
  }, [telemetryHistory]);

  // Rolling analytics summary computed from recent time-series history
  const analyticsSummary = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return { avgScore: 0, peakScore: 0, triggerCount: 0, totalSamples: 0 };
    }
    const scores = telemetryHistory.map((h) => h.score ?? 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avgScore = Math.round(sum / scores.length);
    const peakScore = Math.max(...scores);
    const triggerCount = telemetryHistory.filter((h) => h.isThresholdReached || h.isTriggered).length;
    return {
      avgScore,
      peakScore,
      triggerCount,
      totalSamples: telemetryHistory.length
    };
  }, [telemetryHistory]);

  const getFormStateSnapshot = useCallback(() => {
    return buildFormStateSnapshot(activeFieldRef.current, Date.now());
  }, [buildFormStateSnapshot]);

  const score = telemetrySnapshot.cognitiveLoadScore;
  const isFrustrated = score >= threshold;

  return {
    metrics: telemetrySnapshot.metrics,
    normalizedMetrics: telemetrySnapshot.normalizedMetrics,
    score,
    rawScore: telemetrySnapshot.rawScore,
    threshold: thresholdRef.current,
    isFrustrated,
    isTriggered: telemetrySnapshot.isTriggered,
    isCooldownActive: telemetrySnapshot.isCooldownActive,
    cooldownRemaining: telemetrySnapshot.cooldownRemaining,
    hasMinimumActivity: telemetrySnapshot.hasMinimumActivity,
    activeField: telemetrySnapshot.activeField,
    telemetrySnapshot,
    formStateSnapshot: telemetrySnapshot.formStateSnapshot,
    getFormStateSnapshot,
    subscribeTrajectory,
    telemetryHistory,
    analyticsSummary,
    simulationMode,
    startConfusionSimulation,
    startCalmSimulation,
    stopSimulation,
    simulateConfusion: startConfusionSimulation,
    simulateCalm: startCalmSimulation,
    exportTelemetryCSV,
    triggerSimulatedFriction,
    resetTelemetry
  };
}
