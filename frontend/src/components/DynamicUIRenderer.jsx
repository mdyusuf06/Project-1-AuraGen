"use client";

import React, {
  Component,
  useMemo,
  useState,
  useCallback,
  useRef,
  Suspense
} from "react";
import { compileComponent } from "../services/dynamicCompiler.js";

export { compileComponent };

/**
 * DynamicUIErrorBoundary isolating execution inside dynamically compiled components.
 */
export class DynamicUIErrorBoundary extends Component {
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
    console.error("[DynamicUIRenderer] Dynamic component caught exception:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof this.props.onRetry === "function") {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function"
          ? this.props.fallback({
              error: this.state.error,
              retry: this.handleRetry,
              reset: this.props.onReset
            })
          : this.props.fallback;
      }

      return (
        <div className="w-full max-w-2xl mx-auto my-6 p-6 bg-white border border-rose-200 rounded-2xl shadow-sm text-slate-800 transition-all">
          <div className="flex items-start justify-between gap-3 mb-3 border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-rose-700 uppercase tracking-wider font-mono">
                  Generative UI Execution Fault
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The compiled dynamic component threw a runtime exception.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              ErrorBoundary
            </span>
          </div>

          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-700 mb-1">
              Diagnostic Stack:
            </div>
            <pre className="p-3 bg-slate-900 text-rose-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {this.state.error?.message || String(this.state.error)}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
            >
              Retry Execution
            </button>
            {this.props.onReset && (
              <button
                type="button"
                onClick={this.props.onReset}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Revert to Standard Form
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function DefaultLoadingSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto my-6 p-8 bg-white border border-slate-200 rounded-2xl animate-pulse space-y-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="h-5 w-48 bg-slate-200 rounded-lg" />
        <div className="h-6 w-24 bg-emerald-100 rounded-full" />
      </div>
      <div className="h-16 bg-slate-100 rounded-xl" />
      <div className="space-y-3 pt-2">
        <div className="h-3 w-28 bg-slate-200 rounded" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
      <div className="flex justify-between pt-4">
        <div className="h-10 w-24 bg-slate-200 rounded-xl" />
        <div className="h-10 w-32 bg-emerald-500/40 rounded-xl" />
      </div>
    </div>
  );
}

export default function DynamicUIRenderer({
  code,
  initialValues = {},
  onSubmit,
  onCancel,
  onChange,
  onViewCode,
  fallback,
  showDiagnostics = true,
  className = ""
}) {
  const [retryNonce, setRetryNonce] = useState(0);

  // Keep callback refs stable to prevent unneeded recompilation or remounting
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Compile strictly once when `code` changes - ZERO AST re-evaluation during typing
  const { Component: CompiledComponent, compileError } = useMemo(() => {
    if (!code || typeof code !== "string" || !code.trim()) {
      return { Component: null, compileError: null };
    }

    try {
      const Comp = compileComponent(code);
      return { Component: Comp, compileError: null };
    } catch (err) {
      console.error("[DynamicUIRenderer] Compilation error:", err);
      return { Component: null, compileError: err };
    }
  }, [code, retryNonce]);

  const handleRetry = useCallback(() => {
    setRetryNonce((prev) => prev + 1);
  }, []);

  // Stable initial values snapshot keyed to code identity
  const stableInitialValues = useMemo(() => {
    return initialValues || {};
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const stableOnChange = useCallback((val) => {
    onChangeRef.current?.(val);
  }, []);

  const stableOnSubmit = useCallback((val) => {
    onSubmitRef.current?.(val);
  }, []);

  if (!code) {
    return null;
  }

  if (compileError) {
    return (
      <div
        className={`w-full max-w-2xl mx-auto my-6 p-6 bg-white border border-amber-200 rounded-2xl shadow-sm text-slate-800 ${className}`}
      >
        <div className="flex items-center justify-between mb-3 border-b border-amber-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="font-bold text-sm text-amber-800 uppercase tracking-wide">
              Compilation Error in Generative Component
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-md border border-amber-200">
            Sucrase Engine
          </span>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          The code returned from the backend could not be compiled into a valid React component:
        </p>

        <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4 shadow-inner">
          {compileError.message}
        </pre>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
          >
            Retry Compilation
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Cancel & Return
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!CompiledComponent) {
    return typeof fallback === "function" ? fallback() : fallback || null;
  }

  return (
    <div className={`w-full relative transition-all duration-200 ${className}`}>
      {showDiagnostics && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-3 bg-white rounded-xl border border-slate-200 shadow-sm text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-800 font-semibold">AuraGen Sandbox</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-emerald-700 font-medium">AST-Verified & Compile-Once</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-slate-400 font-mono text-[11px]">{code.length} chars</span>
            {onViewCode && (
              <button
                type="button"
                onClick={onViewCode}
                className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
              >
                Inspect Code
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                Exit Wizard
              </button>
            )}
          </div>
        </div>
      )}

      <DynamicUIErrorBoundary onReset={onCancel} fallback={fallback}>
        <Suspense fallback={<DefaultLoadingSkeleton />}>
          <CompiledComponent
            initialValues={stableInitialValues}
            onSubmit={stableOnSubmit}
            onChange={stableOnChange}
            onCancel={onCancel}
          />
        </Suspense>
      </DynamicUIErrorBoundary>
    </div>
  );
}
