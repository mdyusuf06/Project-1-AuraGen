"use client";

import React from "react";

/**
 * Fallback UI component displayed when an error occurs inside the generated wizard.
 *
 * Requirements met:
 * - Friendly user-facing message instead of blank screen
 * - Does not expose internal stack traces, syntax errors, or sensitive info
 * - Clear "Retry Assistance" action
 * - Safe "Return to Original Form" fallback action
 * - Matches AuraGen design system (Tailwind, indigo/rose contrast)
 */
export function WizardErrorFallback({ onRetry, onRestoreOriginal }) {
  return React.createElement(
    "div",
    {
      className:
        "bg-white border border-rose-200 rounded-3xl shadow-xl overflow-hidden min-h-[480px] flex flex-col justify-between"
    },
    // Header
    React.createElement(
      "div",
      {
        className:
          "bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4"
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "span",
          {
            className:
              "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/30 text-rose-300 border border-rose-500/40 mb-1.5"
          },
          "Assistant Recovery"
        ),
        React.createElement(
          "h2",
          { className: "text-xl sm:text-2xl font-black tracking-tight text-white" },
          "Unable to Display Simplified Assistant"
        )
      ),
      onRestoreOriginal
        ? React.createElement(
            "button",
            {
              type: "button",
              onClick: onRestoreOriginal,
              className:
                "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
            },
            "← Back to Full Form"
          )
        : null
    ),
    // Body with helpful user message
    React.createElement(
      "div",
      {
        className:
          "p-6 sm:p-10 flex-1 flex flex-col items-center justify-center text-center space-y-5"
      },
      React.createElement(
        "div",
        {
          className:
            "w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center text-3xl shadow-sm"
        },
        "🛡️"
      ),
      React.createElement(
        "div",
        { className: "space-y-2 max-w-md" },
        React.createElement(
          "h3",
          { className: "text-lg font-bold text-slate-900" },
          "We ran into an unexpected issue"
        ),
        React.createElement(
          "p",
          { className: "text-xs sm:text-sm text-slate-600 leading-relaxed" },
          "We encountered a temporary problem while rendering the simplified assistant. Don't worry—your previously entered form data is completely safe and preserved."
        )
      ),
      // Action Buttons
      React.createElement(
        "div",
        { className: "flex flex-wrap items-center justify-center gap-3 pt-2" },
        onRetry
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: onRetry,
                className:
                  "px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              },
              "Retry Assistance"
            )
          : null,
        onRestoreOriginal
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: onRestoreOriginal,
                className:
                  "px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              },
              "Return to Original Form"
            )
          : null
      )
    ),
    // Footer Info
    React.createElement(
      "div",
      {
        className:
          "px-6 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500"
      },
      "AuraGen Self-Healing Resilience Layer • Data safely preserved in memory"
    )
  );
}

/**
 * Reusable React Error Boundary
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log safely for telemetry / diagnostic monitoring without displaying stack traces in user UI
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Ensure state reflects clearance in both mounted React trees and unmounted unit tests
    if (this.state && this.state.hasError) {
      this.state.hasError = false;
      this.state.error = null;
    }
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function"
          ? this.props.fallback({
              retry: this.handleRetry,
              onRestoreOriginal: this.props.onRestoreOriginal
            })
          : this.props.fallback;
      }

      return React.createElement(WizardErrorFallback, {
        onRetry: this.handleRetry,
        onRestoreOriginal: this.props.onRestoreOriginal
      });
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
