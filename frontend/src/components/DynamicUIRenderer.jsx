"use client";

import React, {
  Component,
  useMemo,
  useState,
  useCallback,
  Suspense
} from "react";
import { compileComponent } from "../services/dynamicCompiler.js";

// Re-export compileComponent for external consumers
export { compileComponent };

/**
 * =============================================================================
 * DynamicUIErrorBoundary
 * =============================================================================
 * Robust Error Boundary to isolate errors within dynamically evaluated components.
 * Prevents unhandled syntax, runtime, or rendering errors from crashing
 * the parent Next.js application, providing friendly recovery actions.
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
        <div className="w-full max-w-2xl mx-auto my-6 p-6 bg-rose-50/90 border border-rose-200 rounded-2xl shadow-sm text-rose-950 transition-all">
          <div className="flex items-start justify-between gap-3 mb-3 border-b border-rose-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <div>
                <h3 className="font-bold text-sm text-rose-950 uppercase tracking-wider">
                  Self-Healing Component Runtime Exception
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  The generated UI failed during evaluation or rendering.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-200/70 text-rose-800">
              ErrorBoundary Active
            </span>
          </div>

          <div className="mb-4">
            <div className="text-xs font-semibold text-rose-900 mb-1">
              Error Details:
            </div>
            <pre className="p-3 bg-slate-950 text-rose-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-rose-900/40">
              {this.state.error?.message || String(this.state.error)}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Retry Render
            </button>
            {this.props.onReset && (
              <button
                type="button"
                onClick={this.props.onReset}
                className="px-4 py-2 rounded-xl bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-semibold transition-colors"
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

/**
 * Default Loading Skeleton for Suspense fallback
 */
function DefaultLoadingSkeleton() {
  return (
    <div className="w-full max-w-xl mx-auto my-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm animate-pulse space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="h-4 w-40 bg-slate-200 rounded"></div>
        <div className="h-6 w-20 bg-indigo-100 rounded-full"></div>
      </div>
      <div className="h-14 bg-indigo-50/60 rounded-xl"></div>
      <div className="space-y-3 pt-2">
        <div className="h-3 w-28 bg-slate-200 rounded"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
      </div>
      <div className="flex justify-between pt-4">
        <div className="h-9 w-20 bg-slate-200 rounded-xl"></div>
        <div className="h-9 w-28 bg-indigo-200 rounded-xl"></div>
      </div>
    </div>
  );
}

/**
 * =============================================================================
 * DynamicUIRenderer Component
 * =============================================================================
 * Safely evaluates and mounts raw React component code generated by the AuraGen
 * backend without triggering a full page refresh.
 *
 * @param {Object} props
 * @param {string} props.code - The raw JSX/ESM component string received via WebSockets.
 * @param {Object} [props.initialValues={}] - User input values to populate the simplified form.
 * @param {Function} [props.onSubmit] - Callback triggered when the dynamic form submits.
 * @param {Function} [props.onCancel] - Callback triggered if the user cancels or closes the wizard.
 * @param {Function} [props.onViewCode] - Optional callback to inspect the raw code in a drawer.
 * @param {React.ReactNode} [props.fallback] - Custom loading / error fallback.
 * @param {boolean} [props.showDiagnostics=true] - Display top AuraGen status bar.
 * @param {string} [props.className=""] - Wrapper container styling.
 */
export default function DynamicUIRenderer({
  code,
  initialValues = {},
  onSubmit,
  onCancel,
  onViewCode,
  fallback,
  showDiagnostics = true,
  className = ""
}) {
  const [retryNonce, setRetryNonce] = useState(0);

  // Compile the raw code string memoized by code & retryNonce
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

  if (!code) {
    return null;
  }

  // Handle compilation errors
  if (compileError) {
    return (
      <div className={`w-full max-w-2xl mx-auto my-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm text-amber-950 ${className}`}>
        <div className="flex items-center justify-between mb-3 border-b border-amber-200 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h3 className="font-bold text-sm text-amber-900 uppercase tracking-wide">
              Compilation Error in Generative Component
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
            Sucrase Runtime
          </span>
        </div>

        <p className="text-xs text-amber-800 mb-3">
          The code returned from the backend could not be compiled into a valid React component:
        </p>

        <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4 border border-amber-900/30">
          {compileError.message}
        </pre>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
          >
            Retry Compilation
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors"
            >
              Revert to Standard Form
            </button>
          )}
          {onViewCode && (
            <button
              type="button"
              onClick={onViewCode}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors ml-auto"
            >
              View Raw Code
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!CompiledComponent) {
    return fallback || <DefaultLoadingSkeleton />;
  }

  return (
    <div className={`w-full max-w-3xl mx-auto space-y-4 ${className}`}>
      {showDiagnostics && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3 border border-indigo-700/50">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  AuraGen Self-Healing Generative UI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/40 text-indigo-200 border border-indigo-400/30">
                  Live Mounted
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Dynamic React component mounted without page refresh • Tailwind CSS styling active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewCode && (
              <button
                type="button"
                onClick={onViewCode}
                className="px-3 py-1.5 rounded-xl bg-indigo-700/70 hover:bg-indigo-600 text-indigo-100 hover:text-white text-xs font-medium transition-colors"
              >
                Inspect Code
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700"
              >
                Exit Wizard
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Boundary protects the page from runtime failures inside the dynamic component */}
      <DynamicUIErrorBoundary
        onReset={onCancel}
        onRetry={handleRetry}
        fallback={fallback}
      >
        <Suspense fallback={fallback || <DefaultLoadingSkeleton />}>
          <div className="relative">
            <CompiledComponent
              initialValues={initialValues}
              onSubmit={onSubmit}
              onCancel={onCancel}
            />
          </div>
        </Suspense>
      </DynamicUIErrorBoundary>
    </div>
  );
}
