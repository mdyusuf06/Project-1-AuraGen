"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SimulatedCursorOverlay:
 * Clean light-mode floating banner when telemetry simulation is active.
 */
export default function SimulatedCursorOverlay({
  simulationMode = "idle",
  score = 0,
  threshold = 60,
  onStopSimulation
}) {
  if (simulationMode === "idle") return null;

  const isConfused = simulationMode === "confused";

  return (
    <AnimatePresence>
      <motion.div
        key="sim-overlay-hud"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 pointer-events-none"
      >
        <div
          className={`pointer-events-auto p-4 rounded-2xl border shadow-soft-lg bg-white/95 backdrop-blur-md flex items-center justify-between gap-3 ${
            isConfused ? "border-rose-200 text-slate-900" : "border-emerald-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                isConfused
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200"
              }`}
            >
              {isConfused ? "⚡" : "✓"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {isConfused ? "Simulating Confusion" : "Simulating Calm Flow"}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isConfused
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  Score: {score} / {threshold}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                {isConfused
                  ? "Erratic velocity bursts, rage clicks, and hesitation active"
                  : "Smooth trajectories and steady cadence maintained"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStopSimulation}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isConfused
                ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
            }`}
          >
            Stop
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
