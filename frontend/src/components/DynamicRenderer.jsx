"use client";

import React, { Component, useMemo, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { compileSafeComponent, DEFAULT_ALLOWED_DS } from "../utils/safeCompiler.js";

/**
 * =============================================================================
 * DynamicRendererErrorBoundary
 * =============================================================================
 * Error boundary that catches runtime crashes inside dynamically evaluated
 * components and renders the configured fallback component or a clean card.
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
        <div className="w-full max-w-xl mx-auto my-4 p-5 bg-white border border-rose-200 rounded-2xl shadow-sm text-slate-800">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Component Runtime Fault
              </h4>
            </div>
            <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
              ErrorBoundary
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-2">
            The generated component encountered an execution error:
          </p>

          <pre className="p-3 bg-slate-900 text-rose-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4">
            {this.state.error?.message || String(this.state.error)}
          </pre>

          <button
            type="button"
            onClick={this.handleRetry}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

DynamicRendererErrorBoundary.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func, PropTypes.element]),
  resetKey: PropTypes.string,
  onError: PropTypes.func,
  onRetry: PropTypes.func
};

function DefaultEmptyFallback() {
  return (
    <div className="w-full max-w-md mx-auto my-6 p-6 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        &empty;
      </div>
      <p className="text-xs font-medium text-slate-500">
        No active component code provided to DynamicRenderer.
      </p>
    </div>
  );
}

/**
 * =============================================================================
 * DynamicRenderer (Compile Once, Render Fast)
 * =============================================================================
 * High-performance, zero-lag execution container for AST-transpiled components.
 * Memoizes AST compilation strictly by `code` so keystrokes execute at 120fps
 * without re-transpiling Babel or unmounting the component tree.
 */
export default function DynamicRenderer({
  code,
  initialValues = {},
  onChange,
  onSubmit,
  fallback,
  allowedDS,
  onError,
  className = ""
}) {
  const [retryNonce, setRetryNonce] = useState(0);

  // Isolate callback references with useRef so parent re-renders never invalidate useMemo
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // Compile strictly once per code string change - ZERO AST re-evaluation on keystrokes
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
      onErrorRef.current?.(err);
      return { Component: null, compileError: err };
    }
  }, [code, allowedDS, retryNonce]);

  const handleRetry = useCallback(() => {
    setRetryNonce((prev) => prev + 1);
  }, []);

  // Stabilize initial values snapshot by code identity to prevent cursor jumping & input resets
  const stableInitialValues = useMemo(() => {
    return initialValues || {};
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized handlers passed to child to prevent re-render cascades
  const stableOnChange = useCallback((val) => {
    onChangeRef.current?.(val);
  }, []);

  const stableOnSubmit = useCallback((val) => {
    onSubmitRef.current?.(val);
  }, []);

  // 1. If code is missing or empty, render fallback
  if (!code || typeof code !== "string" || !code.trim()) {
    if (fallback) {
      return typeof fallback === "function" ? fallback({ error: null, retry: handleRetry }) : fallback;
    }
    return <DefaultEmptyFallback />;
  }

  // 2. If compilation fails, render fallback or clean error card
  if (compileError) {
    if (fallback) {
      return typeof fallback === "function"
        ? fallback({ error: compileError, retry: handleRetry })
        : fallback;
    }

    return (
      <div className={`w-full max-w-xl mx-auto my-4 p-5 bg-white border border-amber-200 rounded-2xl shadow-sm text-slate-800 ${className}`}>
        <div className="flex items-center justify-between border-b border-amber-100 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Compilation Error
            </h4>
          </div>
          <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
            safeCompiler
          </span>
        </div>

        <p className="text-xs text-slate-600 mb-2">
          Failed to safely transpile and evaluate the component code:
        </p>

        <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4">
          {compileError.message}
        </pre>

        <button
          type="button"
          onClick={handleRetry}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          Retry Compilation
        </button>
      </div>
    );
  }

  // 3. Render compiled component wrapped inside custom ErrorBoundary
  return (
    <div className={`dynamic-renderer-container w-full ${className}`}>
      <DynamicRendererErrorBoundary
        fallback={fallback}
        resetKey={`${code}-${retryNonce}`}
        onError={onError}
        onRetry={handleRetry}
      >
        {CompiledComponent ? (
          <CompiledComponent
            initialValues={stableInitialValues}
            onChange={stableOnChange}
            onSubmit={stableOnSubmit}
          />
        ) : null}
      </DynamicRendererErrorBoundary>
    </div>
  );
}

DynamicRenderer.propTypes = {
  code: PropTypes.string.isRequired,
  initialValues: PropTypes.object,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func, PropTypes.element]),
  allowedDS: PropTypes.object,
  onError: PropTypes.func,
  className: PropTypes.string
};
