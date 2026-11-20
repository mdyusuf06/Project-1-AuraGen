"use client";

import React from "react";

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
  threshold = 70,
  onSimulateSpike,
  onResetTelemetry,
  receivedComponentCount,
  onOpenCodeDrawer
}) {
  const badge = STATUS_BADGE[wsStatus] || STATUS_BADGE.disconnected;
  const { metrics = {}, cognitiveLoadScore = 0, activeField = "" } =
    telemetrySnapshot || {};
  const isHighLoad = cognitiveLoadScore >= threshold;

  // Velocity variance standard deviation
  const velocityVariance = metrics.velocityVariance ?? 0;
  const velocityStdDev = Math.round(Math.sqrt(velocityVariance));

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90 text-slate-100 rounded-3xl border border-indigo-500/20 shadow-2xl p-5 sm:p-6 mb-8 backdrop-blur-xl">
      {/* Subtle ambient neon glow behind HUD */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Identity, FRUSTRATION DETECTED indicator & Connection Status */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 border border-indigo-400/30 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-indigo-500/30">
            AG
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                AuraGen Telemetry & Friction Engine
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Week 2 Calibrated
                </span>
              </h2>
              {isHighLoad && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-ping" />
                  FRUSTRATION DETECTED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Streaming real-time 10s rolling window with exponential smoothing</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400/90 font-medium">Auto-Healing Pipeline</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Field indicator badge */}
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-900/90 text-indigo-300 border border-indigo-500/20 shadow-inner">
            <span className="text-slate-400 mr-1.5 text-[11px] uppercase tracking-wider">Field:</span>
            <span className="font-semibold text-white truncate max-w-[150px]">
              {activeField || "None"}
            </span>
          </div>

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
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700/80 transition-all hover:border-slate-600 shadow-sm"
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

      {/* Metrics & Cognitive Load Gauge */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5 items-center">
        {/* Progress Bar & Score Display */}
        <div className="lg:col-span-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-300 font-semibold block text-xs">
                Cognitive Load Score
              </span>
              <span className="text-[10px] text-slate-400">
                Trigger Threshold: {threshold} / 100
              </span>
            </div>
            <div className="text-right">
              <span
                className={`font-black text-xl tracking-tight transition-colors duration-300 ${
                  isHighLoad
                    ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
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

          <div className="relative w-full h-3 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isHighLoad
                  ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                  : cognitiveLoadScore > threshold * 0.6
                  ? "bg-gradient-to-r from-emerald-500 to-amber-500"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-400"
              }`}
              style={{ width: `${Math.min(100, cognitiveLoadScore)}%` }}
            />
            {/* Threshold target line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] rounded-full"
              style={{ left: `${threshold}%` }}
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
        </div>

        {/* 5-Metric Breakdown: Velocity (with Variance), Hesitation, Rage Clicks, Click Error, Direction */}
        <div className="lg:col-span-5 grid grid-cols-3 sm:grid-cols-5 gap-2.5 text-center">
          {/* Card 1: Velocity & Variance */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2.5 border border-slate-800/80 transition-all hover:border-indigo-500/40 group">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
              Velocity
            </div>
            <div className="text-sm font-extrabold text-white mt-1">
              {metrics.mouseVelocity ?? 0}
              <span className="text-[9px] text-slate-400 font-normal ml-0.5">px/s</span>
            </div>
            <div className="text-[9px] text-indigo-400/90 font-medium mt-0.5 truncate" title={`Variance: ${velocityVariance}`}>
              σ: ±{velocityStdDev}
            </div>
          </div>

          {/* Card 2: Hesitation */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2.5 border border-slate-800/80 transition-all hover:border-indigo-500/40 group">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
              Hesitation
            </div>
            <div className="text-sm font-extrabold text-white mt-1">
              {((metrics.hesitationMs ?? 0) / 1000).toFixed(1)}s
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              {(metrics.hesitationMs ?? 0) > 4000 ? "Pause" : "Active"}
            </div>
          </div>

          {/* Card 3: Rage Clicks */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2.5 border border-slate-800/80 transition-all hover:border-rose-500/40 group">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-rose-300 transition-colors">
              Rage Clicks
            </div>
            <div
              className={`text-sm font-extrabold mt-1 ${
                (metrics.rageClicks ?? 0) > 0 ? "text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]" : "text-white"
              }`}
            >
              {metrics.rageClicks ?? 0}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              {(metrics.rageClicks ?? 0) > 0 ? "Burst" : "Normal"}
            </div>
          </div>

          {/* Card 4: Click Error Rate */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2.5 border border-slate-800/80 transition-all hover:border-rose-500/40 group">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-rose-300 transition-colors">
              Click Error
            </div>
            <div
              className={`text-sm font-extrabold mt-1 ${
                (metrics.clickErrorRate ?? 0) > 0.2
                  ? "text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                  : "text-white"
              }`}
            >
              {Math.round((metrics.clickErrorRate ?? 0) * 100)}%
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              {(metrics.clickErrorRate ?? 0) > 0.2 ? "Misclicks" : "Clean"}
            </div>
          </div>

          {/* Card 5: Direction Changes */}
          <div className="bg-slate-900/80 hover:bg-slate-800/80 rounded-2xl p-2.5 border border-slate-800/80 transition-all hover:border-indigo-500/40 group">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
              Direction
            </div>
            <div className="text-sm font-extrabold text-indigo-300 mt-1">
              {metrics.directionChanges ?? 0}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              {(metrics.directionChanges ?? 0) > 6 ? "Erratic" : "Smooth"}
            </div>
          </div>
        </div>

        {/* Manual Test Controls */}
        <div className="lg:col-span-3 flex flex-wrap lg:justify-end gap-2.5">
          <button
            type="button"
            onClick={onSimulateSpike}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Simulate Friction Spike
          </button>
          <button
            type="button"
            onClick={onResetTelemetry}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-xs font-semibold text-slate-300 border border-slate-700/80 transition-all hover:border-slate-600"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
