"use client";

import React, { useState, useEffect, useRef } from "react";
import { WS_STATUS } from "../hooks/useWebSocket";
import CognitiveScoreGauge from "./CognitiveScoreGauge.jsx";
import TelemetryAnalyticsChart from "./TelemetryAnalyticsChart.jsx";

const STATUS_BADGE = {
  [WS_STATUS.CONNECTED]: {
    label: "WS Connected",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    pill: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
  },
  [WS_STATUS.CONNECTING]: {
    label: "Connecting...",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse",
    pill: "bg-amber-950/60 text-amber-300 border-amber-500/40"
  },
  [WS_STATUS.RECONNECTING]: {
    label: "Reconnecting",
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-ping",
    pill: "bg-rose-950/60 text-rose-300 border-rose-500/40"
  },
  [WS_STATUS.DISCONNECTED]: {
    label: "Disconnected",
    dot: "bg-slate-500",
    pill: "bg-slate-800 text-slate-400 border-slate-700"
  },
  connected: {
    label: "WS Connected",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    pill: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
  },
  connecting: {
    label: "Connecting...",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse",
    pill: "bg-amber-950/60 text-amber-300 border-amber-500/40"
  },
  reconnecting: {
    label: "Reconnecting",
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-ping",
    pill: "bg-rose-950/60 text-rose-300 border-rose-500/40"
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-slate-500",
    pill: "bg-slate-800 text-slate-400 border-slate-700"
  }
};

/**
 * Interpolates trajectory stroke color from Green (smooth) -> Amber -> Red (erratic/hesitant).
 */
