"use client";

import React, { useState, useEffect, useRef } from "react";
import { WS_STATUS } from "../hooks/useWebSocket";

const STATUS_BADGE = {
  [WS_STATUS.CONNECTED]: {
    label: "CONNECTED",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  [WS_STATUS.CONNECTING]: {
    label: "CONNECTING",
    dot: "bg-amber-400 animate-pulse",
    pill: "bg-amber-50 text-amber-700 border-amber-200"
  },
  [WS_STATUS.RECONNECTING]: {
    label: "RECONNECTING",
    dot: "bg-amber-500 animate-ping",
    pill: "bg-amber-50 text-amber-800 border-amber-200"
  },
  [WS_STATUS.DISCONNECTED]: {
    label: "DISCONNECTED",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 border-rose-200"
  }
};

/**
 * Interpolates trajectory stroke color from Green (smooth) -> Amber -> Red (erratic/hesitant).
 */
function getTrajectoryColor(velocity, hesitationMs, alpha) {
  // Normalize severity ratio [0, 1]
  const velRatio = Math.min(1, Math.max(0, (velocity - 150) / 700));
  const hesRatio = Math.min(1, Math.max(0, (hesitationMs - 2000) / 5000));
  const severity = Math.max(velRatio, hesRatio);

  if (severity < 0.5) {
    // Green (#22c55e) -> Amber (#f59e0b)
    const t = severity * 2;
    const r = Math.round(34 + (245 - 34) * t);
    const g = Math.round(197 + (158 - 197) * t);
    const b = Math.round(94 + (11 - 94) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Amber (#f59e0b) -> Red (#ef4444)
  const t = (severity - 0.5) * 2;
  const r = Math.round(245 + (239 - 245) * t);
  const g = Math.round(158 + (68 - 158) * t);
  const b = Math.round(11 + (68 - 11) * t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TelemetryHUD({
  sessionId,
  wsStatus,
  reconnectAttempt,
  nextReconnectDelayMs,
  onReconnect,
  telemetrySnapshot,
  subscribeTrajectory,
  threshold = 70,
  onSimulateSpike,
  onResetTelemetry,
  receivedComponentCount,
  onOpenCodeDrawer
}) {
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [debugOpen, setDebugOpen] = useState(true);
  const [serverMetrics, setServerMetrics] = useState(null);
  const [loadingSessionApi, setLoadingSessionApi] = useState(false);

  const canvasRef = useRef(null);
  const pointsRef = useRef([]);

  const badge = STATUS_BADGE[wsStatus] || STATUS_BADGE[WS_STATUS.DISCONNECTED];
  const {
    metrics,
    cursor = { x: 0, y: 0 },
    instantScore = 0,
    rollingAverageScore = 0,
    activeFieldId,
    activeField,
    windowSampleCount = 0,
    lastSnapshotSentAt
  } = telemetrySnapshot;

  const currentField = activeFieldId || activeField || "";
  const isHighLoad = rollingAverageScore >= threshold;

  // Live HTML5 <canvas> Mouse Trajectory Heatmap Overlay
  useEffect(() => {
    if (!heatmapEnabled || typeof window === "undefined") {
      pointsRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const unsubscribe = subscribeTrajectory?.((point) => {
      pointsRef.current.push(point);
      if (pointsRef.current.length > 350) {
        pointsRef.current.shift();
      }
    });

    let animationFrameId;
    const TRAIL_LIFETIME_MS = 6000;

    const renderFrame = () => {
      const now = Date.now();
      pointsRef.current = pointsRef.current.filter(
        (p) => now - p.time <= TRAIL_LIFETIME_MS
      );

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const pts = pointsRef.current;
      if (pts.length > 1) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const ageRatio = 1 - (now - curr.time) / TRAIL_LIFETIME_MS;
          const alpha = Math.max(0.08, ageRatio * 0.9);

          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = getTrajectoryColor(
            curr.velocity,
            curr.hesitationMs,
            alpha
          );
          ctx.lineWidth = curr.isErratic ? 4.5 : 2.5;
          ctx.stroke();

          // Soft red radial glow for erratic spikes or hesitation zones
          if (curr.isErratic && i % 3 === 0) {
            const grad = ctx.createRadialGradient(
              curr.x,
              curr.y,
              1,
              curr.x,
              curr.y,
              22
            );
            grad.addColorStop(0, `rgba(239, 68, 68, ${alpha * 0.35})`);
            grad.addColorStop(1, "rgba(239, 68, 68, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(curr.x, curr.y, 22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationFrameId);
      unsubscribe?.();
    };
  }, [heatmapEnabled, subscribeTrajectory]);

  const handleFetchSessionMetrics = async () => {
    if (!sessionId) return;
    setLoadingSessionApi(true);
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
      const httpBase = wsUrl.replace(/^ws:/i, "http:").replace(/^wss:/i, "https:");
      const res = await fetch(`${httpBase}/api/sessions/${encodeURIComponent(sessionId)}/metrics`);
      if (res.ok) {
        const json = await res.json();
        setServerMetrics(json.summary);
      } else {
        setServerMetrics({ error: `HTTP ${res.status}` });
      }
    } catch (err) {
      setServerMetrics({ error: err.message });
    } finally {
      setLoadingSessionApi(false);
    }
  };

  return (
    <>
      {/* Full-Viewport HTML5 Canvas Mouse Trajectory Heatmap Overlay */}
      {heatmapEnabled && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="fixed inset-0 z-40 pointer-events-none"
        />
      )}

      {/* Top Telemetry Bar */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl p-4 sm:p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
              AG
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                AuraGen Telemetry & Sliding Window Engine
              </h2>
              <p className="text-xs text-slate-400">
                Session <span className="font-mono text-indigo-300">{sessionId}</span> • 5s rolling window + formStateSnapshot serialization
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${badge.pill}`}
            >
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span>
                {badge.label}
                {wsStatus === WS_STATUS.RECONNECTING && reconnectAttempt > 0
                  ? ` (#${reconnectAttempt}, ${Math.round(nextReconnectDelayMs / 1000)}s)`
                  : ""}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setHeatmapEnabled((v) => !v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                heatmapEnabled
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
            >
              {heatmapEnabled ? "Heatmap: ON" : "Toggle Heatmap"}
            </button>

            {heatmapEnabled && (
              <button
                type="button"
                onClick={() => {
                  pointsRef.current = [];
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
              >
                Clear Trail
              </button>
            )}

            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              {debugOpen ? "Hide Debug HUD" : "Show Debug HUD"}
            </button>

            {wsStatus !== WS_STATUS.CONNECTED && (
              <button
                type="button"
                onClick={onReconnect}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                Retry Connect
              </button>
            )}

            {receivedComponentCount > 0 && (
              <button
                type="button"
                onClick={onOpenCodeDrawer}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                View Generated Code ({receivedComponentCount})
              </button>
            )}
          </div>
        </div>

        {/* Metrics & 5-Second Sliding Window Score Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 items-center">
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">
                5s Rolling Avg (Threshold: {threshold})
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">
                  Instant: <strong className="text-slate-200">{instantScore}</strong>
                </span>
                <span
                  className={`font-bold text-sm ${
                    isHighLoad ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {rollingAverageScore} / 100
                </span>
              </div>
            </div>
            <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isHighLoad
                    ? "bg-rose-500"
                    : rollingAverageScore > threshold * 0.6
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, rollingAverageScore)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/70"
                style={{ left: `${threshold}%` }}
                title={`Trigger Threshold: ${threshold}`}
              />
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Velocity
              </div>
              <div className="text-xs font-semibold text-white mt-0.5">
                {metrics.mouseVelocity} px/s
              </div>
            </div>
            <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Hesitation
              </div>
              <div className="text-xs font-semibold text-white mt-0.5">
                {(metrics.hesitationMs / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Rage Clicks
              </div>
              <div className="text-xs font-semibold text-white mt-0.5">
                {metrics.rageClicks}
              </div>
            </div>
            <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Active Field
              </div>
              <div
                className="text-xs font-semibold text-indigo-300 mt-0.5 truncate"
                title={currentField || "None"}
              >
                {currentField || "—"}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-wrap lg:justify-end gap-2">
            <button
              type="button"
              onClick={onSimulateSpike}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              Simulate Friction Spike
            </button>
            <button
              type="button"
              onClick={onResetTelemetry}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Floating Corner Debug HUD */}
      {debugOpen && (
        <aside className="fixed bottom-4 right-4 z-50 w-80 bg-slate-950/95 backdrop-blur-md text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span className="font-bold tracking-wide uppercase text-[11px] text-indigo-300">
                Live Debug HUD
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDebugOpen(false)}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">WS STATE</div>
              <div className="font-semibold text-white truncate">{badge.label}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">5S ROLLING / INST</div>
              <div className={`font-semibold ${isHighLoad ? "text-rose-400" : "text-emerald-400"}`}>
                {rollingAverageScore} / {instantScore} ({windowSampleCount}w)
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">ACTIVE FIELD</div>
              <div className="font-semibold text-indigo-300 truncate">
                {currentField || "none"}
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">CURSOR / VEL</div>
              <div className="font-semibold text-slate-200">
                {cursor.x},{cursor.y} • {metrics.mouseVelocity}px/s
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">formStateSnapshot:</span>
            <span className={lastSnapshotSentAt ? "text-emerald-400 font-semibold" : "text-slate-300"}>
              {lastSnapshotSentAt
                ? `Sent ${new Date(lastSnapshotSentAt).toLocaleTimeString()}`
                : "Armed (>= threshold)"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleFetchSessionMetrics}
              disabled={loadingSessionApi}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-medium transition-colors"
            >
              {loadingSessionApi ? "Fetching..." : "Poll Session Store API"}
            </button>
          </div>

          {serverMetrics && (
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800 font-mono text-[10px] text-slate-300 space-y-0.5">
              {serverMetrics.error ? (
                <div className="text-rose-400">API Error: {serverMetrics.error}</div>
              ) : (
                <>
                  <div>Packets: {serverMetrics.packetCount} | Breaches: {serverMetrics.thresholdBreaches}</div>
                  <div>Peak 5s: {serverMetrics.peakRollingScore} | Avg 5s: {serverMetrics.averages?.rollingAverageScore}</div>
                </>
              )}
            </div>
          )}
        </aside>
      )}
    </>
  );
}
