"use client";

import React, { useState, useEffect, useRef } from "react";
import { WS_STATUS } from "../hooks/useWebSocket";
import CognitiveScoreGauge from "./CognitiveScoreGauge.jsx";
import TelemetryAnalyticsChart from "./TelemetryAnalyticsChart.jsx";

const STATUS_BADGE = {
  [WS_STATUS.CONNECTED]: {
    label: "Connected",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  [WS_STATUS.CONNECTING]: {
    label: "Connecting...",
    dot: "bg-amber-500 animate-pulse",
    pill: "bg-amber-50 text-amber-700 border-amber-200"
  },
  [WS_STATUS.RECONNECTING]: {
    label: "Reconnecting",
    dot: "bg-rose-500 animate-ping",
    pill: "bg-rose-50 text-rose-700 border-rose-200"
  },
  [WS_STATUS.DISCONNECTED]: {
    label: "Disconnected",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 border-slate-200"
  },
  connected: {
    label: "Connected",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  connecting: {
    label: "Connecting...",
    dot: "bg-amber-500 animate-pulse",
    pill: "bg-amber-50 text-amber-700 border-amber-200"
  },
  reconnecting: {
    label: "Reconnecting",
    dot: "bg-rose-500 animate-ping",
    pill: "bg-rose-50 text-rose-700 border-rose-200"
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 border-slate-200"
  }
};

function getTrajectoryColor(velocity, hesitationMs, alpha) {
  const velRatio = Math.min(1, Math.max(0, (velocity - 150) / 700));
  const hesRatio = Math.min(1, Math.max(0, (hesitationMs - 2000) / 5000));
  const severity = Math.max(velRatio, hesRatio);

  if (severity < 0.5) {
    const t = severity * 2;
    const r = Math.round(16 + (245 - 16) * t);
    const g = Math.round(185 + (158 - 185) * t);
    const b = Math.round(129 + (11 - 129) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const t = (severity - 0.5) * 2;
  const r = Math.round(245 + (244 - 245) * t);
  const g = Math.round(158 + (63 - 158) * t);
  const b = Math.round(11 + (94 - 11) * t);
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
  threshold = 60,
  onThresholdChange,
  onSimulateSpike,
  onResetTelemetry,
  receivedComponentCount = 0,
  onOpenCodeDrawer,
  analyticsSummary,
  privacyMode = "cloud",
  onPrivacyModeChange,
  maskedPiiCount = 0,
  astAudit = null
}) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
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
  const effectiveScore = rollingAverageScore || cognitiveLoadScore;
  const isThresholdReached = effectiveScore >= threshold;

  const velocityVariance = metrics.velocityVariance ?? 0;
  const velocityStdDev = Math.round(Math.sqrt(velocityVariance));

  const normVariance = normalizedMetrics.velocityVariance ?? 0;
  const normHesitation = normalizedMetrics.hesitation ?? 0;
  const normRageClicks = normalizedMetrics.rageClicks ?? 0;
  const normClickErrors = normalizedMetrics.clickErrorRate ?? 0;
  const normDirection = normalizedMetrics.directionChanges ?? 0;

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

      // X-Ray DOM Field Inspector: highlight active or high-friction form fields directly
      const activeWrapper = currentField
        ? document.querySelector(`[data-field-wrapper="${currentField}"]`)
        : null;
      if (activeWrapper) {
        const rect = activeWrapper.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const hotspotColor = isThresholdReached ? "244, 63, 94" : "16, 185, 129";
          ctx.save();
          ctx.strokeStyle = `rgba(${hotspotColor}, 0.85)`;
          ctx.fillStyle = `rgba(${hotspotColor}, 0.06)`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(rect.left - 4, rect.top - 4, rect.width + 8, rect.height + 8, 12);
          } else {
            ctx.rect(rect.left - 4, rect.top - 4, rect.width + 8, rect.height + 8);
          }
          ctx.fill();
          ctx.stroke();

          ctx.setLineDash([]);
          const tagText = `X-RAY • ${currentField} • ${Math.round(effectiveScore)}pts`;
          ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
          const tagWidth = ctx.measureText(tagText).width + 14;
          const tagY = Math.max(8, rect.top - 22);
          ctx.fillStyle = `rgba(${hotspotColor}, 0.92)`;
          ctx.fillRect(rect.left, tagY, tagWidth, 18);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(tagText, rect.left + 7, tagY + 12.5);
          ctx.restore();
        }
      }

      const pts = pointsRef.current;
      if (pts.length > 1) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const ageRatio = 1 - (now - curr.time) / TRAIL_LIFETIME_MS;
          const alpha = Math.max(0.08, ageRatio * 0.9);

          if (!curr.isRageClick && !prev.isRageClick) {
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = getTrajectoryColor(
              curr.velocity,
              curr.hesitationMs,
              alpha
            );
            ctx.lineWidth = curr.isErratic ? 4 : 2.5;
            ctx.stroke();
          }

          if (curr.isRageClick) {
            // Expanding red concentric rage-click sonar rings
            const pulse = ((now - curr.time) % 900) / 900;
            const ringRadius = 14 + pulse * 26;
            ctx.beginPath();
            ctx.arc(curr.x, curr.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * (1 - pulse * 0.5)})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(curr.x, curr.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(244, 63, 94, ${alpha * 0.45})`;
            ctx.fill();
          } else if (curr.isErratic && i % 3 === 0) {
            const grad = ctx.createRadialGradient(
              curr.x,
              curr.y,
              1,
              curr.x,
              curr.y,
              22
            );
            grad.addColorStop(0, `rgba(244, 63, 94, ${alpha * 0.35})`);
            grad.addColorStop(1, "rgba(244, 63, 94, 0)");
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
  }, [heatmapEnabled, subscribeTrajectory, currentField, effectiveScore, isThresholdReached]);

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

      {/* Clean Minimalist White Top Dashboard */}
      <header className="relative bg-white text-slate-900 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 sm:p-6 mb-8 transition-all">
        {/* Top Row: Identity + Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
              AG
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  AuraGen Cognitive Telemetry
                </h2>
                {isThresholdReached ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                    Threshold Breached
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                    Optimal Cadence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Session <strong className="font-mono text-slate-700">{sessionId}</strong></span>
                <span className="text-slate-300">•</span>
                <span>5s Sliding Window</span>
                <span className="text-slate-300">•</span>
                <span>Lossless Snapshot Sync</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Active Field Pill */}
            <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <span className="text-slate-400 mr-1.5 text-[11px] uppercase tracking-wider">Field:</span>
              <span className="font-semibold text-emerald-700 truncate max-w-[140px]">
                {currentField || "General"}
              </span>
            </div>

            {/* Cooldown Status */}
            {isCooldownActive ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Cooldown: {cooldownRemaining}s</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Armed</span>
              </div>
            )}

            {/* WebSocket Status Pill */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${badge.pill}`}>
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span>
                {badge.label}
                {(wsStatus === WS_STATUS.RECONNECTING || wsStatus === "reconnecting") && reconnectAttempt > 0
                  ? ` (#${reconnectAttempt})`
                  : ""}
              </span>
            </div>

            {/* Dual-Engine Privacy Mode Toggle */}
            {onPrivacyModeChange && (
              <button
                type="button"
                onClick={() => onPrivacyModeChange(privacyMode === "cloud" ? "ollama" : "cloud")}
                title="Switch between Cloud LLM (with PII Masking) and Local Ollama Engine"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  privacyMode === "ollama"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>{privacyMode === "ollama" ? "🔒 Local Ollama" : "☁️ Cloud + PII Shield"}</span>
                {maskedPiiCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    privacyMode === "ollama"
                      ? "bg-emerald-700 text-emerald-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {maskedPiiCount} masked
                  </span>
                )}
              </button>
            )}

            {/* AST Security Audit Badge */}
            {astAudit && astAudit.passed && (
              <div
                title={`Babel AST Security Validator scanned ${astAudit.nodesInspected} AST nodes in ${astAudit.parseTimeMs}ms`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>AST {astAudit.parseTimeMs}ms • {astAudit.blockedRulesChecked}/10 Guard</span>
              </div>
            )}

            {/* Heatmap + X-Ray Inspector Toggle */}
            <button
              type="button"
              onClick={() => setHeatmapEnabled((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                heatmapEnabled
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              {heatmapEnabled ? "X-Ray Heatmap: ON" : "Heatmap & X-Ray"}
            </button>

            {heatmapEnabled && (
              <button
                type="button"
                onClick={() => {
                  pointsRef.current = [];
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 border border-slate-200 transition-colors"
              >
                Clear Trail
              </button>
            )}

            {/* Compact Telemetry Info Popover Toggle */}
            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
            >
              {debugOpen ? "Hide Live Spec" : "Live Spec"}
            </button>

            {wsStatus !== WS_STATUS.CONNECTED && wsStatus !== "connected" && (
              <button
                type="button"
                onClick={onReconnect}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 border border-emerald-200 transition-colors"
              >
                Reconnect
              </button>
            )}

            {receivedComponentCount > 0 && (
              <button
                type="button"
                onClick={onOpenCodeDrawer}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                Inspect Code ({receivedComponentCount})
              </button>
            )}
          </div>
        </div>

        {/* Main 3-Column Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5 items-stretch">
          <div className="lg:col-span-4 flex flex-col">
            <CognitiveScoreGauge
              score={effectiveScore}
              rawScore={instantScore}
              threshold={threshold}
              isTriggered={isTriggered}
              simulationMode={simulationMode}
              hasMinimumActivity={hasMinimumActivity}
              cooldownActive={isCooldownActive}
              cooldownRemaining={cooldownRemaining}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5 text-center">
              {/* Velocity Variance */}
              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-3 border border-slate-200/80 transition-colors flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                    Velocity Var (25%)
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    ±{velocityStdDev}
                    <span className="text-[10px] text-slate-400 font-normal ml-0.5">px/s</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    {normVariance}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${normVariance}%` }}
                  />
                </div>
              </div>

              {/* Hesitation */}
              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-3 border border-slate-200/80 transition-colors flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                    Hesitation (25%)
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {((metrics.hesitationMs ?? 0) / 1000).toFixed(1)}s
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    {normHesitation}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${normHesitation}%` }}
                  />
                </div>
              </div>

              {/* Rage Clicks */}
              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-3 border border-slate-200/80 transition-colors flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                    Rage Clicks (20%)
                  </div>
                  <div className={`text-base font-bold mt-1 ${(metrics.rageClicks ?? 0) > 0 ? "text-rose-600" : "text-slate-900"}`}>
                    {metrics.rageClicks ?? 0}
                  </div>
                  <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                    {normRageClicks}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${normRageClicks}%` }}
                  />
                </div>
              </div>

              {/* Error Rate */}
              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-3 border border-slate-200/80 transition-colors flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                    Error Rate (10%)
                  </div>
                  <div className={`text-base font-bold mt-1 ${(metrics.clickErrorRate ?? 0) > 0.2 ? "text-rose-600" : "text-slate-900"}`}>
                    {Math.round((metrics.clickErrorRate ?? 0) * 100)}%
                  </div>
                  <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                    {normClickErrors}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${normClickErrors}%` }}
                  />
                </div>
              </div>

              {/* Direction Changes */}
              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-3 border border-slate-200/80 transition-colors flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                      Direction Changes (20%)
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {metrics.directionChanges ?? 0} changes
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    {normDirection}% norm
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${normDirection}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Trigger Threshold Selector */}
            {onThresholdChange && (
              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800 block text-xs">Trigger Threshold</span>
                  <span className="text-[10px] text-slate-500">5s rolling avg ≥ threshold</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[50, 60, 70, 85].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => onThresholdChange(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        threshold === lvl
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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

        {/* Bottom Simulator Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Telemetry Lab
              </span>
              Simulators:
            </span>
            {simulationMode !== "idle" && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  simulationMode === "confused"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                Simulating: {simulationMode.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!isDevelopment}
              onClick={onSimulateConfused}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none ${
                !isDevelopment
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : simulationMode === "confused"
                  ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
              }`}
            >
              Simulate Confusion
            </button>

            <button
              type="button"
              disabled={!isDevelopment}
              onClick={onSimulateCalm}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none ${
                !isDevelopment
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : simulationMode === "calm"
                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
              }`}
            >
              Simulate Calm
            </button>

            <button
              type="button"
              disabled={!isDevelopment}
              onClick={onStopSimulation}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                !isDevelopment
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : simulationMode !== "idle"
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200"
              }`}
            >
              Stop
            </button>

            <button
              type="button"
              onClick={onSimulateSpike}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              Instant Spike
            </button>

            <button
              type="button"
              onClick={onResetTelemetry}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 border border-slate-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Clean Light-Mode Live Spec Popover */}
      {debugOpen && (
        <aside className="fixed bottom-16 right-4 z-50 w-80 bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl border border-slate-200 shadow-soft-lg p-4 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span className="font-semibold tracking-wide uppercase text-[11px] text-emerald-700">
                Live Telemetry Spec
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDebugOpen(false)}
              className="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded bg-slate-100"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70">
              <div className="text-[10px] text-slate-400">WS STATE</div>
              <div className="font-semibold text-slate-800 truncate">{badge.label}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70">
              <div className="text-[10px] text-slate-400">ROLLING / INST</div>
              <div className={`font-semibold ${isThresholdReached ? "text-rose-600" : "text-emerald-600"}`}>
                {effectiveScore} / {instantScore} ({windowSampleCount}w)
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70">
              <div className="text-[10px] text-slate-400">ACTIVE FIELD</div>
              <div className="font-semibold text-emerald-700 truncate">
                {currentField || "none"}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70">
              <div className="text-[10px] text-slate-400">CURSOR / VEL</div>
              <div className="font-semibold text-slate-700">
                {cursor.x},{cursor.y} • {metrics.mouseVelocity ?? 0}px/s
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
            <span className="text-slate-500">formStateSnapshot:</span>
            <span className={lastSnapshotSentAt ? "text-emerald-600 font-semibold" : "text-slate-600"}>
              {lastSnapshotSentAt
                ? `Sent ${new Date(lastSnapshotSentAt).toLocaleTimeString()}`
                : "Armed (≥ threshold)"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFetchSessionMetrics}
            disabled={loadingSessionApi}
            className="w-full px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold transition-colors"
          >
            {loadingSessionApi ? "Fetching..." : "Poll Session Store API"}
          </button>

          {serverMetrics && (
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 font-mono text-[10px] text-slate-700 space-y-0.5">
              {serverMetrics.error ? (
                <div className="text-rose-600">API Error: {serverMetrics.error}</div>
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
