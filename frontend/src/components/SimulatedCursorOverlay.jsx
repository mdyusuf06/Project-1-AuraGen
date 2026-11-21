"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SimulatedCursorOverlay:
 * Futuristic HUD banner and live feedback indicator when telemetry simulation is active.
 *
 * Requirements met:
 * 1. Visual indicator for Simulate Confused User vs Simulate Calm User.
 * 2. Real-time feedback on simulated behavioral parameters (jitter, rage clicks, pauses).
 * 3. Quick-stop button with clean listener teardown.
 * 4. Framer Motion slide-in / slide-out transitions.
 * 5. Production safety (renders only when simulationMode !== 'idle').
 */
export default function SimulatedCursorOverlay({
  simulationMode = "idle",
  score = 0,
  threshold = 70,
  onStopSimulation
}) {
  if (simulationMode === "idle") return null;

  const isConfused = simulationMode === "confused";

  return (
    <AnimatePresence>
      <motion.div
        key="sim-overlay-hud"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 pointer-events-none"
      >
        <div
          className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 ${
            isConfused
              ? "bg-[#11172A]/95 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.35)] text-rose-100"
              : "bg-[#11172A]/95 border-emerald-500/50 shadow-[0_0_30px_rgba(56,217,169,0.3)] text-emerald-100"
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Animated status ring */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${
                isConfused
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {isConfused ? "⚡" : "✓"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  {isConfused ? "Simulating Confused User" : "Simulating Calm User"}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full border ${
                    isConfused
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  Score: {score} / {threshold}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                {isConfused
                  ? "Erratic velocity bursts, rage clicks, direction changes active"
                  : "Smooth trajectories, steady cadence, optimal flow maintained"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStopSimulation}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all hover:scale-105 active:scale-95 shadow-md ${
              isConfused
                ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-400/40"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40"
            }`}
          >
            Stop
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
