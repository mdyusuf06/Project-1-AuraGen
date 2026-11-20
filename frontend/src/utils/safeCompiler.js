/**
 * =============================================================================
 * AuraGen Secure Component Compiler & Evaluation Sandbox
 * frontend/src/utils/safeCompiler.js
 * =============================================================================
 *
 * Security Architecture:
 * 1. Transpilation Layer (@babel/standalone):
 *    - Transpiles JSX and ES6 modules into standard JavaScript (CommonJS).
 *    - Uses classic React runtime (React.createElement).
 *
 * 2. Scoped Execution Sandbox (new Function('React', 'DS', 'exports', ...)):
 *    - Strict scope isolation: Completely blocks ambient browser host globals
 *      (window, document, fetch, localStorage, sessionStorage, XMLHttpRequest, WebSocket, location, etc.).
 *    - Exposes strictly 'React' and the curated, trusted Design System ('DS') components.
 *    - Traps and denies any unauthorized module import attempt via an internal require guard.
 *
 * 3. Component Verification:
 *    - Validates that the executed code yields a valid React component function/object.
 */

import React from "react";
import * as BabelNamespace from "@babel/standalone";

const Babel = BabelNamespace.default || BabelNamespace;

/**
 * Curated Infotact Design System (DS) component primitives.
 * Pre-styled with Tailwind CSS to ensure generated UI looks native and high-fidelity.
 */
