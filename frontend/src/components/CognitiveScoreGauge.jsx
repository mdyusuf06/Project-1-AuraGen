"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * CognitiveScoreGauge:
 * Clean, breathable minimalist circular score gauge for AuraGen Telemetry.
 */
export default function CognitiveScoreGauge({
  score = 0,
  rawScore = 0,
  threshold = 60,
  isTriggered = false,
  simulationMode = "idle",
  hasMinimumActivity = true,
  cooldownActive = false,
  cooldownRemaining = 0
}) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const isHigh = clampedScore >= threshold;
  const isElevated = !isHigh && clampedScore >= Math.max(40, threshold - 15);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const thresholdAngleDeg = (threshold / 100) * 360 - 90;
  const thresholdRad = (thresholdAngleDeg * Math.PI) / 180;
  const thresholdX = Number((80 + radius * Math.cos(thresholdRad)).toFixed(2));
  const thresholdY = Number((80 + radius * Math.sin(thresholdRad)).toFixed(2));

  const statusInfo = useMemo(() => {
    if (isHigh) {
      return {
        label: "High Friction",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        dotColor: "bg-rose-500 animate-ping",
        description: "Sustained difficulty detected. Self-healing wizard active."
      };
    }
    if (isElevated) {
      return {
        label: "Elevated Load",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        dotColor: "bg-amber-500 animate-pulse",
        description: "Approaching threshold. Monitoring 5s rolling cadence."
      };
    }
    return {
      label: "Normal Flow",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotColor: "bg-emerald-500",
      description: "Smooth interaction cadence. Cognitive load optimal."
    };
  }, [isHigh, isElevated]);

  return (
    <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 shadow-sm h-full">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between text-xs pb-3 border-b border-slate-200/70 mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-600">
            {simulationMode !== "idle"
              ? `Simulating: ${simulationMode}`
              : hasMinimumActivity
              ? "Live Sampling"
              : "Idle • Awaiting Input"}
          </span>
        </div>

        {cooldownActive ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            Cooldown {cooldownRemaining}s
          </span>
        ) : (
          <span className="text-[11px] font-medium text-slate-500">
            Threshold: <strong className="text-emerald-700 font-semibold">{threshold}</strong>
          </span>
        )}
      </div>

      {/* Circular Progress Gauge */}
      <div className="relative w-44 h-44 sm:w-48 sm:h-48 my-1 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
          <defs>
            <linearGradient id="optimalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="elevatedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <linearGradient id="highGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
          </defs>

          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            className="text-slate-200/80"
          />

          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={
              isHigh
                ? "url(#highGrad)"
                : isElevated
                ? "url(#elevatedGrad)"
                : "url(#optimalGrad)"
            }
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
          />

          <circle
            cx={thresholdX}
            cy={thresholdY}
            r="4"
            fill="#0F172A"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        </svg>

        {/* Center Score Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400">
            5s Rolling
          </span>
          <div className="flex items-baseline justify-center">
            <span
              className={`font-bold text-4xl sm:text-5xl tracking-tight transition-colors duration-300 ${
                isHigh
                  ? "text-rose-600"
                  : isElevated
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              {clampedScore}
            </span>
            <span className="text-xs font-medium text-slate-400 ml-1">/100</span>
          </div>

          <span className="text-[11px] text-slate-500 mt-0.5">
            Instant: <strong className="text-slate-700">{rawScore}</strong>
          </span>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="w-full text-center mt-2">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-1.5 ${statusInfo.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
          <span>{statusInfo.label}</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed px-2 max-w-[240px] mx-auto">
          {statusInfo.description}
        </p>
      </div>
    </div>
  );
}
