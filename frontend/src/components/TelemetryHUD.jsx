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
  const { metrics, cognitiveLoadScore, activeField } = telemetrySnapshot;
  const isHighLoad = cognitiveLoadScore >= threshold;

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl p-4 sm:p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
            AG
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              AuraGen Telemetry & Friction Engine
            </h2>
            <p className="text-xs text-slate-400">
              Streaming real-time cognitive load metrics over WebSocket
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
              title={activeField || "None"}
            >
              {activeField || "—"}
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
  );
}

