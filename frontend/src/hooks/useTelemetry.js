"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Computes a 0-100 Cognitive Load Score from behavioral telemetry metrics.
 */
export function computeCognitiveLoadScore({
  mouseVelocity,
  hesitationMs,
  rageClicks,
  clickErrorRate
}) {
  // Heuristic weighting for Week 1 telemetry calibration
  const velocityScore = clamp((mouseVelocity / 1600) * 20, 0, 20);
  const hesitationScore = clamp((hesitationMs / 10000) * 30, 0, 30);
  const rageScore = clamp(rageClicks * 18, 0, 45);
  const errorScore = clamp(clickErrorRate * 35, 0, 35);

  return Math.round(clamp(velocityScore + hesitationScore + rageScore + errorScore, 0, 100));
}

/**
 * Custom React hook tracking mouse velocity, field hesitation, rage clicks,
 * and click-error rate, streaming updates via WebSocket `sendTelemetry`.
 */
export function useTelemetry({
  sessionId,
  activeField,
  isConnected,
  sendTelemetry,
  streamIntervalMs = 1500
}) {
  const [telemetrySnapshot, setTelemetrySnapshot] = useState({
    metrics: {
      mouseVelocity: 0,
      hesitationMs: 0,
      rageClicks: 0,
      clickErrorRate: 0
    },
    cognitiveLoadScore: 0,
    activeField: activeField || ""
  });

  const activeFieldRef = useRef(activeField || "");
  activeFieldRef.current = activeField || "";

  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;

  const sendTelemetryRef = useRef(sendTelemetry);
  sendTelemetryRef.current = sendTelemetry;

  // Mutable tracking state (avoids excessive React re-renders on every mousemove)
  const trackerRef = useRef({
    lastMouseX: null,
    lastMouseY: null,
    lastMouseTime: null,
    smoothedVelocity: 0,
    lastInteractionTime: Date.now(),
    recentClicks: [],
    rageClicks: 0,
    totalClicks: 0,
    errorClicks: 0,
    manualOverrideScore: null
  });

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
        clickErrorRate
      };

      const cognitiveLoadScore =
        overridePayload?.cognitiveLoadScore ??
        (t.manualOverrideScore !== null
          ? t.manualOverrideScore
          : computeCognitiveLoadScore(metrics));

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

      if (isConnectedRef.current && sendTelemetryRef.current) {
        sendTelemetryRef.current(snapshot);
      }

      return snapshot;
    },
    [sessionId]
  );

  // Attach DOM telemetry listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e) => {
      const t = trackerRef.current;
      const now = performance.now();

      if (t.lastMouseX !== null && t.lastMouseTime !== null) {
        const dt = (now - t.lastMouseTime) / 1000;
        if (dt > 0.01) {
          const dx = e.clientX - t.lastMouseX;
          const dy = e.clientY - t.lastMouseY;
          const instantVelocity = Math.hypot(dx, dy) / dt;
          // Exponential moving average for smooth velocity reading
          t.smoothedVelocity = t.smoothedVelocity * 0.7 + instantVelocity * 0.3;
        }
      }

      t.lastMouseX = e.clientX;
      t.lastMouseY = e.clientY;
      t.lastMouseTime = now;
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

      // Detect non-useful clicks (outside interactive form controls)
      const tag = e.target?.tagName?.toLowerCase() || "";
      const isInteractive = ["input", "select", "textarea", "button", "label", "option", "a"].includes(tag);
      const isInvalidControl = e.target?.getAttribute?.("aria-invalid") === "true";

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
        // Emit immediately upon rage click spike
        emitSnapshot();
      }

      t.recentClicks.push({ x: e.clientX, y: e.clientY, time: now });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });

    const intervalId = setInterval(() => {
      // Decay smoothed velocity over idle intervals
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

  // Reset hesitation timer whenever user switches active field
  useEffect(() => {
    trackerRef.current.lastInteractionTime = Date.now();
  }, [activeField]);

  const triggerSimulatedFriction = useCallback(
    (field = "annualIncome", score = 88) => {
      const simulatedMetrics = {
        mouseVelocity: 620,
        hesitationMs: 11500,
        rageClicks: 5,
        clickErrorRate: 0.42
      };
      trackerRef.current.rageClicks = simulatedMetrics.rageClicks;
      trackerRef.current.smoothedVelocity = simulatedMetrics.mouseVelocity;
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
      lastMouseX: null,
      lastMouseY: null,
      lastMouseTime: null,
      smoothedVelocity: 0,
      lastInteractionTime: Date.now(),
      recentClicks: [],
      rageClicks: 0,
      totalClicks: 0,
      errorClicks: 0,
      manualOverrideScore: null
    };
    emitSnapshot({
      activeField: activeFieldRef.current,
      metrics: {
        mouseVelocity: 0,
        hesitationMs: 0,
        rageClicks: 0,
        clickErrorRate: 0
      },
      cognitiveLoadScore: 0
    });
  }, [emitSnapshot]);

  return {
    telemetrySnapshot,
    triggerSimulatedFriction,
    resetTelemetry
  };
}

