"use client";

import React, { Component, memo, useMemo, useState, useCallback, useEffect, useRef, Suspense } from "react";
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

      return (
        <div className="w-full max-w-xl mx-auto my-4 p-6 bg-white border border-rose-200 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] text-rose-950">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-900">
                Dynamic Component Execution Issue
              </h4>
            </div>
            <span className="text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
              ErrorBoundary
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-3">
            An unhandled runtime exception occurred inside the evaluated component:
          </p>

          <pre className="p-3.5 bg-slate-50 text-rose-700 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4 border border-slate-200">
            {this.state.error?.message || String(this.state.error)}
          </pre>

          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
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
 * GlowingSkeletonLoader (Clean Light-Mode Skeleton)
 * =============================================================================
 * Minimalist, breathable white/slate skeleton loader with soft emerald pulse
 * that reserves the dynamic component's vertical footprint to prevent CLS.
 */
export function GlowingSkeletonLoader({ minHeight = "460px", className = "" }) {
  const heightStyle = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  return (
    <div
      className={`relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col justify-between ${className}`}
      style={{ minHeight: heightStyle }}
      role="status"
      aria-label="Synthesizing and compiling dynamic UI component"
      aria-busy="true"
    >
      {/* Subtle Shimmer Sweep Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full animate-shimmer"></div>
      </div>

      {/* Header & Status Beacon */}
      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              AuraGen AI Synthesis • Compiling Component...
            </span>
          </div>

          <div className="h-6 w-24 rounded-full bg-emerald-50 border border-emerald-200 animate-pulse"></div>
        </div>

        {/* Title & Description Skeletons */}
        <div className="space-y-2.5 pt-1">
          <div className="h-7 w-3/5 rounded-xl bg-slate-100 animate-pulse"></div>
          <div className="h-4 w-4/5 rounded-lg bg-slate-100/80 animate-pulse"></div>
        </div>

        {/* Informational Guidance Box Skeleton */}
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2 my-2">
          <div className="h-4 w-2/5 rounded bg-emerald-200/60 animate-pulse"></div>
          <div className="h-3 w-4/5 rounded bg-emerald-100 animate-pulse"></div>
        </div>

        {/* Simulated Field Skeletons */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-slate-200/70 animate-pulse"></div>
            <div className="h-11 w-full rounded-xl bg-slate-50 border border-slate-200 animate-pulse flex items-center px-4">
              <div className="h-3 w-36 rounded bg-slate-200/70"></div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-slate-200/70 animate-pulse"></div>
            <div className="h-11 w-full rounded-xl bg-slate-50 border border-slate-200 animate-pulse flex items-center px-4">
              <div className="h-3 w-48 rounded bg-slate-200/70"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Action Buttons Skeleton */}
      <div className="relative z-10 flex items-center justify-between pt-5 border-t border-slate-100 mt-6">
        <div className="h-10 w-24 rounded-xl bg-slate-100 border border-slate-200 animate-pulse"></div>
        <div className="h-10 w-36 rounded-xl bg-emerald-500/80 animate-pulse shadow-sm"></div>
      </div>
    </div>
  );
}

GlowingSkeletonLoader.propTypes = {
  minHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string
};

const MemoizedCompiledView = memo(function MemoizedCompiledView({
  CompiledComponent,
  initialValues,
  onChange,
  onSubmit,
  onCancel
}) {
  return (
    <CompiledComponent
      initialValues={initialValues}
      onChange={onChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
});

/**
 * =============================================================================
 * DynamicRenderer Client Component (Memoized Zero-Lag Shell)
 * =============================================================================
 * Compiles raw React code strings strictly ONCE per `code` change using Babel
 * standalone + scoped sandbox, and debounces `onChange` state sync to parent
 * hooks so typing inside the generated wizard never causes re-render lag or
 * cursor-jumping.
 */
export default function DynamicRenderer({
  code,
  initialValues = {},
  onChange,
  onSubmit,
  onCancel,
  fallback,
  suspenseFallback,
  allowedDS,
  minHeight = "460px",
  onError,
  className = ""
}) {
  const [retryNonce, setRetryNonce] = useState(0);

  // Ref-stabilized callbacks so parent re-renders never trigger recompilation or child resets
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const debounceTimerRef = useRef(null);
  const latestValuesRef = useRef(initialValues);

  // Freeze initialValues snapshot for the current compiled component instance
  // so parent form state updates from debounced sync don't reset child state mid-typing.
  const stableInitialValues = useMemo(() => initialValues, [code, retryNonce]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Compile raw code string EXACTLY ONCE per code / allowedDS / retryNonce change
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
      return { Component: null, compileError: err };
    }
  }, [code, allowedDS, retryNonce]);

  // Notify onError via effect (outside useMemo render phase)
  useEffect(() => {
    if (compileError && typeof onErrorRef.current === "function") {
      onErrorRef.current(compileError);
    }
  }, [compileError]);

  // Debounced + memoized onChange sync to prevent keystroke lag & parent re-render loops
  const handleCompiledChange = useCallback((updatedValues) => {
    latestValuesRef.current = updatedValues;
    if (typeof onChangeRef.current !== "function") return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChangeRef.current?.(latestValuesRef.current);
    }, 120);
  }, []);

  const handleCompiledSubmit = useCallback((submittedValues) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const merged = submittedValues || latestValuesRef.current;
    onChangeRef.current?.(merged);
    onSubmitRef.current?.(merged);
  }, []);

  const handleCompiledCancel = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      if (latestValuesRef.current) {
        onChangeRef.current?.(latestValuesRef.current);
      }
    }
    onCancelRef.current?.();
  }, []);

  const handleRetry = useCallback(() => {
    setRetryNonce((prev) => prev + 1);
  }, []);

  const heightStyle = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  // 1. If code is missing or empty, render fallback or default light-mode skeleton
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

  // 2. If compilation fails, render fallback component or clean light-mode error card
  if (compileError) {
    if (fallback) {
      return typeof fallback === "function"
        ? fallback({ error: compileError, retry: handleRetry })
        : fallback;
    }

    return (
      <div
        className={`w-full max-w-xl mx-auto my-4 p-6 bg-white border border-amber-200 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] text-slate-900 min-h-[460px] flex flex-col justify-center ${className}`}
        style={{ minHeight: heightStyle }}
      >
        <div className="flex items-center justify-between border-b border-amber-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Compilation Error
            </h4>
          </div>
          <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
            safeCompiler
          </span>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          Failed to safely transpile and evaluate the component code:
        </p>

        <pre className="p-3.5 bg-slate-50 text-amber-800 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4 border border-slate-200">
          {compileError.message}
        </pre>

        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors self-start shadow-sm"
        >
          Retry Compilation
        </button>
      </div>
    );
  }

  // 3. Render compiled component wrapped inside React.Suspense and ErrorBoundary
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
            <MemoizedCompiledView
              CompiledComponent={CompiledComponent}
              initialValues={stableInitialValues}
              onChange={handleCompiledChange}
              onSubmit={handleCompiledSubmit}
              onCancel={handleCompiledCancel}
            />
          ) : (
            <GlowingSkeletonLoader minHeight={minHeight} />
          )}
        </Suspense>
      </DynamicRendererErrorBoundary>
    </div>
  );
}

DynamicRenderer.propTypes = {
  code: PropTypes.string.isRequired,
  initialValues: PropTypes.object,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  fallback: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func,
    PropTypes.element
  ]),
  suspenseFallback: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.element
  ]),
  minHeight: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  allowedDS: PropTypes.object,
  onError: PropTypes.func,
  className: PropTypes.string
};

DynamicRenderer.defaultProps = {
  initialValues: {},
  onChange: undefined,
  onSubmit: undefined,
  onCancel: undefined,
  fallback: null,
  suspenseFallback: null,
  minHeight: "460px",
  allowedDS: undefined,
  onError: undefined,
  className: ""
};
