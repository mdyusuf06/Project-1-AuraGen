import React from "react";
import { transform } from "sucrase";

/**
 * =============================================================================
 * compileComponent
 * =============================================================================
 * Compiles a raw React JSX / ES Module code string into an executable React component.
 * Uses Sucrase for near-instant (<5ms), lightweight browser-side transformation.
 * Enforces client-side defense-in-depth by shadowing ambient sensitive browser APIs.
 *
 * @param {string} rawCode - The raw React component source string.
 * @returns {React.ComponentType|null} Executable React component.
 */
export function compileComponent(rawCode) {
  if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
    return null;
  }

  // 1. Transpile JSX + ES Module syntax using Sucrase
  const transformed = transform(rawCode, {
    transforms: ["jsx", "imports"],
    jsxRuntime: "classic",
    production: true
  });

  // 2. Prepare isolated module container
  const exports = {};
  const module = { exports };

  // 3. Safe require mock: only allow React and React JSX runtime
  const requireMock = (moduleName) => {
    if (moduleName === "react" || moduleName === "react/jsx-runtime") {
      return React;
    }
    throw new Error(
      `Unauthorized module import "${moduleName}". Dynamic components may only import "react".`
    );
  };

  // 4. Scoped function evaluation with shadowed globals for defense-in-depth
  const evaluateSandbox = new Function(
    "React",
    "require",
    "exports",
    "module",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    transformed.code
  );

  evaluateSandbox(
    React,
    requireMock,
    exports,
    module,
    undefined, // window shadowed
    undefined, // document shadowed
    undefined, // localStorage shadowed
    undefined, // sessionStorage shadowed
    undefined, // fetch shadowed
    undefined, // XMLHttpRequest shadowed
    undefined  // WebSocket shadowed
  );

  const Component = module.exports.default || module.exports;

  if (typeof Component !== "function" && typeof Component !== "object") {
    throw new Error(
      `Dynamic code failed to export a valid React component. Expected default export, received "${typeof Component}".`
    );
  }

  return Component;
}

