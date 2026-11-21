"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TelemetryDebugPanel:
 * Comprehensive development debug cockpit displaying real-time telemetry metrics,
 * threshold status, generation timing, cached payload state, and fallback health.
 *
 * Requirements met:
 * 1. Current Cognitive Load Score and Trigger threshold
 * 2. Current UI mode ("form" | "loading" | "wizard" | "fallback-template")
 * 3. Generation timing in milliseconds
 * 4. Cached status when available
 * 5. Fallback status and template diagnostics
 * 6. Non-intrusive floating collapsible design that does not obstruct normal user flow
 * 7. Accessible keyboard support (Escape key collapse, focus rings)
 */
export function TelemetryDebugPanel({
  score = 0,
  rawScore = 0,
  threshold = 70,
  uiMode = "form",
  generationTiming = null,
  cachedStatus = null,
  fallbackStatus = null,
  activeField = "annualIncome",
  metrics = {},
  isGenerating = false,
  onResetTelemetry,
  onSimulateTimeout,
  onSimulateValidationFailure
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Keyboard shortcut: Escape to close debug panel if open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const durationMs = generationTiming?.durationMs ?? null;

  return React.createElement(
    "aside",
    {
      "aria-label": "Development Telemetry Debug Panel",
      className: "fixed bottom-4 right-4 z-50 select-none print:hidden"
    },
    React.createElement(
      AnimatePresence,
      { mode: "wait" },
      !isOpen
        ? React.createElement(
            motion.button,
            {
              key: "debug-pill",
              type: "button",
              onClick: () => setIsOpen(true),
              initial: { opacity: 0, scale: 0.9, y: 10 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.9, y: 10 },
              whileHover: { scale: 1.04 },
              whileTap: { scale: 0.96 },
              className:
                "flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/90 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs font-bold hover:border-indigo-500/80 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none transition-all",
              title: "Open AuraGen Telemetry & Fallback Debug Panel"
            },
            React.createElement("span", {
              className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
            }),
            React.createElement(
              "span",
              { className: "font-extrabold tracking-tight" },
              "Debug HUD"
            ),
            React.createElement(
              "span",
              {
                className:
                  "px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300 font-mono font-semibold"
              },
              `Score: ${score}`
            ),
            React.createElement(
              "span",
              {
                className:
                  "px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono"
              },
              `Mode: ${uiMode}`
            )
          )
        : React.createElement(
            motion.div,
            {
              key: "debug-panel-expanded",
              initial: { opacity: 0, scale: 0.95, y: 20 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.95, y: 20 },
              transition: { type: "spring", stiffness: 350, damping: 28 },
              className:
                "w-[92vw] sm:w-[440px] max-h-[85vh] bg-slate-950/95 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden"
            },
            // Header
            React.createElement(
              "div",
              {
                className:
                  "p-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between"
              },
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement("span", {
                  className: "w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"
                }),
                React.createElement(
                  "h3",
                  {
                    className:
                      "text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5"
                  },
                  "AuraGen Diagnostic Cockpit",
                  React.createElement(
                    "span",
                    {
                      className:
                        "text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-mono"
                    },
                    "DEV"
                  )
                )
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setIsOpen(false),
                  className:
                    "w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500",
                  "aria-label": "Close debug panel"
                },
                "✕"
              )
            ),
            // Navigation Tabs
            React.createElement(
              "div",
              {
                className:
                  "flex border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-bold"
              },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setActiveTab("overview"),
                  className: `flex-1 py-2 text-center transition-colors border-b-2 ${
                    activeTab === "overview"
                      ? "border-indigo-500 text-indigo-300 bg-slate-800/40"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`
                },
                "Telemetry & Mode"
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setActiveTab("timing"),
                  className: `flex-1 py-2 text-center transition-colors border-b-2 ${
                    activeTab === "timing"
                      ? "border-indigo-500 text-indigo-300 bg-slate-800/40"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`
                },
                "Generation & Cache"
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setActiveTab("fallback"),
                  className: `flex-1 py-2 text-center transition-colors border-b-2 ${
                    activeTab === "fallback"
                      ? "border-indigo-500 text-indigo-300 bg-slate-800/40"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`
                },
                "Fallback Health"
              )
            ),
            // Tab Contents
            React.createElement(
              "div",
              {
                className: "p-4 space-y-4 overflow-y-auto max-h-[58vh] text-xs"
              },
              activeTab === "overview"
                ? React.createElement(
                    "div",
                    { className: "space-y-3" },
                    // Grid: Real-time Scores
                    React.createElement(
                      "div",
                      { className: "grid grid-cols-2 gap-2.5" },
                      React.createElement(
                        "div",
                        {
                          className:
                            "p-3 rounded-2xl bg-slate-900/80 border border-slate-800"
                        },
                        React.createElement(
                          "span",
                          {
                            className:
                              "text-[10px] uppercase font-bold text-slate-400 block mb-0.5"
                          },
                          "Cognitive Load Score"
                        ),
                        React.createElement(
                          "div",
                          { className: "flex items-baseline gap-1.5" },
                          React.createElement(
                            "span",
                            {
                              className: `text-2xl font-black ${
                                score >= threshold
                                  ? "text-rose-400 animate-pulse"
                                  : "text-emerald-400"
                              }`
                            },
                            score
                          ),
                          React.createElement(
                            "span",
                            { className: "text-[10px] text-slate-500" },
                            "/ 100"
                          )
                        ),
                        React.createElement(
                          "span",
                          { className: "text-[10px] text-slate-400" },
                          `Raw: ${rawScore}`
                        )
                      ),
                      React.createElement(
                        "div",
                        {
                          className:
                            "p-3 rounded-2xl bg-slate-900/80 border border-slate-800"
                        },
                        React.createElement(
                          "span",
                          {
                            className:
                              "text-[10px] uppercase font-bold text-slate-400 block mb-0.5"
                          },
                          "Trigger Threshold"
                        ),
                        React.createElement(
                          "div",
                          { className: "flex items-baseline gap-1.5" },
                          React.createElement(
                            "span",
                            { className: "text-2xl font-black text-indigo-300" },
                            threshold
                          ),
                          React.createElement(
                            "span",
                            { className: "text-[10px] text-slate-500" },
                            "pts"
                          )
                        ),
                        React.createElement(
                          "span",
                          { className: "text-[10px] text-slate-400" },
                          `Status: ${score >= threshold ? "🚨 Exceeded" : "✅ Normal"}`
                        )
                      )
                    ),
                    // UI Mode Status
                    React.createElement(
                      "div",
                      {
                        className:
                          "p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                      },
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "span",
                          {
                            className:
                              "text-[10px] uppercase font-bold text-slate-400 block"
                          },
                          "Current UI Mode"
                        ),
                        React.createElement(
                          "span",
                          {
                            className:
                              "font-mono font-bold text-sm text-white capitalize"
                          },
                          uiMode
                        )
                      ),
                      React.createElement(
                        "span",
                        {
                          className: `px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase border ${
                            uiMode === "form"
                              ? "bg-slate-800 text-slate-300 border-slate-700"
                              : uiMode === "loading"
                              ? "bg-indigo-950 text-indigo-300 border-indigo-500/50 animate-pulse"
                              : uiMode === "fallback-template"
                              ? "bg-amber-950 text-amber-300 border-amber-500/50"
                              : "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                          }`
                        },
                        uiMode
                      )
                    ),
                    // Active Target Field
                    React.createElement(
                      "div",
                      {
                        className:
                          "p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                      },
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "span",
                          {
                            className:
                              "text-[10px] uppercase font-bold text-slate-400 block"
                          },
                          "Active Target Field"
                        ),
                        React.createElement(
                          "code",
                          {
                            className:
                              "text-xs font-mono font-bold text-indigo-300"
                          },
                          activeField || "none"
                        )
                      ),
                      React.createElement(
                        "span",
                        { className: "text-[10px] text-slate-500" },
                        "10s Rolling Window"
                      )
                    )
                  )
                : activeTab === "timing"
                ? React.createElement(
                    "div",
                    { className: "space-y-3" },
                    // Generation Timing
                    React.createElement(
                      "div",
                      {
                        className:
                          "p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5"
                      },
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[10px] uppercase font-bold text-slate-400 block"
                        },
                        "Generation Latency / Timing"
                      ),
                      React.createElement(
                        "div",
                        { className: "flex items-baseline gap-2" },
                        React.createElement(
                          "span",
                          {
                            className:
                              "text-2xl font-black text-white font-mono"
                          },
                          durationMs !== null
                            ? `${durationMs} ms`
                            : isGenerating
                            ? "In flight..."
                            : "Idle"
                        ),
                        isGenerating
                          ? React.createElement("span", {
                              className:
                                "w-2 h-2 rounded-full bg-amber-400 animate-ping"
                            })
                          : null
                      ),
                      React.createElement(
                        "p",
                        { className: "text-[11px] text-slate-400" },
                        isGenerating
                          ? "Measuring round-trip between trigger and validated component reception (4s timeout window)."
                          : durationMs !== null
                          ? `Last successful response completed in ${durationMs} ms.`
                          : "No generation in progress. Trigger friction to measure latency."
                      )
                    ),
                    // Cached Status
                    React.createElement(
                      "div",
                      {
                        className:
                          "p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                      },
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "span",
                          {
                            className:
                              "text-[10px] uppercase font-bold text-slate-400 block"
                          },
                          "AST Cache Status"
                        ),
                        React.createElement(
                          "span",
                          { className: "text-xs font-bold text-white" },
                          cachedStatus === true
                            ? "⚡ Cached (Hit)"
                            : cachedStatus === false
                            ? "🌱 Fresh LLM Generation"
                            : "Not Applicable (No Payload)"
                        )
                      ),
                      React.createElement(
                        "span",
                        {
                          className: `px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                            cachedStatus === true
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`
                        },
                        cachedStatus === true
                          ? "HIT"
                          : cachedStatus === false
                          ? "MISS"
                          : "N/A"
                      )
                    )
                  )
                : React.createElement(
                    "div",
                    { className: "space-y-3" },
                    // Fallback Diagnostics
                    React.createElement(
                      "div",
                      {
                        className:
                          "p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2"
                      },
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[10px] uppercase font-bold text-slate-400 block"
                        },
                        "Fallback Resilience State"
                      ),
                      React.createElement(
                        "div",
                        { className: "flex items-center gap-2" },
                        React.createElement("span", {
                          className: `w-2.5 h-2.5 rounded-full ${
                            fallbackStatus
                              ? "bg-amber-400 animate-pulse"
                              : "bg-emerald-400"
                          }`
                        }),
                        React.createElement(
                          "span",
                          { className: "font-bold text-xs text-white" },
                          fallbackStatus
                            ? fallbackStatus.title || "Fallback Active"
                            : "Operational (Healthy)"
                        )
                      ),
                      fallbackStatus
                        ? React.createElement(
                            "p",
                            {
                              className:
                                "text-[11px] text-amber-200/90 leading-relaxed bg-amber-950/40 p-2 rounded-xl border border-amber-900/50"
                            },
                            fallbackStatus.message
                          )
                        : null
                    ),
                    // Simulation Actions
                    React.createElement(
                      "div",
                      { className: "pt-2 space-y-2" },
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[10px] uppercase font-bold text-slate-400 block"
                        },
                        "Interactive Testing Triggers"
                      ),
                      React.createElement(
                        "div",
                        { className: "grid grid-cols-2 gap-2" },
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: onSimulateTimeout,
                            className:
                              "p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-colors"
                          },
                          "Simulate 4s Timeout"
                        ),
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: onSimulateValidationFailure,
                            className:
                              "p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-colors"
                          },
                          "Simulate Validation Fail"
                        )
                      )
                    )
                  )
            ),
            // Footer
            React.createElement(
              "div",
              {
                className:
                  "p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400"
              },
              React.createElement("span", null, "AuraGen Diagnostic Suite"),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setIsOpen(false),
                  className:
                    "text-slate-400 hover:text-white underline underline-offset-2"
                },
                "Hide (Esc)"
              )
            )
          )
    )
  );
}

export default TelemetryDebugPanel;
