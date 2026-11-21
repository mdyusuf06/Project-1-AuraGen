"use client";

import React, { Component, useMemo, useState, useCallback, Suspense } from "react";
import PropTypes from "prop-types";
import { compileSafeComponent, DEFAULT_ALLOWED_DS } from "../utils/safeCompiler.js";

/**
 * =============================================================================
 * DynamicRendererErrorBoundary
 * =============================================================================
 * Custom React Error Boundary that catches runtime crashes inside dynamically
 * evaluated React components and renders the configured fallback component.
 */
export class DynamicRendererErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo);
    }
    console.error("[DynamicRenderer] Runtime crash in evaluated component:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Automatically reset error state if the code string changes
    if (prevProps.resetKey !== this.props.resetKey) {
      if (this.state.hasError) {
        this.handleRetry();
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof this.props.onRetry === "function") {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      // Automatically render the user-supplied fallback component/element
      if (fallback) {
        if (typeof fallback === "function") {
          try {
            return fallback({
              error: this.state.error,
              errorInfo: this.state.errorInfo,
              retry: this.handleRetry
            });
          } catch {
            const FallbackComp = fallback;
            return <FallbackComp error={this.state.error} retry={this.handleRetry} />;
          }
        }
        return fallback;
      }

      // Default fallback UI when none is provided
      return (
        <div className="w-full max-w-xl mx-auto my-4 p-5 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm text-rose-950">
          <div className="flex items-center justify-between border-b border-rose-200/70 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                Dynamic Component Execution Crash
              </h4>
            </div>
            <span className="text-[10px] font-mono bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded">
              ErrorBoundary
            </span>
          </div>

          <p className="text-xs text-rose-800 mb-2">
            An unhandled runtime exception occurred inside the evaluated component:
          </p>

          <pre className="p-3 bg-slate-950 text-rose-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4 border border-rose-900/40">
            {this.state.error?.message || String(this.state.error)}
          </pre>

          <button
            type="button"
            onClick={this.handleRetry}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Retry Execution
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

DynamicRendererErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func,
    PropTypes.element
  ]),
  resetKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onError: PropTypes.func,
  onRetry: PropTypes.func
};

/**
 * =============================================================================
 * GlowingSkeletonLoader
 * =============================================================================
 * High-fidelity, glowing Tailwind CSS skeleton loader designed to maintain
 * visual hierarchy and layout stability while the generative component compiles.
 * Prevents Cumulative Layout Shift (CLS) by reserving the component's vertical footprint.
 */
export function GlowingSkeletonLoader({ minHeight = "460px", className = "" }) {
  const heightStyle = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  return (
    <div
      className={`relative w-full rounded-2xl border border-indigo-500/25 bg-slate-900/90 p-6 md:p-8 backdrop-blur-md shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col justify-between ${className}`}
      style={{ minHeight: heightStyle }}
      role="status"
      aria-label="Synthesizing and compiling dynamic UI component"
      aria-busy="true"
    >
      {/* Ambient Radial Glowing Halos */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Shimmer Sweep Animation Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent -translate-x-full animate-shimmer"></div>
      </div>

      {/* Header & Glowing Beacon */}
      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-sm shadow-cyan-400"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300">
              AuraGen AI Synthesis • Compiling Component...
            </span>
          </div>

          <div className="h-6 w-24 rounded-full bg-indigo-950/60 border border-indigo-500/30 animate-pulse"></div>
        </div>

        {/* Title & Description Skeletons */}
        <div className="space-y-2 pt-1">
          <div className="h-7 w-3/5 rounded-xl bg-slate-800/80 animate-pulse"></div>
          <div className="h-4 w-4/5 rounded-lg bg-slate-800/50 animate-pulse"></div>
        </div>

        {/* Informational Guidance Box Skeleton */}
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/30 space-y-2 my-2">
          <div className="h-4 w-2/5 rounded bg-indigo-400/25 animate-pulse"></div>
          <div className="h-3 w-4/5 rounded bg-indigo-400/15 animate-pulse"></div>
        </div>

        {/* Simulated Field Skeletons */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-slate-700/60 animate-pulse"></div>
            <div className="h-11 w-full rounded-xl bg-slate-800/60 border border-indigo-500/20 animate-pulse flex items-center px-4">
              <div className="h-3 w-36 rounded bg-slate-700/40"></div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-slate-700/60 animate-pulse"></div>
            <div className="h-11 w-full rounded-xl bg-slate-800/60 border border-indigo-500/20 animate-pulse flex items-center px-4">
              <div className="h-3 w-48 rounded bg-slate-700/40"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Action Buttons Skeleton */}
      <div className="relative z-10 flex items-center justify-between pt-5 border-t border-slate-800/80 mt-6">
        <div className="h-10 w-24 rounded-xl bg-slate-800/70 border border-slate-700/50 animate-pulse"></div>
        <div className="h-10 w-32 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 opacity-80 animate-pulse shadow-lg shadow-indigo-500/25"></div>
      </div>
    </div>
  );
}

GlowingSkeletonLoader.propTypes = {
  minHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string
};

/**
 * =============================================================================
 * DynamicRenderer Client Component
 * =============================================================================
 * Evaluates and mounts raw React component code strings in-browser using safeCompiler.
 * Supports asynchronous mounting and layout stability via React.Suspense and a glowing
 * skeleton loader, with reserved container min-height preventing layout shifts (CLS).
 *
 * @param {Object} props
 * @param {string} props.code - Raw React component code string (JSX/ES6).
 * @param {Object} [props.initialValues={}] - User inputs/state to inject into the component.
 * @param {Function} [props.onChange] - Callback triggered when values change inside component.
 * @param {Function} [props.onSubmit] - Callback triggered when the component submits.
 * @param {React.ReactNode|Function} [props.fallback] - Fallback rendered on compilation/runtime crash.
 * @param {React.ReactNode} [props.suspenseFallback] - Custom skeleton rendered while compiling/suspending.
 * @param {Object} [props.allowedDS] - Optional custom Design System dictionary.
 * @param {string|number} [props.minHeight="460px"] - Reserved min-height to prevent Cumulative Layout Shift (CLS).
 * @param {Function} [props.onError] - Optional callback triggered on compilation/runtime error.
 * @param {string} [props.className] - Optional wrapper class styling.
 */
export default function DynamicRenderer({
  code,
  initialValues = {},
  onChange,
  onSubmit,
  fallback,
  suspenseFallback,
  allowedDS,
  minHeight = "460px",
  onError,
  className = ""
}) {
  const [retryNonce, setRetryNonce] = useState(0);

  // Compile raw code string via safeCompiler utility with Babel standalone & sandbox
  const { Component: CompiledComponent, compileError } = useMemo(() => {
    if (!code || typeof code !== "string" || !code.trim()) {
      return { Component: null, compileError: null };
    }

    try {
      const Comp = compileSafeComponent(code, {
        allowedDS: allowedDS || DEFAULT_ALLOWED_DS
      });
      return { Component: Comp, compileError: null };
    } catch (err) {
      console.error("[DynamicRenderer] Compilation failed:", err);
      if (typeof onError === "function") {
        onError(err);
      }
      return { Component: null, compileError: err };
    }
  }, [code, allowedDS, retryNonce, onError]);

  const handleRetry = useCallback(() => {
    setRetryNonce((prev) => prev + 1);
  }, []);

  const heightStyle = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  // 1. If code is missing or empty, render fallback or the default GlowingSkeletonLoader
  if (!code || typeof code !== "string" || !code.trim()) {
    if (fallback) {
      return typeof fallback === "function" ? fallback({ error: null, retry: handleRetry }) : fallback;
    }
    return (
      <div
        className={`dynamic-renderer-container relative w-full min-h-[460px] ${className}`}
        style={{ minHeight: heightStyle }}
      >
        <GlowingSkeletonLoader minHeight={minHeight} />
      </div>
    );
  }

  // 2. If compilation fails, automatically render the fallback component
  if (compileError) {
    if (fallback) {
      return typeof fallback === "function"
        ? fallback({ error: compileError, retry: handleRetry })
        : fallback;
    }

    // Default error display if no custom fallback is provided
    return (
      <div
        className={`w-full max-w-xl mx-auto my-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm text-amber-950 min-h-[460px] flex flex-col justify-center ${className}`}
        style={{ minHeight: heightStyle }}
      >
        <div className="flex items-center justify-between border-b border-amber-200 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Compilation Error
            </h4>
          </div>
          <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
            safeCompiler
          </span>
        </div>

        <p className="text-xs text-amber-800 mb-2">
          Failed to safely transpile and evaluate the component code:
        </p>

        <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4 border border-amber-900/30">
          {compileError.message}
        </pre>

        <button
          type="button"
          onClick={handleRetry}
          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors self-start"
        >
          Retry Compilation
        </button>
      </div>
    );
  }

  // 3. Render compiled component wrapped inside React.Suspense and custom ErrorBoundary
  return (
    <div
      className={`dynamic-renderer-container relative w-full min-h-[460px] transition-all duration-300 ease-out ${className}`}
      style={{ minHeight: heightStyle }}
    >
      <DynamicRendererErrorBoundary
        fallback={fallback}
        resetKey={`${code}-${retryNonce}`}
        onError={onError}
        onRetry={handleRetry}
      >
        <Suspense fallback={suspenseFallback || <GlowingSkeletonLoader minHeight={minHeight} />}>
          {CompiledComponent ? (
            <CompiledComponent
              initialValues={initialValues}
              onChange={onChange}
              onSubmit={onSubmit}
            />
          ) : (
            <GlowingSkeletonLoader minHeight={minHeight} />
          )}
        </Suspense>
      </DynamicRendererErrorBoundary>
    </div>
  );
}

/**
 * =============================================================================
 * Strict Prop-Type Validation
 * =============================================================================
 */
DynamicRenderer.propTypes = {
  /**
   * Raw React JSX/ES6 component source string to compile and evaluate.
   */
  code: PropTypes.string.isRequired,

  /**
   * Initial values/state object injected into the compiled component.
   */
  initialValues: PropTypes.object,

  /**
   * Event handler callback when inputs/values change inside the compiled component.
   */
  onChange: PropTypes.func,

  /**
   * Event handler callback when the compiled component submits data.
   */
  onSubmit: PropTypes.func,

  /**
   * Fallback UI element, node, or render function displayed on compilation
   * failure or runtime component crash.
   */
  fallback: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func,
    PropTypes.element
  ]),

  /**
   * Custom skeleton loader or element displayed in React.Suspense while compiling or suspending.
   */
  suspenseFallback: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.element
  ]),

  /**
   * Reserved minimum height preventing Cumulative Layout Shift (CLS) during DOM injection.
   */
  minHeight: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),

  /**
   * Custom Design System dictionary extending/overriding default DS primitives.
   */
  allowedDS: PropTypes.object,

  /**
   * Optional error listener callback triggered on compilation error or runtime crash.
   */
  onError: PropTypes.func,

  /**
   * Optional wrapper class styling.
   */
  className: PropTypes.string
};

DynamicRenderer.defaultProps = {
  initialValues: {},
  onChange: undefined,
  onSubmit: undefined,
  fallback: null,
  suspenseFallback: null,
  minHeight: "460px",
  allowedDS: undefined,
  onError: undefined,
  className: ""
};
