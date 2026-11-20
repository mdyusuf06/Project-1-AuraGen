"use client";

import React, { useMemo } from "react";

const STATUS_BADGE = {
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

export default function TelemetryHUD({
  wsStatus,
  reconnectAttempt,
  onReconnect,
  telemetrySnapshot,
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
  receivedComponentCount,
  onOpenCodeDrawer
}) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const badge = STATUS_BADGE[wsStatus] || STATUS_BADGE.disconnected;

  const {
    metrics = {},
    normalizedMetrics = {},
    cognitiveLoadScore = 0,
    rawScore = 0,
    activeField = "",
    isTriggered = false,
    isCooldownActive = false,
    cooldownRemaining = 0,
    hasMinimumActivity = false
  } = telemetrySnapshot || {};

  const isThresholdReached = cognitiveLoadScore >= threshold;

  // Velocity variance standard deviation
  const velocityVariance = metrics.velocityVariance ?? 0;
  const velocityStdDev = Math.round(Math.sqrt(velocityVariance));

  // Normalized channel percentages (0 - 100)
  const normVariance = normalizedMetrics.velocityVariance ?? 0;
  const normHesitation = normalizedMetrics.hesitation ?? 0;
  const normRageClicks = normalizedMetrics.rageClicks ?? 0;
  const normClickErrors = normalizedMetrics.clickErrorRate ?? 0;
  const normDirection = normalizedMetrics.directionChanges ?? 0;

  // Build SVG Sparkline chart path for Cognitive Load Score over time
  const sparklineData = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return { path: "", area: "", points: [], thresholdY: 60 };
    }

    const width = 320;
    const height = 75;
    const padding = 6;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    const points = telemetryHistory.map((item, idx) => {
      const x =
        padding +
        (idx / Math.max(1, telemetryHistory.length - 1)) * innerWidth;
      const score = Math.max(0, Math.min(100, item.score ?? 0));
      const y = padding + innerHeight - (score / 100) * innerHeight;
      return { x, y, score };
    });

    const thresholdY = padding + innerHeight - (threshold / 100) * innerHeight;

    const path = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const firstX = points[0]?.x ?? padding;
    const lastX = points[points.length - 1]?.x ?? width - padding;
    const bottomY = height - padding;
    const area = `${path} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { path, area, points, thresholdY, width, height };
  }, [telemetryHistory, threshold]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90 text-slate-100 rounded-3xl border border-indigo-500/25 shadow-2xl p-5 sm:p-6 mb-8 backdrop-blur-xl transition-all">
      {/* Ambient background glows */}
      <div className="absolute -top-28 -left-28 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Identity, Status Badges, Threshold Indicator */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 border border-indigo-400/40 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-indigo-500/30">
            AG
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                AuraGen Telemetry & Friction Engine
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Week 2 Calibrated
                </span>
              </h2>

              {/* Requirement 7: Show whether confusion threshold has been reached */}
              {isThresholdReached ? (
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-[0_0_14px_rgba(244,63,94,0.5)] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-ping" />
                  THRESHOLD REACHED (CONFUSED)
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                  THRESHOLD NOT REACHED (NORMAL)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Streaming real-time 10s rolling telemetry</span>
              <span className="text-slate-600">•</span>
              <span>Dev Simulator Ready</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-medium">Auto-Healing Pipeline</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active Field indicator badge */}
          <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/90 text-indigo-300 border border-indigo-500/20 shadow-inner">
            <span className="text-slate-400 mr-1.5 text-[11px] uppercase tracking-wider">Field:</span>
            <span className="font-semibold text-white truncate max-w-[130px]">
              {activeField || "None"}
            </span>
          </div>

          {/* Activity Gate Badge */}
          {hasMinimumActivity ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Activity: Active</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/70 text-slate-400 border border-slate-700/50">
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
              <span>Awaiting Activity</span>
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
              <span>Trigger: Ready</span>
            </div>
          )}

          {/* WebSocket Status Badge */}
          <div
            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-sm ${badge.pill}`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <span>
              {badge.label}
              {wsStatus === "reconnecting" && reconnectAttempt > 0
                ? ` (#${reconnectAttempt})`
                : ""}
            </span>
          </div>

          {wsStatus !== "connected" && (
            <button
              type="button"
              onClick={onReconnect}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all shadow-sm"
            >
              Retry Connect
            </button>
          )}

          {receivedComponentCount > 0 && (
            <button
              type="button"
              onClick={onOpenCodeDrawer}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              View Generated Code ({receivedComponentCount})
            </button>
          )}
        </div>
      </div>

      {/* Main Telemetry Cockpit Grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5 items-center">
        {/* Requirement 6: Display Cognitive Load Score in real time with gauge */}
        <div className="lg:col-span-4 bg-slate-900/70 p-4 rounded-2xl border border-slate-800/90 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-300 font-bold block text-xs tracking-wide">
                Cognitive Load Score
              </span>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                <span>Threshold: <strong className="text-indigo-300">{threshold}</strong></span>
                <span>•</span>
                <span>Raw: <strong className="text-slate-300">{rawScore}</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`font-black text-2xl tracking-tight transition-colors duration-300 ${
                  isThresholdReached
                    ? "text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                    : cognitiveLoadScore > threshold * 0.6
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {cognitiveLoadScore}
              </span>
              <span className="text-xs text-slate-400 ml-1">/ 100</span>
            </div>
          </div>

          {/* Smooth score progress bar with target threshold marker */}
          <div className="relative w-full h-3.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isThresholdReached
                  ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                  : cognitiveLoadScore > threshold * 0.6
                  ? "bg-gradient-to-r from-emerald-500 to-amber-500"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-400"
              }`}
              style={{ width: `${Math.min(100, cognitiveLoadScore)}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_rgba(255,255,255,0.95)] rounded-full z-10"
              style={{ left: `${Math.min(100, Math.max(0, threshold))}%` }}
              title={`Trigger Threshold: ${threshold}`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Optimal Flow
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Friction
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Self-Healing
            </span>
          </div>

          {/* Configurable Threshold Selector for Testing */}
          {onThresholdChange && (
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Test Threshold:</span>
              <div className="flex items-center gap-1.5">
                {[50, 70, 85].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onThresholdChange(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      threshold === lvl
                        ? "bg-indigo-600 text-white shadow-sm"
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

        {/* 5-Metric Normalized Cockpit Cards: Variance, Hesitation, Rage Clicks, Click Errors, Direction */}
        <div className="lg:col-span-4 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          {/* Card 1: Velocity Variance (25% weight) */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2 border border-slate-800 transition-all hover:border-indigo-500/40 group flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
                Variance
              </div>
              <div className="text-sm font-extrabold text-white mt-1">
                ±{velocityStdDev}
                <span className="text-[8px] text-slate-400 font-normal ml-0.5">px/s</span>
              </div>
              <div className="text-[9px] text-indigo-400/90 font-medium truncate mt-0.5">
                {normVariance}% norm
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${normVariance}%` }}
              />
            </div>
          </div>

          {/* Card 2: Hesitation (25% weight) */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2 border border-slate-800 transition-all hover:border-indigo-500/40 group flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
                Hesitation
              </div>
              <div className="text-sm font-extrabold text-white mt-1">
                {((metrics.hesitationMs ?? 0) / 1000).toFixed(1)}s
              </div>
              <div className="text-[9px] text-indigo-400/90 font-medium truncate mt-0.5">
                {normHesitation}% norm
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${normHesitation}%` }}
              />
            </div>
          </div>

          {/* Card 3: Rage Clicks (20% weight) */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2 border border-slate-800 transition-all hover:border-rose-500/40 group flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-rose-300 transition-colors">
                Rage Clicks
              </div>
              <div
                className={`text-sm font-extrabold mt-1 ${
                  (metrics.rageClicks ?? 0) > 0 ? "text-rose-400" : "text-white"
                }`}
              >
                {metrics.rageClicks ?? 0}
              </div>
              <div className="text-[9px] text-rose-400/90 font-medium truncate mt-0.5">
                {normRageClicks}% norm
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${normRageClicks}%` }}
              />
            </div>
          </div>

          {/* Card 4: Click Error Rate (10% weight) */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2 border border-slate-800 transition-all hover:border-rose-500/40 group flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-rose-300 transition-colors">
                Errors
              </div>
              <div
                className={`text-sm font-extrabold mt-1 ${
                  (metrics.clickErrorRate ?? 0) > 0.2 ? "text-rose-400" : "text-white"
                }`}
              >
                {Math.round((metrics.clickErrorRate ?? 0) * 100)}%
              </div>
              <div className="text-[9px] text-rose-400/90 font-medium truncate mt-0.5">
                {normClickErrors}% norm
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${normClickErrors}%` }}
              />
            </div>
          </div>

          {/* Card 5: Direction Changes (20% weight) */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2 border border-slate-800 transition-all hover:border-indigo-500/40 group flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
                Direction
              </div>
              <div className="text-sm font-extrabold text-indigo-300 mt-1">
                {metrics.directionChanges ?? 0}
              </div>
              <div className="text-[9px] text-indigo-400/90 font-medium truncate mt-0.5">
                {normDirection}% norm
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${normDirection}%` }}
              />
            </div>
          </div>
        </div>

        {/* Real-time Telemetry Timeline Chart */}
        <div className="lg:col-span-4 bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 backdrop-blur-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/60">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Live Cognitive Load Timeline
            </span>
            <span className="text-[10px] text-slate-400">
              {telemetryHistory.length} sec buffer
            </span>
          </div>

          {/* SVG Sparkline Area Chart */}
          <div className="relative w-full h-[68px] my-1 flex items-center justify-center overflow-hidden">
            {sparklineData.points.length > 1 ? (
              <svg
                viewBox={`0 0 ${sparklineData.width || 320} ${sparklineData.height || 75}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isThresholdReached ? "#f43f5e" : "#6366f1"}
                      stopOpacity="0.4"
                    />
                    <stop
                      offset="100%"
                      stopColor={isThresholdReached ? "#f43f5e" : "#6366f1"}
                      stopOpacity="0.0"
                    />
                  </linearGradient>
                </defs>

                {/* Threshold line */}
                <line
                  x1="0"
                  y1={sparklineData.thresholdY}
                  x2={sparklineData.width || 320}
                  y2={sparklineData.thresholdY}
                  stroke="#fb7185"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />

                {/* Area fill */}
                <path d={sparklineData.area} fill="url(#scoreGradient)" />

                {/* Line stroke */}
                <path
                  d={sparklineData.path}
                  fill="none"
                  stroke={isThresholdReached ? "#f43f5e" : "#818cf8"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Latest point dot */}
                {sparklineData.points.length > 0 && (
                  <circle
                    cx={sparklineData.points[sparklineData.points.length - 1].x}
                    cy={sparklineData.points[sparklineData.points.length - 1].y}
                    r="4"
                    fill={isThresholdReached ? "#f43f5e" : "#a5b4fc"}
                    className="drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                  />
                )}
              </svg>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center justify-center h-full">
                Sampling real-time telemetry stream...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="text-rose-400/90 font-medium">--- Threshold ({threshold})</span>
            {onExportCSV && (
              <button
                type="button"
                onClick={onExportCSV}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-colors"
                title="Download full telemetry time-series as CSV"
              >
                Export CSV Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Requirement 5 & 9: Development-Only Confusion Simulator Controls */}
      <div className="relative mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Dev Only
            </span>
            Telemetry Simulator:
          </span>
          {simulationMode !== "idle" && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border animate-pulse ${
                simulationMode === "confused"
                  ? "bg-rose-950 text-rose-300 border-rose-500/50"
                  : "bg-emerald-950 text-emerald-300 border-emerald-500/50"
              }`}
            >
              Simulating: {simulationMode.toUpperCase()}
            </span>
          )}
          {!isDevelopment && (
            <span className="text-[10px] text-slate-500 italic">
              (Controls disabled in production)
            </span>
          )}
        </div>

        {/* Action Button Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Button 1: Simulate Confused User */}
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

          {/* Button 2: Simulate Calm User */}
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

          {/* Button 3: Stop Simulation */}
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

          {/* Quick Friction Spike & Reset */}
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
  );
}