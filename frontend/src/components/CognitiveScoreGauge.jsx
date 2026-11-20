"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * CognitiveScoreGauge:
 * High-end circular score gauge visualization for AuraGen Telemetry.
 *
 * Requirements met:
 * 1. Circular progress indicator with SVG strokeDasharray & strokeDashoffset.
 * 2. Glowing violet progress ring (#8057FF) with SVG filter glow.
 * 3. Cyan live activity indicator (#25D9E8) with pulsing ripple.
 * 4. Large numerical score with smooth color and layout transitions.
 * 5. Normal (<50) / Elevated (50-69) / High (>=70) status indicator.
 * 6. Radial threshold marker positioned at the calibrated angle.
 * 7. Distinct visual states for calm flow vs confused friction.
 */
export default function CognitiveScoreGauge({
  score = 0,
  rawScore = 0,
  threshold = 70,
  isTriggered = false,
  simulationMode = "idle",
  hasMinimumActivity = true,
  cooldownActive = false,
  cooldownRemaining = 0
}) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const isHigh = clampedScore >= threshold;
  const isElevated = !isHigh && clampedScore >= 50;
  const isNormal = clampedScore < 50;

  // Geometry for 160x160 circular gauge (radius = 60, circumference = 2 * PI * 60 = 376.99)
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Radial position for threshold marker tick on circle
  // Angle: 0% at -90deg (top), 100% at 270deg
  const thresholdAngleDeg = (threshold / 100) * 360 - 90;
  const thresholdRad = (thresholdAngleDeg * Math.PI) / 180;
  const thresholdX = 80 + radius * Math.cos(thresholdRad);
  const thresholdY = 80 + radius * Math.sin(thresholdRad);

  // Status badge metadata
  const statusInfo = useMemo(() => {
    if (isHigh) {
      return {
        label: "High Friction",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.4)]",
        dotColor: "bg-rose-400 animate-ping",
        description: "Interaction difficulty detected. Self-healing triggered."
      };
    }
    if (isElevated) {
      return {
        label: "Elevated Load",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        dotColor: "bg-amber-400 animate-pulse",
        description: "User hesitating or retracing steps. Approaching threshold."
      };
    }
    return {
      label: "Normal Flow",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      dotColor: "bg-emerald-400",
      description: "Smooth interaction cadence. Cognitive load optimal."
    };
  }, [isHigh, isElevated]);

  return (
    <div className="relative flex flex-col items-center justify-center p-5 rounded-3xl bg-[#11172A]/90 border border-indigo-500/25 shadow-[0_0_30px_rgba(128,87,255,0.12)] backdrop-blur-xl">
      {/* Ambient background glow behind gauge */}
      <div
        className={`absolute inset-0 rounded-3xl blur-2xl transition-all duration-700 pointer-events-none ${
          isHigh
            ? "bg-rose-600/20 shadow-[0_0_60px_rgba(244,63,94,0.3)]"
            : isElevated
            ? "bg-amber-600/15"
            : "bg-indigo-600/15 shadow-[0_0_45px_rgba(128,87,255,0.2)]"
        }`}
      />

      {/* Top Header: Live Activity Indicator & Mode */}
      <div className="relative w-full flex items-center justify-between text-xs pb-3 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          {/* Cyan Live Activity Pulse */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D9E8] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D9E8] shadow-[0_0_8px_#25D9E8]" />
          </span>
          <span className="font-bold text-[11px] uppercase tracking-wider text-cyan-300">
            {simulationMode !== "idle"
              ? `Simulating: ${simulationMode}`
              : hasMinimumActivity
              ? "Live Sampling"
              : "Idle • Awaiting Input"}
          </span>
        </div>

        {/* Cooldown or Threshold badge */}
        {cooldownActive ? (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            Cooldown {cooldownRemaining}s
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400">
            Threshold: <strong className="text-indigo-300 font-bold">{threshold}</strong>
          </span>
        )}
      </div>

      {/* Circular Progress Gauge */}
      <div className="relative w-44 h-44 sm:w-48 sm:h-48 my-1 flex items-center justify-center">
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full transform -rotate-90"
        >
          <defs>
            {/* Violet to Cyan Gradient (Normal/Optimal) */}
            <linearGradient id="optimalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#25D9E8" />
              <stop offset="60%" stopColor="#8057FF" />
              <stop offset="100%" stopColor="#B69CFF" />
            </linearGradient>

            {/* Violet to Amber Gradient (Elevated) */}
            <linearGradient id="elevatedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8057FF" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            {/* Violet to Crimson Gradient (High Friction / Triggered) */}
            <linearGradient id="highGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8057FF" />
              <stop offset="70%" stopColor="#FF647C" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>

            {/* Glowing violet SVG filter */}
            <filter id="violetGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            className="text-slate-800/70"
          />

          {/* Glowing Progress Arc */}
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
            filter="url(#violetGlow)"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
          />

          {/* Radial Threshold Marker Tick */}
          <circle
            cx={thresholdX}
            cy={thresholdY}
            r="4"
            fill="#FFFFFF"
            className="drop-shadow-[0_0_6px_rgba(255,255,255,0.95)]"
          />
        </svg>

        {/* Center Content: Numerical Score and Labels */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            Cognitive Load
          </span>
          <div className="flex items-baseline justify-center">
            <span
              className={`font-black text-4xl sm:text-5xl tracking-tight transition-colors duration-300 ${
                isHigh
                  ? "text-rose-400 drop-shadow-[0_0_18px_rgba(244,63,94,0.7)]"
                  : isElevated
                  ? "text-amber-400 drop-shadow-[0_0_14px_rgba(245,158,11,0.5)]"
                  : "text-white drop-shadow-[0_0_14px_rgba(128,87,255,0.5)]"
              }`}
            >
              {clampedScore}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1">/100</span>
          </div>

          <span className="text-[10px] text-slate-400 mt-0.5">
            Raw: <strong className="text-slate-300">{rawScore}</strong>
          </span>
        </div>
      </div>

      {/* Bottom Status Badge & Description */}
      <div className="relative w-full text-center mt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border mb-1">
          <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
          <span className={statusInfo.badge}>{statusInfo.label}</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight px-2 max-w-[240px] mx-auto">
          {statusInfo.description}
        </p>
      </div>
    </div>
  );
}
