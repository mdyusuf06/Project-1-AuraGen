"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export const DEFAULT_WEIGHTS = {
  velocity: 20,       // Max 20 pts (scaled by 1200 px/s)
  hesitation: 25,     // Max 25 pts (scaled by 8000 ms)
  rageClicks: 25,     // Max 25 pts (scaled by 3+ rage clicks in rolling window)
  clickErrorRate: 15, // Max 15 pts (scaled by 1.0 error rate in rolling window)
  directionChanges: 15 // Max 15 pts (scaled by 12+ erratic changes in rolling window)
};

/**
 * Computes a weighted 0-100 Cognitive Load Score from telemetry metrics.
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
 * Custom React hook tracking user friction telemetry over a rolling 10-second window.
 *
 * Features:
 * - 100ms mousemove sampling
 * - Direction changes tracking (erratic angles > 45 deg)
 * - Rolling 10-second window for velocity, clicks, rage clicks, and click-error rate
 * - Configurable Cognitive Load threshold (default 70) and custom weights
 * - onThreshold callback invoked when score crosses threshold
 * - 1000ms WebSocket streaming cadence
 * - Exposes { metrics, score, activeField, isFrustrated, telemetrySnapshot, triggerSimulatedFriction, resetTelemetry }
 */
export function useTelemetry({
  sessionId,
  activeField = "",
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
    lastInteractionTime: Date.now(),
    // Rolling 10s Window Buffers: { time, ... }
    velocitySamples: [],
    directionEvents: [],
    clickEvents: [],        // { time, x, y, isError }
    rageClickIncidents: [], // { time }
    manualOverrideScore: null,
    hasFiredThresholdForEpisode: false
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
        directionChanges
      };
    },
    [pruneOldEvents]
  );

  // Emits snapshot to state and streams via WebSocket
  const emitSnapshot = useCallback(
    (overridePayload = null) => {
      const now = Date.now();
      const t = trackerRef.current;

      const metrics = overridePayload?.metrics || computeCurrentMetrics(now);
      const cognitiveLoadScore =
        overridePayload?.cognitiveLoadScore ??
        (t.manualOverrideScore !== null
          ? t.manualOverrideScore
          : computeCognitiveLoadScore(metrics, weights));

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

      // Trigger onThreshold callback when score >= threshold (once per breach episode)
      if (cognitiveLoadScore >= thresholdRef.current) {
        if (!t.hasFiredThresholdForEpisode) {
          t.hasFiredThresholdForEpisode = true;
          onThresholdRef.current?.(snapshot);
        }
      } else {
        t.hasFiredThresholdForEpisode = false;
      }

      return snapshot;
    },
    [sessionId, weights, computeCurrentMetrics]
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
        hesitationMs: 11000,
        rageClicks: 4,
        clickErrorRate: 0.45,
        directionChanges: 14
      };
      trackerRef.current.manualOverrideScore = score;
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
      lastInteractionTime: Date.now(),
      velocitySamples: [],
      directionEvents: [],
      clickEvents: [],
      rageClickIncidents: [],
      manualOverrideScore: null,
      hasFiredThresholdForEpisode: false
    };

    emitSnapshot({
      activeField: activeFieldRef.current,
      metrics: {
        mouseVelocity: 0,
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
