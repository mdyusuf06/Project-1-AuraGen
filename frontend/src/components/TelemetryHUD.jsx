"use client";

import React from "react";

const STATUS_BADGE = {
  connected: {
    label: "WS Connected",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  connecting: {
    label: "Connecting...",
    dot: "bg-amber-400 animate-pulse",
    pill: "bg-amber-50 text-amber-700 border-amber-200"
  },
  reconnecting: {
    label: "Reconnecting",
    dot: "bg-amber-500 animate-ping",
    pill: "bg-amber-50 text-amber-800 border-amber-200"
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 border-rose-200"
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

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl p-4 sm:p-5 mb-6">
      {/* Top Header: Identity, FRUSTRATION DETECTED indicator & Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
            AG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-white">
                AuraGen Telemetry & Friction Engine
              </h2>
              {isHighLoad && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  FRUSTRATION DETECTED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Streaming real-time 10s rolling-window cognitive load metrics over WebSocket
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Field indicator badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-indigo-300 border border-slate-700 max-w-[180px] truncate">
            <span className="text-slate-400 mr-1.5">Field:</span>
            <span className="font-semibold truncate">{activeField || "—"}</span>
          </div>

          <div
            className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${badge.pill}`}
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

      {/* Metrics & Cognitive Load Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 items-center">
        {/* Progress Bar & Score Display */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              Cognitive Load Score (Threshold: {threshold})
            </span>
            <span
              className={`font-bold text-sm ${
                isHighLoad ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {cognitiveLoadScore} / 100
            </span>
          </div>
          <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isHighLoad
                  ? "bg-rose-500"
                  : cognitiveLoadScore > threshold * 0.6
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, cognitiveLoadScore)}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/70"
              style={{ left: `${threshold}%` }}
              title={`Trigger Threshold: ${threshold}`}
            />
          </div>
        </div>

        {/* 5-Metric Breakdown: Velocity, Hesitation, Rage Clicks, Click Error Rate, Direction Changes */}
        <div className="lg:col-span-5 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Velocity
            </div>
            <div className="text-xs font-semibold text-white mt-0.5">
              {metrics.mouseVelocity ?? 0} <span className="text-[9px] text-slate-400">px/s</span>
            </div>
          </div>

          <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Hesitation
            </div>
            <div className="text-xs font-semibold text-white mt-0.5">
              {((metrics.hesitationMs ?? 0) / 1000).toFixed(1)}s
            </div>
          </div>

          <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Rage Clicks
            </div>
            <div
              className={`text-xs font-semibold mt-0.5 ${
                (metrics.rageClicks ?? 0) > 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {metrics.rageClicks ?? 0}
            </div>
          </div>

          <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Click Error
            </div>
            <div
              className={`text-xs font-semibold mt-0.5 ${
                (metrics.clickErrorRate ?? 0) > 0.3
                  ? "text-rose-400"
                  : "text-white"
              }`}
            >
              {Math.round((metrics.clickErrorRate ?? 0) * 100)}%
            </div>
          </div>

          <div className="bg-slate-800/70 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Direction
            </div>
            <div className="text-xs font-semibold text-indigo-300 mt-0.5">
              {metrics.directionChanges ?? 0}
            </div>
          </div>
        </div>

        {/* Manual Test Controls */}
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
  );
}
