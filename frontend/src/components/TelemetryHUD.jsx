"use client";

import React from "react";
import CognitiveScoreGauge from "./CognitiveScoreGauge.jsx";
import TelemetryAnalyticsChart from "./TelemetryAnalyticsChart.jsx";

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
  onOpenCodeDrawer,
  analyticsSummary
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

  return (
    <div className="relative overflow-hidden bg-[#080B16] text-slate-100 rounded-3xl border border-indigo-500/30 shadow-[0_0_50px_rgba(8,11,22,0.8)] p-5 sm:p-7 mb-8 backdrop-blur-2xl transition-all">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#8057FF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#25D9E8]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Identity, Status Badges, Threshold Indicator */}
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
              <span>10s Rolling Window</span>
              <span className="text-slate-600">•</span>
              <span>Exponential Smoothing (α=0.35)</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-medium">Real-time Self-Healing</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active Field indicator badge */}
          <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-[#11172A] text-indigo-300 border border-indigo-500/20 shadow-inner">
            <span className="text-slate-400 mr-1.5 text-[11px] uppercase tracking-wider">Field:</span>
            <span className="font-semibold text-white truncate max-w-[140px]">
              {activeField || "General"}
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
              <span>Trigger: Armed</span>
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
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6 items-stretch">
        {/* Task 2: Large Circular Cognitive Load Score Card */}
        <div className="lg:col-span-4 flex flex-col">
          <CognitiveScoreGauge
            score={cognitiveLoadScore}
            rawScore={rawScore}
            threshold={threshold}
            isTriggered={isTriggered}
            simulationMode={simulationMode}
            hasMinimumActivity={hasMinimumActivity}
            cooldownActive={isCooldownActive}
            cooldownRemaining={cooldownRemaining}
          />
        </div>

        {/* Task 1 & 5: 5-Metric Normalized Cockpit Cards + Threshold Selector */}
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

          {/* Configurable Threshold Selector */}
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

        {/* Task 4: Real-time Telemetry Analytics Chart */}
        <div className="lg:col-span-4 flex flex-col">
          <TelemetryAnalyticsChart
            telemetryHistory={telemetryHistory}
            threshold={threshold}
            activeField={activeField}
            metrics={metrics}
            normalizedMetrics={normalizedMetrics}
            analyticsSummary={analyticsSummary}
            onExportCSV={onExportCSV}
          />
        </div>
      </div>

      {/* Task 5: Calm vs Confused Telemetry Comparison Banner */}
      <div className="relative mt-6 p-3.5 rounded-2xl bg-[#11172A]/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400">
            Telemetry Benchmark:
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
              Calm Baseline: ~8–18 pts
            </span>
            <span className="text-slate-600 font-bold">vs</span>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-semibold">
              Confused Spike: &ge; 75–88 pts
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">
            Threshold: <strong className="text-violet-400">{threshold} pts</strong>
          </span>
          <span className="text-slate-400">
            Current Score:{" "}
            <strong className={cognitiveLoadScore >= threshold ? "text-rose-400" : "text-cyan-400"}>
              {cognitiveLoadScore} pts
            </strong>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 font-medium">
            Status:{" "}
            {cognitiveLoadScore >= threshold ? (
              <span className="text-rose-400 font-bold">🚨 Threshold Exceeded</span>
            ) : cognitiveLoadScore >= 45 ? (
              <span className="text-amber-400 font-bold">⚠️ Elevated Friction</span>
            ) : (
              <span className="text-emerald-400 font-bold">✓ Optimal Flow</span>
            )}
          </span>
        </div>
      </div>

      {/* Task 3: Interactive Confusion Simulator Controls */}
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
