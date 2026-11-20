"use client";

import React, { useState, useEffect, useRef } from "react";
import { WS_STATUS } from "../hooks/useWebSocket";

const STATUS_BADGE = {
  [WS_STATUS.CONNECTED]: {
    label: "ONLINE",
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
    label: "OFFLINE",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 border-rose-200"
  }
};

function getTrajectoryColor(velocity, hesitationMs, alpha) {
  const velRatio = Math.min(1, Math.max(0, (velocity - 150) / 700));
  const hesRatio = Math.min(1, Math.max(0, (hesitationMs - 2000) / 5000));
  const severity = Math.max(velRatio, hesRatio);

  if (severity < 0.5) {
    // Soft emerald to amber
    const t = severity * 2;
    const r = Math.round(16 + (245 - 16) * t);
    const g = Math.round(185 + (158 - 185) * t);
    const b = Math.round(129 + (11 - 129) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Amber to red
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
  nextReconnectDelayMs = 0,
  onReconnect,
  telemetrySnapshot,
  subscribeTrajectory,
  threshold = 60,
  onSimulateSpike,
  onResetTelemetry,
  receivedComponentCount = 0,
  onOpenCodeDrawer
}) {
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [serverMetrics, setServerMetrics] = useState(null);
  const [loadingSessionApi, setLoadingSessionApi] = useState(false);

  const canvasRef = useRef(null);
  const pointsRef = useRef([]);

  const badge = STATUS_BADGE[wsStatus] || STATUS_BADGE[WS_STATUS.DISCONNECTED];
  const {
    metrics = {},
    cursor = { x: 0, y: 0 },
    instantScore = 0,
    rollingAverageScore = telemetrySnapshot?.cognitiveLoadScore ?? 0,
    activeFieldId,
    activeField,
    windowSampleCount = 0,
    lastSnapshotSentAt
  } = telemetrySnapshot || {};

  const currentField = activeFieldId || activeField || "";
  const isHighLoad = rollingAverageScore >= threshold;
  const isMidLoad = (rollingAverageScore >= 40 || instantScore >= 45) && !isHighLoad;

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
      if (pointsRef.current.length > 300) pointsRef.current.shift();
    });

    let animationFrameId;
    const TRAIL_LIFETIME_MS = 5000;

    const renderFrame = () => {
      const now = Date.now();
      pointsRef.current = pointsRef.current.filter((p) => now - p.time <= TRAIL_LIFETIME_MS);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const pts = pointsRef.current;
      if (pts.length > 1) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const ageRatio = 1 - (now - curr.time) / TRAIL_LIFETIME_MS;
          const alpha = Math.max(0.08, ageRatio * 0.85);

          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = getTrajectoryColor(curr.velocity, curr.hesitationMs, alpha);
          ctx.lineWidth = curr.isErratic ? 3 : 1.75;
          ctx.stroke();
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
      {heatmapEnabled && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="fixed inset-0 z-40 pointer-events-none"
        />
      )}

      {/* Top Minimalist White Dashboard Panel */}
      <header className="w-full bg-white rounded-2xl p-5 sm:p-6 mb-8 border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <span className="text-emerald-700 font-bold text-xs font-mono">AG</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-semibold text-slate-800 tracking-tight">
                  AuraGen Friction Engine
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Threshold: {threshold}
                </span>
                {isHighLoad && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    Friction Elevated
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Session <span className="font-mono text-slate-700">{sessionId}</span> &bull; Active Input:{" "}
                <span className="font-medium text-slate-800">{currentField || "None"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Connection Status Pill */}
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${badge.pill}`}>
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span>{badge.label}</span>
            </div>

            <button
              type="button"
              onClick={() => setHeatmapEnabled((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                heatmapEnabled
                  ? "bg-emerald-600 text-white border-emerald-700"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {heatmapEnabled ? "Heatmap On" : "Heatmap"}
            </button>

            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {debugOpen ? "Hide Diagnostics" : "Diagnostics"}
            </button>

            {wsStatus !== WS_STATUS.CONNECTED && (
              <button
                type="button"
                onClick={onReconnect}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                Reconnect
              </button>
            )}

            {receivedComponentCount > 0 && (
              <button
                type="button"
                onClick={onOpenCodeDrawer}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                Inspect Code ({receivedComponentCount})
              </button>
            )}
          </div>
        </div>

        {/* Cognitive Load Metric Bar & Telemetry Dimensions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5 items-center">
          {/* Main Dial Gauge (5-Second Rolling Average) */}
          <div className="lg:col-span-5 bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium text-[11px] uppercase tracking-wider">
                5s Rolling Cognitive Load
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">
                  Instant: <strong className={instantScore >= threshold ? "text-rose-600" : "text-slate-700"}>{instantScore}</strong>
                </span>
                <span
                  className={`font-bold text-sm tracking-tight ${
                    isHighLoad ? "text-rose-600" : isMidLoad ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {rollingAverageScore} / 100
                </span>
              </div>
            </div>

            {/* Clean Progress Bar */}
            <div className="relative w-full h-3 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isHighLoad
                    ? "bg-rose-500"
                    : isMidLoad
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, rollingAverageScore)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-700"
                style={{ left: `${threshold}%` }}
                title={`Morph Threshold: ${threshold}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Trigger Point: {threshold} pts</span>
              <span>
                {isHighLoad
                  ? "Sustained threshold satisfied"
                  : `${threshold - rollingAverageScore} pts below trigger`}
              </span>
            </div>
          </div>

          {/* 5 Clean Metrics Cards */}
          <div className="lg:col-span-4 grid grid-cols-5 gap-2 text-center">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Velocity</div>
              <div className="text-xs font-semibold text-slate-800 mt-1">
                {metrics.mouseVelocity ?? 0}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Hesitation</div>
              <div className="text-xs font-semibold text-slate-800 mt-1">
                {((metrics.hesitationMs ?? 0) / 1000).toFixed(1)}s
              </div>
            </div>

            <div
              className={`rounded-xl p-2.5 border transition-colors ${
                (metrics.rageClicks ?? 0) > 0
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-slate-50 border-slate-200/60 text-slate-800"
              }`}
            >
              <div className="text-[10px] text-slate-400 uppercase font-medium">Clicks</div>
              <div className="text-xs font-semibold mt-1">
                {metrics.rageClicks ?? 0}
              </div>
            </div>

            <div
              className={`rounded-xl p-2.5 border transition-colors ${
                (metrics.clickErrorCount ?? 0) > 0
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-slate-50 border-slate-200/60 text-slate-800"
              }`}
            >
              <div className="text-[10px] text-slate-400 uppercase font-medium">Errors</div>
              <div className="text-xs font-semibold mt-1">
                {metrics.clickErrorCount ?? 0}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Deflect</div>
              <div className="text-xs font-semibold text-slate-800 mt-1">
                {metrics.directionChanges ?? 0}
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="lg:col-span-3 flex flex-wrap lg:justify-end gap-2">
            <button
              type="button"
              onClick={onSimulateSpike}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
            >
              Simulate Friction
            </button>
            <button
              type="button"
              onClick={onResetTelemetry}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Floating Diagnostics Drawer */}
      {debugOpen && (
        <aside className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl p-5 text-xs space-y-3.5 border border-slate-200 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-800">Telemetry Diagnostics</span>
            </div>
            <button
              type="button"
              onClick={() => setDebugOpen(false)}
              className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-[9px] text-slate-400 font-sans uppercase">Rolling / Instant</div>
              <div className={`font-semibold ${isHighLoad ? "text-rose-600" : "text-slate-800"}`}>
                {rollingAverageScore} / {instantScore} ({windowSampleCount}w)
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-[9px] text-slate-400 font-sans uppercase">Clicks / Errors</div>
              <div className="font-semibold text-slate-800">
                {metrics.rageClicks ?? 0} rage &bull; {metrics.clickErrorCount ?? 0} err
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500">formStateSnapshot:</span>
            <span className={lastSnapshotSentAt ? "text-emerald-600 font-semibold" : "text-slate-500"}>
              {lastSnapshotSentAt ? "Transmitted" : `Armed (&ge; ${threshold})`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFetchSessionMetrics}
            disabled={loadingSessionApi}
            className="w-full py-2 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            {loadingSessionApi ? "Polling Session API..." : "Poll Session API"}
          </button>

          {serverMetrics && (
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-[10px] font-mono text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Packets:</span>
                <span className="font-semibold text-slate-800">{serverMetrics.packetCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Threshold Breaches:</span>
                <span className="font-semibold text-rose-600">{serverMetrics.thresholdBreaches}</span>
              </div>
              <div className="flex justify-between">
                <span>Peak Rolling Score:</span>
                <span className="font-semibold text-emerald-600">{serverMetrics.peakRollingScore}</span>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
