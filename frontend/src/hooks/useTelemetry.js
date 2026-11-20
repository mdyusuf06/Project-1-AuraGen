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
 * Custom React hook tracking user friction telemetry over a rolling 10-second window.
 *
 * Week 2 Calibrated Features:
 * - 100ms mousemove sampling gate
 * - Cursor velocity variance and mean velocity measurement
 * - Direction changes tracking (erratic angles > 45 deg)
 * - User hesitation & pause tracking
 * - Rage click clusters (>= 3 in 1s / 35px) and click-error rate
 * - Metric normalization into consistent 0–100 scale per metric channel
 * - Exponential smoothing to prevent sudden score fluctuations
 * - 10-second rolling window event queue with automatic eviction
 * - Configurable Cognitive Load threshold (default 70) and custom weights
 * - Minimum activity requirement to prevent cold-start false triggers
 * - 60-second cooldown after a trigger episode, preventing repeated generation calls
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
  smoothingAlpha = 0.65, // Exponential smoothing coefficient
  cooldownMs = 60000,   // 60-second cooldown after generation trigger (default 60s)
  minInteractions = 2,  // Minimum activity requirement before calculating / triggering
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
    normalizedMetrics: {
      velocityVariance: 0,
      hesitation: 0,
      rageClicks: 0,
      clickErrorRate: 0,
      directionChanges: 0
    },
    cognitiveLoadScore: 0,
    rawScore: 0,
    activeField: activeField || "",
    threshold,
    isTriggered: false,
    isCooldownActive: false,
    cooldownRemaining: 0,
    hasMinimumActivity: false
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

  const cooldownMsRef = useRef(cooldownMs);
  cooldownMsRef.current = cooldownMs;

  const minInteractionsRef = useRef(minInteractions);
  minInteractionsRef.current = minInteractions;

  // Tracker state holding rolling window buffers
  const trackerRef = useRef({
    lastSampleX: null,
    lastSampleY: null,
    lastSampleTime: 0,
    lastHeadingAngle: null,
    smoothedVelocity: 0,
    velocityVariance: 0,
    lastInteractionTime: Date.now(),
    totalInteractions: 0, // Counts user interactions to enforce minimum activity requirement
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

      // Minimum activity requirement check:
      // Prevents cold-start false positives before the user has actually engaged with the form.
      const hasMinimumActivity =
        t.manualOverrideScore !== null ||
        overridePayload?.cognitiveLoadScore !== undefined ||
        t.totalInteractions >= minInteractionsRef.current ||
        t.velocitySamples.length >= minInteractionsRef.current ||
        t.clickEvents.length >= 1;

      const metrics = overridePayload?.metrics || computeCurrentMetrics(now);
      const normalizedMetrics = normalizeTelemetryMetrics(metrics);

      // Raw score computed using configured weights, or 0 if minimum activity not yet met
      let rawScore = 0;
      if (hasMinimumActivity) {
        rawScore =
          overridePayload?.cognitiveLoadScore ??
          (t.manualOverrideScore !== null
            ? t.manualOverrideScore
            : computeCognitiveLoadScore(metrics, weights));
      }

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

      // Trigger condition:
      // 1. Score >= threshold
      // 2. Minimum activity requirement met
      // 3. Not in cooldown (prevents repeated generation requests within 60s)
      // 4. Not already fired for the current high-friction episode (episode latch)
      let isTriggered = t.hasFiredThresholdForEpisode;

      if (cognitiveLoadScore >= activeThreshold) {
        if (hasMinimumActivity && !isCooldownActive && !t.hasFiredThresholdForEpisode) {
          t.hasFiredThresholdForEpisode = true;
          t.lastThresholdFireTime = now;
          isTriggered = true;

          const triggerSnapshot = {
            type: "telemetry",
            sessionId,
            timestamp: now,
            metrics,
            normalizedMetrics,
            rawScore,
            cognitiveLoadScore,
            threshold: activeThreshold,
            isTriggered: true,
            isCooldownActive: true,
            cooldownRemaining: Math.ceil(currentCooldownMs / 1000),
            hasMinimumActivity: true,
            activeField: field
          };

          onThresholdRef.current?.(triggerSnapshot);
        }
      } else if (cognitiveLoadScore < activeThreshold * 0.85) {
        // Hysteresis: clear episode latch once score drops below 85% of threshold
        t.hasFiredThresholdForEpisode = false;
        isTriggered = false;
      }

      const snapshot = {
        type: "telemetry",
        sessionId,
        timestamp: now,
        metrics,
        normalizedMetrics,
        rawScore,
        cognitiveLoadScore,
        threshold: activeThreshold,
        isTriggered,
        isCooldownActive,
        cooldownRemaining,
        hasMinimumActivity,
        activeField: field
      };

      setTelemetrySnapshot({
        metrics,
        normalizedMetrics,
        rawScore,
        cognitiveLoadScore,
        threshold: activeThreshold,
        isTriggered,
        isCooldownActive,
        cooldownRemaining,
        hasMinimumActivity,
        activeField: field
      });

      // Stream to WebSocket
      if (isConnectedRef.current && sendTelemetryRef.current) {
        sendTelemetryRef.current(snapshot);
      }

      return snapshot;
    },
    [sessionId, weights, smoothingAlpha, computeCurrentMetrics]
  );

  // Setup DOM event listeners with 100ms mouse sampling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e) => {
      const t = trackerRef.current;
      const now = performance.now();
      const wallNow = Date.now();

      t.hasUserInteracted = true;

      if (t.lastSampleTime === 0) {
        t.lastSampleTime = now;
        t.lastSampleX = e.clientX;
        t.lastSampleY = e.clientY;
        t.totalInteractions += 1;
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
      t.totalInteractions += 1;

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
    if (activeField) {
      trackerRef.current.hasUserInteracted = true;
    }
  }, [activeField]);

  // Manual friction simulation helper for live demo testing
  const triggerSimulatedFriction = useCallback(
    (field = "annualIncome", score = 88, options = {}) => {
      const { force = false } = options;
      const simulatedMetrics = {
        mouseVelocity: 680,
        velocityVariance: 145000,
        hesitationMs: 11000,
        rageClicks: 4,
        clickErrorRate: 0.45,
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
      totalInteractions: 0,
      hasUserInteracted: false,
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
    triggerSimulatedFriction,
    resetTelemetry
  };
}