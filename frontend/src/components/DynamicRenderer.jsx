"use client";

import React, { Component, useMemo, useState, useCallback, useEffect } from "react";
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
          // If fallback is a render prop or component function
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
 * Default loading / placeholder skeleton when code is empty or compiling
 */
function DefaultEmptyFallback() {
  return (
    <div className="w-full max-w-xl mx-auto my-4 p-6 bg-slate-50/80 border border-dashed border-slate-300 rounded-2xl text-center text-slate-500">
      <p className="text-xs font-medium">Awaiting dynamic component payload...</p>
    </div>
  );
}

/**
 * =============================================================================
 * DynamicRenderer Client Component
 * =============================================================================
 * Evaluates and mounts raw React component code strings in-browser using safeCompiler.
 * Wraps output in a custom ErrorBoundary and renders the fallback if compilation
 * or runtime execution fails.
 *
 * @param {Object} props
 * @param {string} props.code - Raw React component code string (JSX/ES6).
 * @param {Object} [props.initialValues={}] - User inputs/state to inject into the component.
 * @param {Function} [props.onChange] - Callback triggered when values change inside component.
 * @param {Function} [props.onSubmit] - Callback triggered when the component submits.
 * @param {React.ReactNode|Function} [props.fallback] - Component/element rendered on crash or failure.
 * @param {Object} [props.allowedDS] - Optional custom Design System dictionary.
 * @param {Function} [props.onError] - Optional callback triggered when compilation or runtime fails.
 * @param {string} [props.className] - Optional wrapper class styling.
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

  // 1. If code is missing or empty, render fallback (or default placeholder)
  if (!code || typeof code !== "string" || !code.trim()) {
    if (fallback) {
      return typeof fallback === "function" ? fallback({ error: null, retry: handleRetry }) : fallback;
    }
    return <DefaultEmptyFallback />;
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
      <div className={`w-full max-w-xl mx-auto my-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm text-amber-950 ${className}`}>
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
          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
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
            initialValues={initialValues}
            onChange={onChange}
            onSubmit={onSubmit}
          />
        ) : null}
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
  allowedDS: undefined,
  onError: undefined,
  className: ""
};
