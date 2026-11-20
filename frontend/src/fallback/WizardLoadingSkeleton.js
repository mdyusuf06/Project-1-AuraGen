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
        "bg-white border border-indigo-200/80 rounded-3xl shadow-xl overflow-hidden min-h-[520px] flex flex-col justify-between"
    },
    // Header Skeleton Bar
    React.createElement(
      "div",
      {
        className:
          "bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-7 space-y-3"
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement("div", {
            className: "h-5 w-32 bg-indigo-500/30 rounded-full animate-pulse"
          }),
          React.createElement("div", {
            className: "h-5 w-24 bg-rose-500/20 rounded-full animate-pulse"
          })
        ),
        onCancel
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: onCancel,
                className: "text-xs text-slate-400 hover:text-white transition-colors"
              },
              "Cancel"
            )
          : null
      ),
      React.createElement("div", {
        className: "h-7 w-64 bg-slate-800 rounded-xl animate-pulse"
      }),
      React.createElement("div", {
        className: "h-4 w-80 max-w-full bg-slate-800/80 rounded-lg animate-pulse"
      })
    ),
    // Stepper Skeleton Progress
    React.createElement(
      "div",
      {
        className:
          "px-6 sm:px-8 py-3.5 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center justify-between"
      },
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("div", {
          className: "w-6 h-6 rounded-full bg-indigo-200 animate-pulse"
        }),
        React.createElement("div", {
          className: "h-3.5 w-28 bg-indigo-100 rounded animate-pulse"
        })
      ),
      React.createElement(
        "div",
        { className: "w-20 sm:w-28 h-1.5 bg-indigo-100 rounded-full overflow-hidden" },
        React.createElement("div", {
          className: "h-full bg-indigo-400/40 rounded-full w-1/2 animate-[shimmer_1.5s_infinite]"
        })
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("div", {
          className: "w-6 h-6 rounded-full bg-slate-200 animate-pulse"
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
      // Animated Loading Spinner Indicator
      React.createElement(
        "div",
        { className: "relative" },
        React.createElement(
          "div",
          {
            className:
              "w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"
          },
          React.createElement(
            "svg",
            {
              className: "animate-spin h-8 w-8 text-white",
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
        ),
        React.createElement("div", {
          className: "absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-md -z-10 animate-pulse"
        })
      ),
      // Required Message Text
      React.createElement(
        "div",
        { className: "space-y-1.5 max-w-sm" },
        React.createElement(
          "h3",
          { className: "text-lg font-bold text-slate-900 tracking-tight" },
          loadingMessage
        ),
        React.createElement(
          "p",
          { className: "text-xs text-slate-500 leading-relaxed" },
          "AI-assisted friction engine is tailoring a conversational step-by-step assistant for ",
          React.createElement(
            "span",
            { className: "font-semibold text-indigo-700" },
            formattedField
          ),
          "."
        )
      ),
      // Shimmer Input Placeholders
      React.createElement(
        "div",
        { className: "w-full max-w-md space-y-3 pt-2" },
        React.createElement("div", {
          className: "h-10 w-full bg-slate-100 rounded-xl animate-pulse"
        }),
        React.createElement("div", {
          className: "h-10 w-full bg-slate-100 rounded-xl animate-pulse delay-75"
        })
      )
    ),
    // Footer Skeleton
    React.createElement(
      "div",
      {
        className:
          "px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between"
      },
      React.createElement("div", {
        className: "h-8 w-24 bg-slate-200 rounded-xl animate-pulse"
      }),
      React.createElement("div", {
        className: "h-9 w-36 bg-indigo-200 rounded-xl animate-pulse"
      })
    )
  );
}

export default WizardLoadingSkeleton;