function getTrajectoryColor(velocity, hesitationMs, alpha) {
  const velRatio = Math.min(1, Math.max(0, (velocity - 150) / 700));
  const hesRatio = Math.min(1, Math.max(0, (hesitationMs - 2000) / 5000));
  const severity = Math.max(velRatio, hesRatio);

  if (severity < 0.5) {
    const t = severity * 2;
    const r = Math.round(34 + (245 - 34) * t);
    const g = Math.round(197 + (158 - 197) * t);
    const b = Math.round(94 + (11 - 94) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

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
  telemetryHistory = [],
  simulationMode = "idle",
  onSimulateConfused,
  onSimulateCalm,
  onStopSimulation,
  onExportCSV,
  threshold = 70,
  onThresholdChange,
  onSimulateSpike,
  onResetTelemetry,
  receivedComponentCount = 0,
  onOpenCodeDrawer,
  analyticsSummary
}) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [debugOpen, setDebugOpen] = useState(true);
  const [serverMetrics, setServerMetrics] = useState(null);
  const [loadingSessionApi, setLoadingSessionApi] = useState(false);

  const canvasRef = useRef(null);
  const pointsRef = useRef([]);

  const badge = STATUS_BADGE[wsStatus] || STATUS_BADGE[WS_STATUS.DISCONNECTED] || STATUS_BADGE.disconnected;

  const {
    metrics = {},
    normalizedMetrics = {},
    cursor = { x: 0, y: 0 },
    instantScore = 0,
    rawScore = 0,
    rollingAverageScore = telemetrySnapshot?.cognitiveLoadScore ?? 0,
    cognitiveLoadScore = 0,
    activeField = "",
    activeFieldId = "",
    isTriggered = false,
    isCooldownActive = false,
    cooldownRemaining = 0,
    hasMinimumActivity = false,
    windowSampleCount = 0,
    lastSnapshotSentAt = null
  } = telemetrySnapshot || {};

  const currentField = activeFieldId || activeField || "";
  const effectiveScore = cognitiveLoadScore || rollingAverageScore;
  const isThresholdReached = effectiveScore >= threshold;

  // Velocity variance standard deviation
  const velocityVariance = metrics.velocityVariance ?? 0;
  const velocityStdDev = Math.round(Math.sqrt(velocityVariance));

  // Normalized channel percentages (0 - 100)
  const normVariance = normalizedMetrics.velocityVariance ?? 0;
  const normHesitation = normalizedMetrics.hesitation ?? 0;
  const normRageClicks = normalizedMetrics.rageClicks ?? 0;
  const normClickErrors = normalizedMetrics.clickErrorRate ?? 0;
  const normDirection = normalizedMetrics.directionChanges ?? 0;

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

      {/* Main Cockpit Card */}
      <div className="relative overflow-hidden bg-[#080B16] text-slate-100 rounded-3xl border border-indigo-500/30 shadow-[0_0_50px_rgba(8,11,22,0.8)] p-5 sm:p-7 mb-8 backdrop-blur-2xl transition-all">
        {/* Ambient background glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#8057FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#25D9E8]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Identity, Status Badges, Action Controls */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#8057FF] to-[#25D9E8] border border-indigo-400/40 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30">
              AG
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  AuraGen Cognitive Telemetry Engine
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Week 2 Calibrated
                  </span>
                </h2>

                {isThresholdReached ? (
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-[0_0_14px_rgba(244,63,94,0.5)] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-ping" />
                    FRICTION THRESHOLD EXCEEDED
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                    OPTIMAL COGNITIVE CADENCE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>Session <strong className="font-mono text-indigo-300">{sessionId}</strong></span>
                <span className="text-slate-600">•</span>
                <span>5s Sliding + 10s Rolling</span>
                <span className="text-slate-600">•</span>
                <span>formStateSnapshot Armed</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Active Field indicator badge */}
            <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-[#11172A] text-indigo-300 border border-indigo-500/20 shadow-inner">
              <span className="text-slate-400 mr-1.5 text-[11px] uppercase tracking-wider">Field:</span>
              <span className="font-semibold text-white truncate max-w-[140px]">
                {currentField || "General"}
              </span>
            </div>

            {/* Activity Gate Badge */}
            {hasMinimumActivity ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Active</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/70 text-slate-400 border border-slate-700/50">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                <span>Awaiting</span>
              </div>
            )}

            {/* Cooldown Status Badge */}
            {isCooldownActive ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Cooldown: {cooldownRemaining}s</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-950/40 text-indigo-300/90 border border-indigo-500/20">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Armed</span>
              </div>
            )}

            {/* WebSocket Status Badge */}
            <div
              className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-sm ${badge.pill}`}
            >
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span>
                {badge.label}
                {(wsStatus === WS_STATUS.RECONNECTING || wsStatus === "reconnecting") && reconnectAttempt > 0
                  ? ` (#${reconnectAttempt})`
                  : ""}
              </span>
            </div>

            {/* Heatmap Toggle Button */}
            <button
              type="button"
              onClick={() => setHeatmapEnabled((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                heatmapEnabled
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-600/30 shadow-md"
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
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
              >
                Clear Trail
              </button>
            )}

            {/* Debug HUD Toggle Button */}
            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all shadow-sm"
            >
              {debugOpen ? "Hide HUD" : "Show HUD"}
            </button>

            {/* Retry Connect if disconnected */}
            {wsStatus !== WS_STATUS.CONNECTED && wsStatus !== "connected" && (
              <button
                type="button"
                onClick={onReconnect}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all shadow-sm"
              >
                Retry Connect
              </button>
            )}

            {/* View Generated Code Drawer Button */}
            {receivedComponentCount > 0 && (
              <button
                type="button"
                onClick={onOpenCodeDrawer}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all"
              >
                Inspect Code ({receivedComponentCount})
              </button>
            )}
          </div>
        </div>

        {/* Main Telemetry Cockpit Grid */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6 items-stretch">
          {/* Column 1: Large Circular Cognitive Load Score Card */}
          <div className="lg:col-span-4 flex flex-col">
            <CognitiveScoreGauge
              score={effectiveScore}
              rawScore={rawScore}
              threshold={threshold}
              isTriggered={isTriggered}
              simulationMode={simulationMode}
              hasMinimumActivity={hasMinimumActivity}
              cooldownActive={isCooldownActive}
              cooldownRemaining={cooldownRemaining}
            />
          </div>

          {/* Column 2: 5-Metric Normalized Cockpit Cards + Threshold Selector */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 text-center">
              {/* Metric 1: Velocity Variance (25% weight) */}
              <div className="bg-[#11172A]/85 hover:bg-[#171E33] rounded-2xl p-3 border border-slate-800 transition-all hover:border-indigo-500/40 group flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
                    Velocity Variance (25%)
                  </div>
                  <div className="text-base font-extrabold text-white mt-1">
                    ±{velocityStdDev}
                    <span className="text-[9px] text-slate-400 font-normal ml-0.5">px/s</span>
                  </div>
                  <div className="text-[10px] text-indigo-400 font-medium truncate mt-0.5">
                    {normVariance}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${normVariance}%` }}
                  />
                </div>
              </div>

              {/* Metric 2: Hesitation (25% weight) */}
              <div className="bg-[#11172A]/85 hover:bg-[#171E33] rounded-2xl p-3 border border-slate-800 transition-all hover:border-indigo-500/40 group flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
                    Hesitation (25%)
                  </div>
                  <div className="text-base font-extrabold text-white mt-1">
                    {((metrics.hesitationMs ?? 0) / 1000).toFixed(1)}s
                  </div>
                  <div className="text-[10px] text-indigo-400 font-medium truncate mt-0.5">
                    {normHesitation}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${normHesitation}%` }}
                  />
                </div>
              </div>

              {/* Metric 3: Rage Clicks (20% weight) */}
              <div className="bg-[#11172A]/85 hover:bg-[#171E33] rounded-2xl p-3 border border-slate-800 transition-all hover:border-rose-500/40 group flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-rose-300 transition-colors">
                    Rage Clicks (20%)
                  </div>
                  <div
                    className={`text-base font-extrabold mt-1 ${
                      (metrics.rageClicks ?? 0) > 0 ? "text-rose-400" : "text-white"
                    }`}
                  >
                    {metrics.rageClicks ?? 0}
                  </div>
                  <div className="text-[10px] text-rose-400 font-medium truncate mt-0.5">
                    {normRageClicks}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${normRageClicks}%` }}
                  />
                </div>
              </div>

              {/* Metric 4: Click Error Rate (10% weight) */}
              <div className="bg-[#11172A]/85 hover:bg-[#171E33] rounded-2xl p-3 border border-slate-800 transition-all hover:border-rose-500/40 group flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-rose-300 transition-colors">
                    Error Rate (10%)
                  </div>
                  <div
                    className={`text-base font-extrabold mt-1 ${
                      (metrics.clickErrorRate ?? 0) > 0.2 ? "text-rose-400" : "text-white"
                    }`}
                  >
                    {Math.round((metrics.clickErrorRate ?? 0) * 100)}%
                  </div>
                  <div className="text-[10px] text-rose-400 font-medium truncate mt-0.5">
                    {normClickErrors}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${normClickErrors}%` }}
                  />
                </div>
              </div>

              {/* Metric 5: Direction Changes (20% weight) */}
              <div className="bg-[#11172A]/85 hover:bg-[#171E33] rounded-2xl p-3 border border-slate-800 transition-all hover:border-indigo-500/40 group flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
                      Direction Changes (20%)
                    </div>
                    <div className="text-base font-extrabold text-indigo-300 mt-0.5">
                      {metrics.directionChanges ?? 0} changes
                    </div>
                  </div>
                  <div className="text-[10px] text-indigo-400 font-semibold">
                    {normDirection}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${normDirection}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Configurable Trigger Threshold Selector */}
            {onThresholdChange && (
              <div className="p-3 bg-[#11172A]/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-300 block text-xs">Trigger Threshold</span>
                  <span className="text-[10px] text-slate-400">Score &gt;= threshold invokes code-gen</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[50, 70, 85].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => onThresholdChange(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        threshold === lvl
                          ? "bg-[#8057FF] text-white shadow-md shadow-indigo-600/40 scale-105"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Real-time Telemetry Analytics Chart */}
          <div className="lg:col-span-4 flex flex-col">
            <TelemetryAnalyticsChart
              telemetryHistory={telemetryHistory}
              threshold={threshold}
              activeField={currentField}
              metrics={metrics}
              normalizedMetrics={normalizedMetrics}
              analyticsSummary={analyticsSummary}
              onExportCSV={onExportCSV}
            />
          </div>
        </div>

        {/* Bottom Dev Lab Simulator Controls */}
        <div className="relative mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Interactive Dev Lab
              </span>
              Telemetry Simulator:
            </span>
            {simulationMode !== "idle" && (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border animate-pulse ${
                  simulationMode === "confused"
                    ? "bg-rose-950 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                    : "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                }`}
              >
                Simulating: {simulationMode.toUpperCase()}
              </span>
            )}
            {!isDevelopment && (
              <span className="text-[10px] text-slate-500 italic">
                (Simulator controls disabled in production)
              </span>
            )}
          </div>

          {/* Action Button Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!isDevelopment}
              onClick={onSimulateConfused}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none ${
                !isDevelopment
                  ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-50"
                  : simulationMode === "confused"
                  ? "bg-rose-600 text-white shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse"
                  : "bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              Simulate Confused User
            </button>

            <button
              type="button"
              disabled={!isDevelopment}
              onClick={onSimulateCalm}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                !isDevelopment
                  ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-50"
                  : simulationMode === "calm"
                  ? "bg-emerald-600 text-white shadow-emerald-600/40 ring-2 ring-emerald-400 animate-pulse"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              Simulate Calm User
            </button>

            <button
              type="button"
              disabled={!isDevelopment}
              onClick={onStopSimulation}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none ${
                !isDevelopment
                  ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-50"
                  : simulationMode !== "idle"
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              Stop Simulation
            </button>

            <button
              type="button"
              onClick={onSimulateSpike}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700/80 transition-all hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            >
              1-Click Spike
            </button>

            <button
              type="button"
              onClick={onResetTelemetry}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400 border border-slate-700/80 transition-all hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
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
              <div className="text-[10px] text-slate-400">ROLLING / INST</div>
              <div className={`font-semibold ${isThresholdReached ? "text-rose-400" : "text-emerald-400"}`}>
                {effectiveScore} / {instantScore} ({windowSampleCount}w)
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
                {cursor.x},{cursor.y} • {metrics.mouseVelocity ?? 0}px/s
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
                  <div>Peak: {serverMetrics.peakRollingScore} | Avg: {serverMetrics.averages?.rollingAverageScore}</div>
                </>
              )}
            </div>
          )}
        </aside>
      )}
    </>
  );
}
