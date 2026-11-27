"use client";

import React, { useMemo } from "react";

/**
 * TelemetryAnalyticsChart:
 * Clean, breathable Light Mode SVG time-series analytics card.
 */
export default function TelemetryAnalyticsChart({
  telemetryHistory = [],
  threshold = 60,
  activeField = "annualIncome",
  metrics = {},
  normalizedMetrics = {},
  analyticsSummary = null,
  onExportCSV
}) {
  const width = 480;
  const height = 130;
  const padding = 12;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const chartData = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return { path: "", area: "", points: [], triggers: [], thresholdY: 60 };
    }

    const len = telemetryHistory.length;
    const points = telemetryHistory.map((item, idx) => {
      const x = padding + (idx / Math.max(1, len - 1)) * innerWidth;
      const score = Math.max(0, Math.min(100, item.score ?? 0));
      const y = padding + innerHeight - (score / 100) * innerHeight;
      const isTrigger = Boolean(item.isTriggered || item.isThresholdReached || score >= threshold);
      return { x, y, score, isTrigger, timeSeconds: item.timeSeconds };
    });

    const thresholdY = padding + innerHeight - (threshold / 100) * innerHeight;

    const path = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const firstX = points[0]?.x ?? padding;
    const lastX = points[points.length - 1]?.x ?? width - padding;
    const bottomY = height - padding;
    const area = `${path} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    const triggers = points.filter((p) => p.isTrigger);

    return { path, area, points, triggers, thresholdY };
  }, [telemetryHistory, threshold, innerWidth, innerHeight, padding, height, width]);

  const stats = useMemo(() => {
    if (analyticsSummary) return analyticsSummary;
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return { avgScore: 0, peakScore: 0, triggerCount: 0, totalSamples: 0 };
    }
    const scores = telemetryHistory.map((h) => h.score ?? 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    return {
      avgScore: Math.round(sum / scores.length),
      peakScore: Math.max(...scores),
      triggerCount: telemetryHistory.filter((h) => h.isThresholdReached || h.isTriggered).length,
      totalSamples: telemetryHistory.length
    };
  }, [analyticsSummary, telemetryHistory]);

  const latestPoint = chartData.points[chartData.points.length - 1] || null;

  return (
    <div className="flex flex-col justify-between p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 shadow-sm h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Cognitive Load Trend
          </h3>
          <span className="text-[11px] text-slate-500">
            Field: <strong className="text-emerald-700 font-semibold">{activeField || "General"}</strong> • 60s buffer
          </span>
        </div>

        {onExportCSV && (
          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors shadow-sm"
            title="Export full time-series telemetry as CSV"
          >
            <span>↓</span>
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-2 my-3 text-center">
        <div className="bg-white p-2 rounded-xl border border-slate-200/80">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Average</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            {stats.avgScore} <span className="text-[9px] font-normal text-slate-400">pts</span>
          </div>
        </div>
        <div className="bg-white p-2 rounded-xl border border-slate-200/80">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Peak</div>
          <div className={`text-sm font-bold mt-0.5 ${stats.peakScore >= threshold ? "text-rose-600" : "text-emerald-600"}`}>
            {stats.peakScore} <span className="text-[9px] font-normal text-slate-400">pts</span>
          </div>
        </div>
        <div className="bg-white p-2 rounded-xl border border-slate-200/80">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Triggers</div>
          <div className="text-sm font-bold text-rose-600 mt-0.5">{stats.triggerCount}</div>
        </div>
        <div className="bg-white p-2 rounded-xl border border-slate-200/80">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Samples</div>
          <div className="text-sm font-bold text-emerald-600 mt-0.5">{stats.totalSamples}</div>
        </div>
      </div>

      {/* SVG Time-Series Chart */}
      <div className="relative w-full h-[120px] my-1 overflow-hidden rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center">
        {chartData.points.length > 1 ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="scoreLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            <line
              x1="0"
              y1={chartData.thresholdY}
              x2={width}
              y2={chartData.thresholdY}
              stroke="#F43F5E"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.7"
            />

            <path d={chartData.area} fill="url(#scoreAreaGrad)" />

            <path
              d={chartData.path}
              fill="none"
              stroke="url(#scoreLineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {chartData.triggers.map((trig, idx) => (
              <g key={`trig-${idx}`}>
                <line
                  x1={trig.x}
                  y1={trig.y}
                  x2={trig.x}
                  y2={height - padding}
                  stroke="#F43F5E"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
                <circle cx={trig.x} cy={trig.y} r="4" fill="#F43F5E" />
              </g>
            ))}

            {latestPoint && (
              <circle
                cx={latestPoint.x}
                cy={latestPoint.y}
                r="4.5"
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            )}
          </svg>
        ) : (
          <div className="text-xs text-slate-400">
            Streaming 60-second telemetry history...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/70">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-rose-600 font-medium">
            <span className="w-2.5 h-0.5 bg-rose-500 inline-block" />
            Threshold ({threshold})
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Live Point
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            Calm (&lt;{threshold})
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
            Morph (≥{threshold})
          </span>
        </div>
      </div>
    </div>
  );
}
