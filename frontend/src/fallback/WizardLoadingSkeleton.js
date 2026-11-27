"use client";

import React from "react";
import { motion } from "framer-motion";
import { fadeIn } from "../animation/variants.js";

/**
 * WizardLoadingSkeleton:
 * Graceful loading skeleton displayed while the generated wizard is prepared.
 * Matches AuraGen design system with fluid shimmer animations.
 */
export function WizardLoadingSkeleton({
  activeField = "annualIncome",
  loadingMessage = "Preparing your simplified form...",
  streamProgress = 0,
  onCancel
}) {
  const formattedField = activeField
    ? activeField.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "Financial Input";

  return React.createElement(
    motion.div,
    {
      variants: fadeIn,
      initial: "initial",
      animate: "animate",
      exit: "exit",
      className:
        "bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden min-h-[520px] flex flex-col justify-between text-slate-900"
    },
    // Header Skeleton Bar
    React.createElement(
      "div",
      {
        className:
          "bg-slate-50/70 border-b border-slate-100 p-6 sm:p-7 space-y-3"
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement("div", {
            className: "h-5 w-32 bg-emerald-100 rounded-full animate-pulse"
          }),
          React.createElement("div", {
            className: "h-5 w-24 bg-slate-200/70 rounded-full animate-pulse"
          })
        ),
        onCancel
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: onCancel,
                className: "text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
              },
              "Cancel"
            )
          : null
      ),
      React.createElement("div", {
        className: "h-7 w-64 bg-slate-100 rounded-xl animate-pulse"
      }),
      React.createElement("div", {
        className: "h-4 w-80 max-w-full bg-slate-100/80 rounded-lg animate-pulse"
      })
    ),
    // Stepper Skeleton Progress
    React.createElement(
      "div",
      {
        className:
          "px-6 sm:px-8 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between"
      },
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("div", {
          className: "w-6 h-6 rounded-full bg-emerald-100 animate-pulse"
        }),
        React.createElement("div", {
          className: "h-3.5 w-28 bg-slate-100 rounded animate-pulse"
        })
      ),
      React.createElement(
        "div",
        { className: "w-20 sm:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden" },
        React.createElement("div", {
          className: "h-full bg-emerald-500 rounded-full w-1/2 animate-[shimmer_1.5s_infinite]"
        })
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("div", {
          className: "w-6 h-6 rounded-full bg-slate-100 animate-pulse"
        }),
        React.createElement("div", {
          className: "h-3.5 w-28 bg-slate-100 rounded animate-pulse"
        })
      )
    ),
    // Main Skeleton Body with Central Shimmer Message
    React.createElement(
      "div",
      {
        className:
          "p-6 sm:p-8 flex-1 flex flex-col justify-center items-center text-center space-y-6"
      },
      React.createElement(
        "div",
        { className: "relative" },
        React.createElement(
          "div",
          {
            className:
              "w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-sm"
          },
          React.createElement(
            "svg",
            {
              className: "animate-spin h-7 w-7 text-white",
              xmlns: "http://www.w3.org/2000/svg",
              fill: "none",
              viewBox: "0 0 24 24"
            },
            React.createElement("circle", {
              className: "opacity-25",
              cx: "12",
              cy: "12",
              r: "10",
              stroke: "currentColor",
              strokeWidth: "3"
            }),
            React.createElement("path", {
              className: "opacity-75",
              fill: "currentColor",
              d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            })
          )
        )
      ),
      React.createElement(
        "div",
        { className: "space-y-2 max-w-sm" },
        React.createElement(
          "span",
          { className: "inline-block px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1" },
          streamProgress > 0
            ? `Streaming Validated JSX • ${Math.min(99, Math.round(streamProgress))}%`
            : "AI Synthesis • Generating"
        ),
        streamProgress > 0
          ? React.createElement(
              "div",
              { className: "w-48 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden my-1.5 border border-slate-200/70" },
              React.createElement("div", {
                className: "h-full bg-emerald-500 rounded-full transition-all duration-150",
                style: { width: `${Math.min(100, Math.round(streamProgress))}%` }
              })
            )
          : null,
        React.createElement(
          "h3",
          { className: "text-lg font-bold text-slate-900 tracking-tight" },
          loadingMessage
        ),
        React.createElement(
          "p",
          { className: "text-xs text-slate-500 leading-relaxed" },
          "Preparing your simplified experience... Tailoring a guided assistant for ",
          React.createElement(
            "span",
            { className: "font-semibold text-emerald-700" },
            formattedField
          ),
          "."
        )
      ),
      React.createElement(
        "div",
        { className: "w-full max-w-md space-y-3 pt-2" },
        React.createElement("div", {
          className: "h-10 w-full bg-slate-50 border border-slate-200 rounded-xl animate-pulse"
        }),
        React.createElement("div", {
          className: "h-10 w-full bg-slate-50 border border-slate-200 rounded-xl animate-pulse delay-75"
        })
      )
    ),
    // Footer Skeleton
    React.createElement(
      "div",
      {
        className:
          "px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between"
      },
      React.createElement("div", {
        className: "h-8 w-24 bg-slate-100 rounded-xl animate-pulse"
      }),
      React.createElement("div", {
        className: "h-9 w-36 bg-emerald-500/30 rounded-xl animate-pulse"
      })
    )
  );
}

export default WizardLoadingSkeleton;
