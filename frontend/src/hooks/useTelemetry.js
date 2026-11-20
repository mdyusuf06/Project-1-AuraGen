"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  velocityVariance: 25,  // 0.25 (scaled by standard deviation ~600 px/s or variance ~360,000)
  directionChanges: 20,  // 0.20 (scaled by 12+ erratic changes in rolling window)
  hesitation: 25,        // 0.25 (scaled by 8000 ms idle on field)
  rageClicks: 20,        // 0.20 (scaled by 3+ rage clicks in rolling window)
  clickErrorRate: 10     // 0.10 (scaled by 1.0 error rate in rolling window)
};

/**
 * Computes a weighted 0-100 Cognitive Load Score from telemetry metrics.
 * Supports Week 2 calibrated weights:
 * - Velocity variance: 0.25
 * - Direction changes: 0.20
 * - Hesitation: 0.25
 * - Rage clicks: 0.20
 * - Click errors: 0.10
 */
export function computeCognitiveLoadScore(metrics, customWeights = {}) {
  const {
    mouseVelocity = 0,
    velocityVariance = null,
    hesitationMs = 0,
    rageClicks = 0,
    clickErrorRate = 0,
    directionChanges = 0
  } = metrics || {};

  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // 1. Velocity Variance component (0.25 weight)
  // Evaluates standard deviation or variance of velocity in rolling window.
  // Falls back gracefully to mouseVelocity / 1200 if variance is omitted.
  let varianceRatio = 0;
  if (velocityVariance !== null && velocityVariance !== undefined) {
    const stdDev =
      velocityVariance > 2500 ? Math.sqrt(velocityVariance) : velocityVariance;
    varianceRatio = clamp(stdDev / 600, 0, 1);
  } else if (mouseVelocity !== undefined) {
    varianceRatio = clamp(mouseVelocity / 1200, 0, 1);
  }
  const varianceWeight = weights.velocityVariance ?? weights.velocity ?? 25;
  const velocityScore = varianceRatio * varianceWeight;

  // 2. Hesitation component (0.25 weight, max 8000ms)
  const hesitationWeight = weights.hesitation ?? 25;
  const hesitationScore = clamp(
    (hesitationMs / 8000) * hesitationWeight,
    0,
    hesitationWeight
  );

  // 3. Rage Clicks component (0.20 weight, max 3+ incidents)
  const rageWeight = weights.rageClicks ?? 20;
  const rageScore = clamp((rageClicks / 3) * rageWeight, 0, rageWeight);

  // 4. Click Error Rate component (0.10 weight, 0.0 - 1.0 rate)
  const errorWeight = weights.clickErrorRate ?? 10;
  const errorScore = clamp(clickErrorRate * errorWeight, 0, errorWeight);

  // 5. Direction Changes component (0.20 weight, max 12+ erratic deflections)
  const directionWeight = weights.directionChanges ?? 20;
  const directionScore = clamp(
    (directionChanges / 12) * directionWeight,
    0,
    directionWeight
  );

  const total =
    velocityScore + hesitationScore + rageScore + errorScore + directionScore;
  return Math.round(clamp(total, 0, 100));
}

/**
 * Custom React hook tracking user friction telemetry over a rolling 10-second window.
 *
 * Week 2 Calibrated Features:
 * - 100ms mousemove sampling gate
 * - Cursor velocity variance and mean velocity measurement
 * - Direction changes tracking (erratic angles > 45 deg)
 * - User hesitation & pause tracking
 * - Rage click clusters (>= 3 in 1s / 35px) and click-error rate
 * - Exponential smoothing to prevent sudden score fluctuations
 * - 10-second rolling window event queue with automatic eviction
 * - Configurable Cognitive Load threshold (default 70) and custom weights
 * - onThreshold callback invoked when score crosses threshold
 * - 1000ms WebSocket streaming cadence
 * - Clean listener and timer teardown
 */
