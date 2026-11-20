"use client";

import React from "react";
import { motion } from "framer-motion";
import { simplifyingOverlayVariant } from "../animation/variants.js";

/**
 * Short animated overlay displayed when Cognitive Load threshold is breached:
 * "Simplifying this for you..."
 */
export default function SimplifyingOverlay({ activeField = "annualIncome", onDismiss }) {
  const formattedField = activeField
    ? activeField.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "Your Input";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md transition-all">
      <motion.div
        variants={simplifyingOverlayVariant}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-3xl shadow-2xl p-7 sm:p-8 max-w-md w-full text-center text-white"
      >
        {/* Ambient neon radial glows */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Pulsing AuraGen icon */}
        <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-rose-500 p-0.5 shadow-xl shadow-indigo-600/30 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="text-2xl animate-pulse">✨</span>
          </div>
        </div>

        {/* Required Message Text per Task 2 Requirements */}
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            AuraGen detected interaction difficulty.
          </span>
          <h3 className="relative text-2xl font-black tracking-tight text-white">
            Simplifying your experience...
          </h3>
        </div>

        <p className="relative text-xs sm:text-sm text-indigo-200/90 leading-relaxed mb-5">
          Interaction friction detected on <span className="text-white font-semibold underline decoration-indigo-400">{formattedField}</span>.
          Seamlessly transforming into an intelligent conversational assistant with all input preserved.
        </p>

        {/* Animated Loading Bar */}
        <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-rose-400 rounded-full animate-[shimmer_1.2s_infinite]" />
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-4 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip animation
          </button>
        )}
      </motion.div>
    </div>
  );
}
