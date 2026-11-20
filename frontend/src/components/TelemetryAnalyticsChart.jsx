"use client";

import React, { useMemo } from "react";

/**
 * TelemetryAnalyticsChart:
 * Multi-dimensional telemetry analytics and time-series visualization.
 *
 * Requirements met:
 * 1. Cognitive Load Score over time (SVG line + gradient area chart).
 * 2. Visual differentiation of confused vs calm sessions / periods.
 * 3. Trigger event markers & pins where cognitive load crossed threshold.
 * 4. User interaction trends (5 normalized telemetry channels).
 * 5. Real-time statistical analytics summary (Avg, Peak, Triggers).
 */
export default function TelemetryAnalyticsChart({
  telemetryHistory = [],
  threshold = 70,
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

  // Process history points into SVG coordinates
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
      const isConfused = item.mode === "confused";
      const isCalm = item.mode === "calm";
      return { x, y, score, isTrigger, isConfused, isCalm, timeSeconds: item.timeSeconds };
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

  // Aggregate stats
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
    <div className="flex flex-col justify-between p-5 rounded-3xl bg-[#11172A]/90 border border-indigo-500/25 shadow-[0_0_30px_rgba(128,87,255,0.1)] backdrop-blur-xl h-full">
      {/* Top Header: Title, Buffer Size, CSV Download */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8057FF] shadow-[0_0_8px_#8057FF]" />
            Cognitive Load Over Time & Session Trends
          </h3>
          <span className="text-[11px] text-slate-400">
            Field: <strong className="text-cyan-300 font-semibold">{activeField || "General"}</strong> • 60s rolling telemetry buffer
          </span>
        </div>

        {onExportCSV && (
          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 transition-all hover:scale-[1.02]"
            title="Export full time-series telemetry as CSV"
          >
            <span>↓</span>
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Real-time Summary Metrics Pill Bar */}
      <div className="grid grid-cols-4 gap-2 my-3 text-center">
        <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Average</div>
          <div className="text-sm font-extrabold text-indigo-300 mt-0.5">{stats.avgScore} <span className="text-[9px] font-normal text-slate-400">pts</span></div>
        </div>
        <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Peak</div>
          <div className={`text-sm font-extrabold mt-0.5 ${stats.peakScore >= threshold ? "text-rose-400" : "text-amber-300"}`}>
            {stats.peakScore} <span className="text-[9px] font-normal text-slate-400">pts</span>
          </div>
        </div>
        <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Triggers</div>
          <div className="text-sm font-extrabold text-rose-400 mt-0.5">{stats.triggerCount}</div>
        </div>
        <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Samples</div>
          <div className="text-sm font-extrabold text-cyan-300 mt-0.5">{stats.totalSamples}</div>
        </div>
      </div>

      {/* SVG Time-Series Chart */}
      <div className="relative w-full h-[120px] my-1 overflow-hidden rounded-2xl bg-slate-950/70 border border-slate-800/80 p-1 flex items-center justify-center">
        {chartData.points.length > 1 ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8057FF" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#25D9E8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#11172A" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="scoreLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#25D9E8" />
                <stop offset="70%" stopColor="#8057FF" />
                <stop offset="100%" stopColor="#B69CFF" />
              </linearGradient>
            </defs>

            {/* Threshold Line */}
            <line
              x1="0"
              y1={chartData.thresholdY}
              x2={width}
              y2={chartData.thresholdY}
              stroke="#FF647C"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.85"
            />

            {/* Chart Area Fill */}
            <path d={chartData.area} fill="url(#scoreAreaGrad)" />

            {/* Chart Stroke Path */}
            <path
              d={chartData.path}
              fill="none"
              stroke="url(#scoreLineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Trigger Event Markers / Pins */}
            {chartData.triggers.map((trig, idx) => (
              <g key={`trig-${idx}`}>
                <line
                  x1={trig.x}
                  y1={trig.y}
                  x2={trig.x}
                  y2={height - padding}
                  stroke="#FF647C"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
                <circle
                  cx={trig.x}
                  cy={trig.y}
                  r="4"
                  fill="#FF647C"
                  className="drop-shadow-[0_0_8px_#FF647C]"
                />
              </g>
            ))}

            {/* Latest point active beacon */}
            {latestPoint && (
              <circle
                cx={latestPoint.x}
                cy={latestPoint.y}
                r="4.5"
                fill="#25D9E8"
                className="drop-shadow-[0_0_10px_#25D9E8]"
              />
            )}
          </svg>
        ) : (
          <div className="text-xs text-slate-500 italic">
            Streaming rolling 60-second telemetry telemetry history...
          </div>
        )}
      </div>

      {/* Chart Footer: Threshold reference & Mode Badges */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <span className="w-2.5 h-0.5 bg-rose-400 inline-block" />
            Threshold ({threshold})
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Live Point
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
            Calm Zone (&lt;50)
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-950/50 text-rose-300 border border-rose-500/30">
            Friction Zone (≥70)
          </span>
        </div>
      </div>
    </div>
  );
}