export function useTelemetry({
  sessionId,
  activeField = "",
  threshold = 70,
  weights = DEFAULT_WEIGHTS,
  streamIntervalMs = 1000,
  windowDurationMs = 10000,
  smoothingAlpha = 0.65, // Exponential smoothing coefficient (fast attack, smooth decay)
  cooldownMs = 60000,   // Cooldown after trigger episode (default 60s)
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
      directionChanges: 0
    },
    cognitiveLoadScore: 0,
    activeField: activeField || ""
  });

  const activeFieldRef = useRef(activeField || "");
  activeFieldRef.current = activeField || "";

  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  const onThresholdRef = useRef(onThreshold);
  onThresholdRef.current = onThreshold;

  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;

  const sendTelemetryRef = useRef(sendTelemetry);
  sendTelemetryRef.current = sendTelemetry;

  // Tracker state holding rolling window buffers
  const trackerRef = useRef({
    lastSampleX: null,
    lastSampleY: null,
    lastSampleTime: 0,
    lastHeadingAngle: null,
    smoothedVelocity: 0,
    velocityVariance: 0,
    lastInteractionTime: Date.now(),
    // Rolling 10s Window Buffers: { time, ... }
    velocitySamples: [],
    directionEvents: [],
    clickEvents: [],        // { time, x, y, isError }
    rageClickIncidents: [], // { time }
    // Exponential smoothing & cooldown
    smoothedScore: 0,
    manualOverrideScore: null,
    hasFiredThresholdForEpisode: false,
    lastThresholdFireTime: 0
  });

  // Prune events outside the rolling window (10s)
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

      const hesitationMs = activeFieldRef.current
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
        directionChanges
      };
    },
    [pruneOldEvents]
  );

  // Emits snapshot to state and streams via WebSocket with exponential smoothing
  const emitSnapshot = useCallback(
    (overridePayload = null) => {
      const now = Date.now();
      const t = trackerRef.current;

      const metrics = overridePayload?.metrics || computeCurrentMetrics(now);
      const rawScore =
        overridePayload?.cognitiveLoadScore ??
        (t.manualOverrideScore !== null
          ? t.manualOverrideScore
          : computeCognitiveLoadScore(metrics, weights));

      // Apply asymmetric exponential smoothing to prevent sudden score fluctuations
      let cognitiveLoadScore;
      if (
        t.manualOverrideScore !== null ||
        overridePayload?.cognitiveLoadScore !== undefined
      ) {
        // Overrides and synthetic spikes apply immediately
        cognitiveLoadScore = rawScore;
        t.smoothedScore = rawScore;
      } else {
        // Fast attack (responsive rise) and gentle decay (smooth recovery)
        const alpha =
          rawScore > t.smoothedScore
            ? Math.min(smoothingAlpha, 0.45)
            : smoothingAlpha;
        t.smoothedScore = Math.round(
          t.smoothedScore * alpha + rawScore * (1 - alpha)
        );
        cognitiveLoadScore = clamp(t.smoothedScore, 0, 100);
      }

      const field = overridePayload?.activeField ?? activeFieldRef.current;

      const snapshot = {
        type: "telemetry",
        sessionId,
        timestamp: now,
        metrics,
        cognitiveLoadScore,
        activeField: field
      };

      setTelemetrySnapshot({
        metrics,
        cognitiveLoadScore,
        activeField: field
      });

      // Stream to WebSocket
      if (isConnectedRef.current && sendTelemetryRef.current) {
        sendTelemetryRef.current(snapshot);
      }

      // Trigger onThreshold callback when score >= threshold (with episode latch & cooldown)
      if (cognitiveLoadScore >= thresholdRef.current) {
        const withinCooldown = now - t.lastThresholdFireTime < cooldownMs;
        if (!t.hasFiredThresholdForEpisode && !withinCooldown) {
          t.hasFiredThresholdForEpisode = true;
          t.lastThresholdFireTime = now;
          onThresholdRef.current?.(snapshot);
        }
      } else if (cognitiveLoadScore < thresholdRef.current * 0.85) {
        // Hysteresis: clear episode latch once score drops below 85% of threshold
        t.hasFiredThresholdForEpisode = false;
      }

      return snapshot;
    },
    [sessionId, weights, smoothingAlpha, cooldownMs, computeCurrentMetrics]
  );

  // Setup DOM event listeners with 100ms mouse sampling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e) => {
      const t = trackerRef.current;
      const now = performance.now();
      const wallNow = Date.now();

      if (t.lastSampleTime === 0) {
        t.lastSampleTime = now;
        t.lastSampleX = e.clientX;
        t.lastSampleY = e.clientY;
        return;
      }

      const elapsed = now - t.lastSampleTime;
      // Sample mouse movement every ~100ms to keep performance smooth
      if (elapsed < 100) return;

      const dx = e.clientX - t.lastSampleX;
      const dy = e.clientY - t.lastSampleY;
      const dtSeconds = elapsed / 1000;
      const distance = Math.hypot(dx, dy);
      const instantVelocity = distance / dtSeconds;

      t.smoothedVelocity = t.smoothedVelocity * 0.7 + instantVelocity * 0.3;
      t.velocitySamples.push({ time: wallNow, velocity: instantVelocity });

      // Direction changes detection for erratic movement
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
      t.lastSampleTime = now;
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

      // Identify click target and validation status
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
        // Emit immediately on rage click spike
        emitSnapshot();
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });

    // Stream telemetry every second (1000ms)
    const intervalId = setInterval(() => {
      // Natural decay for idle velocity
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
  }, [activeField]);

  // Manual friction simulation helper for live demo testing
  const triggerSimulatedFriction = useCallback(
    (field = "annualIncome", score = 88) => {
      const simulatedMetrics = {
        mouseVelocity: 680,
        velocityVariance: 145000,
        hesitationMs: 11000,
        rageClicks: 4,
        clickErrorRate: 0.45,
        directionChanges: 14
      };
      trackerRef.current.manualOverrideScore = score;
      trackerRef.current.smoothedScore = score;
      return emitSnapshot({
        activeField: field,
        metrics: simulatedMetrics,
        cognitiveLoadScore: score
      });
    },
    [emitSnapshot]
  );

  const resetTelemetry = useCallback(() => {
    trackerRef.current = {
      lastSampleX: null,
      lastSampleY: null,
      lastSampleTime: 0,
      lastHeadingAngle: null,
      smoothedVelocity: 0,
      velocityVariance: 0,
      lastInteractionTime: Date.now(),
      velocitySamples: [],
      directionEvents: [],
      clickEvents: [],
      rageClickIncidents: [],
      smoothedScore: 0,
      manualOverrideScore: null,
      hasFiredThresholdForEpisode: false,
      lastThresholdFireTime: 0
    };

    emitSnapshot({
      activeField: activeFieldRef.current,
      metrics: {
        mouseVelocity: 0,
        velocityVariance: 0,
        hesitationMs: 0,
        rageClicks: 0,
        clickErrorRate: 0,
        directionChanges: 0
      },
      cognitiveLoadScore: 0
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
    triggerSimulatedFriction,
    resetTelemetry
  };
}