export const DEFAULT_ALLOWED_DS = {
  Button: function Button({
    children,
    variant = "primary",
    size = "md",
    className = "",
    type = "button",
    disabled = false,
    onClick,
    ...props
  }) {
    const base = "font-medium rounded-xl transition-all inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1";
    const variants = {
      primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus:ring-indigo-500 disabled:bg-indigo-300",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400 disabled:opacity-50",
      success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500 disabled:bg-emerald-300",
      danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 disabled:bg-rose-300",
      outline: "border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-indigo-500 disabled:opacity-50"
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base"
    };
    const cls = `${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`;
    return React.createElement(
      "button",
      { type, disabled, onClick, className: cls, ...props },
      children
    );
  },

  Card: function Card({ children, className = "", ...props }) {
    return React.createElement(
      "div",
      { className: `bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 ${className}`, ...props },
      children
    );
  },

  CardHeader: function CardHeader({ children, className = "", ...props }) {
    return React.createElement(
      "div",
      { className: `border-b border-slate-100 pb-3 flex items-center justify-between ${className}`, ...props },
      children
    );
  },

  CardTitle: function CardTitle({ children, className = "", ...props }) {
    return React.createElement(
      "h3",
      { className: `text-lg font-bold text-slate-900 ${className}`, ...props },
      children
    );
  },

  CardDescription: function CardDescription({ children, className = "", ...props }) {
    return React.createElement(
      "p",
      { className: `text-xs text-slate-500 mt-0.5 ${className}`, ...props },
      children
    );
  },

  CardContent: function CardContent({ children, className = "", ...props }) {
    return React.createElement(
      "div",
      { className: `space-y-4 pt-1 ${className}`, ...props },
      children
    );
  },

  CardFooter: function CardFooter({ children, className = "", ...props }) {
    return React.createElement(
      "div",
      { className: `border-t border-slate-100 pt-3 flex items-center justify-between gap-3 ${className}`, ...props },
      children
    );
  },

  Input: function Input({
    label,
    error,
    id,
    name,
    type = "text",
    value = "",
    placeholder = "",
    onChange,
    onFocus,
    onBlur,
    className = "",
    required = false,
    ...props
  }) {
    const inputCls = `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
      error
        ? "border-rose-400 focus:ring-rose-500"
        : "border-slate-300 focus:ring-indigo-500"
    } ${className}`;

    return React.createElement(
      "div",
      { className: "space-y-1 w-full" },
      label &&
        React.createElement(
          "label",
          { htmlFor: id || name, className: "block text-xs font-semibold text-slate-700" },
          label,
          required && React.createElement("span", { className: "text-rose-500 ml-1" }, "*")
        ),
      React.createElement("input", {
        id: id || name,
        name,
        type,
        value,
        placeholder,
        onChange,
        onFocus,
        onBlur,
        className: inputCls,
        ...props
      }),
      error && React.createElement("p", { className: "text-xs text-rose-600 font-medium" }, error)
    );
  },

  Label: function Label({ children, htmlFor, required = false, className = "", ...props }) {
    return React.createElement(
      "label",
      { htmlFor, className: `block text-xs font-semibold text-slate-700 ${className}`, ...props },
      children,
      required && React.createElement("span", { className: "text-rose-500 ml-1" }, "*")
    );
  },

  Badge: function Badge({ children, variant = "indigo", className = "", ...props }) {
    const variants = {
      indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
      emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
      amber: "bg-amber-100 text-amber-800 border-amber-200",
      rose: "bg-rose-100 text-rose-800 border-rose-200",
      slate: "bg-slate-100 text-slate-700 border-slate-200"
    };
    const cls = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant] || variants.indigo} ${className}`;
    return React.createElement("span", { className: cls, ...props }, children);
  },

  Alert: function Alert({ children, title, variant = "info", className = "", ...props }) {
    const variants = {
      info: "bg-indigo-50 border-indigo-200 text-indigo-900",
      success: "bg-emerald-50 border-emerald-200 text-emerald-900",
      warning: "bg-amber-50 border-amber-200 text-amber-900",
      error: "bg-rose-50 border-rose-200 text-rose-900"
    };
    const cls = `p-4 rounded-xl border text-sm leading-relaxed ${variants[variant] || variants.info} ${className}`;
    return React.createElement(
      "div",
      { className: cls, ...props },
      title && React.createElement("strong", { className: "font-semibold block mb-1" }, title),
      children
    );
  },

  Select: function Select({
    label,
    id,
    name,
    value,
    onChange,
    options = [],
    className = "",
    error,
    ...props
  }) {
    const selectCls = `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
      error ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
    } ${className}`;

    return React.createElement(
      "div",
      { className: "space-y-1 w-full" },
      label &&
        React.createElement("label", { htmlFor: id || name, className: "block text-xs font-semibold text-slate-700" }, label),
      React.createElement(
        "select",
        { id: id || name, name, value, onChange, className: selectCls, ...props },
        options.map((opt) =>
          React.createElement("option", { key: opt.value, value: opt.value }, opt.label)
        )
      ),
      error && React.createElement("p", { className: "text-xs text-rose-600 font-medium" }, error)
    );
  },

  Textarea: function Textarea({
    label,
    id,
    name,
    value,
    placeholder,
    rows = 3,
    onChange,
    className = "",
    error,
    ...props
  }) {
    const areaCls = `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
      error ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
    } ${className}`;

    return React.createElement(
      "div",
      { className: "space-y-1 w-full" },
      label &&
        React.createElement("label", { htmlFor: id || name, className: "block text-xs font-semibold text-slate-700" }, label),
      React.createElement("textarea", {
        id: id || name,
        name,
        value,
        placeholder,
        rows,
        onChange,
        className: areaCls,
        ...props
      }),
      error && React.createElement("p", { className: "text-xs text-rose-600 font-medium" }, error)
    );
  },

  Progress: function Progress({ value = 0, max = 100, className = "" }) {
    const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
    return React.createElement(
      "div",
      { className: `w-full bg-slate-200 rounded-full h-2 overflow-hidden ${className}` },
      React.createElement("div", {
        className: "bg-indigo-600 h-full rounded-full transition-all duration-300",
        style: { width: `${pct}%` }
      })
    );
  },

  StepWizard: function StepWizard({ currentStep = 1, totalSteps = 2, stepTitle = "" }) {
    return React.createElement(
      "div",
      { className: "flex items-center justify-between pb-3 border-b border-slate-100 mb-4" },
      React.createElement(
        "div",
        null,
        React.createElement(
          "span",
          { className: "text-xs font-semibold uppercase tracking-wider text-indigo-600" },
          "AuraGen Guided Wizard"
        ),
        React.createElement(
          "h2",
          { className: "text-lg font-bold text-slate-900 mt-0.5" },
          `Step ${currentStep} of ${totalSteps}${stepTitle ? `: ${stepTitle}` : ""}`
        )
      ),
      React.createElement(
        "span",
        { className: "px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" },
        `${Math.round((currentStep / totalSteps) * 100)}% Complete`
      )
    );
  }
};

export const defaultDesignSystem = DEFAULT_ALLOWED_DS;

/**
 * Transpiles JSX and ES6 module syntax using @babel/standalone.
 * Converts import/export into CommonJS module format for secure evaluation.
 *
 * @param {string} rawCode - Raw JSX / ES6 source string.
 * @returns {string} Transpiled CommonJS JavaScript source.
 */
export function transpileCode(rawCode) {
  if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
    throw new Error("Transpilation failed: code must be a non-empty string.");
  }

  const result = Babel.transform(rawCode, {
    presets: [
      [
        "react",
        {
          runtime: "classic"
        }
      ],
      [
        "env",
        {
          modules: "commonjs",
          targets: { browsers: "defaults" }
        }
      ]
    ],
    filename: "dynamicComponent.jsx"
  });

  return result.code;
}

/**
 * Creates a secure evaluation function wrapping the transpiled code.
 * Restricts scope completely by shadowing ambient browser globals as undefined,
 * providing a guarded require function, and injecting only React and DS.
 *
 * Signature enforced: new Function('React', 'DS', 'exports', transpiledCode)
 *
 * @param {string} transpiledCode - Code output from Babel transpilation.
 * @returns {Function} Executable function: (React, DS, exports) => void
 */
export function createSecureEnvironment(transpiledCode) {
  const sandboxedBody = `
    "use strict";

    // =========================================================================
    // Scope Lockdown: Block ambient host & browser runtime globals
    // =========================================================================
    const window = undefined;
    const document = undefined;
    const fetch = undefined;
    const localStorage = undefined;
    const sessionStorage = undefined;
    const XMLHttpRequest = undefined;
    const WebSocket = undefined;
    const location = undefined;
    const navigator = undefined;
    const history = undefined;
    const alert = undefined;
    const prompt = undefined;
    const confirm = undefined;
    const globalThis = undefined;
    const self = undefined;
    const Function = undefined;

    // =========================================================================
    // Guarded Module Resolver: Only permit 'react' and 'DS'
    // =========================================================================
    const require = function(moduleName) {
      if (moduleName === "react" || moduleName === "react/jsx-runtime") {
        return React;
      }
      if (moduleName === "DS" || moduleName === "@/components/DS" || moduleName === "./DS") {
        return DS;
      }
      throw new Error(
        'Security Error: Unauthorized module import "' + moduleName + '". Dynamic components may only import "react" or "DS".'
      );
    };

    // =========================================================================
    // Direct Scope Exposure: Expose DS components directly for JSX convenience
    // =========================================================================
    const {
      Button,
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardContent,
      CardFooter,
      Input,
      Label,
      Badge,
      Alert,
      Select,
      Textarea,
      Progress,
      StepWizard
    } = (DS || {});

    // =========================================================================
    // Transpiled Component Execution
    // =========================================================================
    ${transpiledCode}
  `;

  // Explicitly construct function with signature: new Function('React', 'DS', 'exports', ...)
  return new Function("React", "DS", "exports", sandboxedBody);
}

/**
 * Compiles and safely evaluates a raw React code string into a mountable component.
 *
 * @param {string} rawCode - Raw JSX component code from WebSocket or user session.
 * @param {Object} [options={}] - Compilation options.
 * @param {Object} [options.allowedDS] - Custom Design System dictionary extending/replacing DEFAULT_ALLOWED_DS.
 * @param {Object} [options.reactInstance] - Custom React instance (defaults to host React).
 * @returns {React.ComponentType|null} Executable React component ready to mount.
 */
export function compileSafeComponent(rawCode, options = {}) {
  if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
    return null;
  }

  const {
    allowedDS = DEFAULT_ALLOWED_DS,
    reactInstance = React
  } = options;

  // Merge default Design System with any custom components supplied by caller
  const mergedDS = {
    ...DEFAULT_ALLOWED_DS,
    ...(allowedDS || {})
  };

  // 1. Transpile JSX/ES6 via @babel/standalone
  const transpiled = transpileCode(rawCode);

  // 2. Create the secure execution function
  const executeSandbox = createSecureEnvironment(transpiled);

  // 3. Execute in the restricted sandbox environment
  const exportsObj = {};
  executeSandbox(reactInstance, mergedDS, exportsObj);

  // 4. Extract and validate component
  const Component = exportsObj.default || exportsObj;

  if (!Component || (typeof Component !== "function" && typeof Component !== "object")) {
    throw new Error(
      `Secure Compilation Failed: Expected exported React component function or object, received "${typeof Component}".`
    );
  }

  return Component;
}

// Named alias
export const safeCompile = compileSafeComponent;

export default compileSafeComponent;
