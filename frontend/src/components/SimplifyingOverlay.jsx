"use client";

import React from "react";
import { motion } from "framer-motion";
import { simplifyingOverlayVariant } from "../animation/variants.js";

/**
 * Clean, breathable light-mode overlay displayed briefly when the 60-pt
 * sustained friction threshold is breached.
 */
export default function SimplifyingOverlay({ activeField = "annualIncome", onDismiss }) {
  const formattedField = activeField
    ? activeField.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "Your Input";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm transition-all">
      <motion.div
        variants={simplifyingOverlayVariant}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-soft-lg p-7 sm:p-8 max-w-md w-full text-center text-slate-900"
      >
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>

        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            AuraGen Adaptive Mode
          </span>
          <h3 className="text-xl font-bold tracking-tight text-slate-900">
            Simplifying your experience...
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
          Interaction friction detected on <span className="text-emerald-700 font-semibold">{formattedField}</span>.
          Transforming into a clean guided assistant with all entered data preserved.
        </p>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full animate-shimmer w-2/3" />
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Skip transition
          </button>
        )}
      </motion.div>
    </div>
  );
}
