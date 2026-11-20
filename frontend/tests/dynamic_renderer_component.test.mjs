import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import * as Babel from "@babel/standalone";

console.log("===============================================================");
console.log("🧪 DynamicRenderer.jsx Client Component Unit Test Suite");
console.log("===============================================================");

// 1. Transpile DynamicRenderer.jsx to CommonJS so Node ESM can load it seamlessly
const filePath = new URL("../src/components/DynamicRenderer.jsx", import.meta.url);
const source = fs.readFileSync(filePath, "utf-8");

const transpiled = (Babel.default || Babel).transform(source, {
  presets: [
    ["react", { runtime: "classic" }],
    ["env", { modules: "commonjs" }]
  ],
  filename: "DynamicRenderer.jsx"
}).code;

const exportsObj = {};
const moduleObj = { exports: exportsObj };
const requireMock = (mod) => {
  if (mod === "react") return React;
  if (mod === "prop-types") {
    // import prop-types dynamically
    return {
      string: Object.assign(() => {}, { isRequired: () => {} }),
      object: Object.assign(() => {}, { isRequired: () => {} }),
      func: Object.assign(() => {}, { isRequired: () => {} }),
      node: Object.assign(() => {}, { isRequired: () => {} }),
      element: Object.assign(() => {}, { isRequired: () => {} }),
      oneOfType: () => Object.assign(() => {}, { isRequired: () => {} })
    };
  }
  if (mod === "../utils/safeCompiler.js") {
    return fs.existsSync("./frontend/src/utils/safeCompiler.js")
      ? awaitImportSafeCompiler()
      : {};
  }
  throw new Error(`Module ${mod} not found in test sandbox`);
};

// Import safeCompiler synchronously for test module
import * as safeCompiler from "../src/utils/safeCompiler.js";
const customRequire = (mod) => {
  if (mod === "react") return React;
  if (mod.includes("safeCompiler")) return safeCompiler;
  if (mod === "prop-types") {
    return {
      string: Object.assign(() => {}, { isRequired: () => {} }),
      object: Object.assign(() => {}, { isRequired: () => {} }),
      func: Object.assign(() => {}, { isRequired: () => {} }),
      node: Object.assign(() => {}, { isRequired: () => {} }),
      element: Object.assign(() => {}, { isRequired: () => {} }),
      oneOfType: () => Object.assign(() => {}, { isRequired: () => {} })
    };
  }
  throw new Error(`Cannot require ${mod}`);
};

const fn = new Function("React", "require", "exports", "module", transpiled);
fn(React, customRequire, exportsObj, moduleObj);

const DynamicRenderer = moduleObj.exports.default || moduleObj.exports;
const { DynamicRendererErrorBoundary } = moduleObj.exports;

// -----------------------------------------------------------------------------
// Test 1: Component Export and PropTypes Definition
// -----------------------------------------------------------------------------
{
  assert.equal(typeof DynamicRenderer, "function", "DynamicRenderer must be a function component");
  assert.ok(DynamicRenderer.propTypes, "DynamicRenderer must define propTypes");
  assert.ok(DynamicRenderer.propTypes.code, "code propType must be defined");
  assert.ok(DynamicRenderer.propTypes.initialValues, "initialValues propType must be defined");
  assert.ok(DynamicRenderer.propTypes.onChange, "onChange propType must be defined");
  assert.ok(DynamicRenderer.propTypes.onSubmit, "onSubmit propType must be defined");
  assert.ok(DynamicRenderer.propTypes.fallback, "fallback propType must be defined");
  console.log("✅ Test 1 Passed: DynamicRenderer exports and strict propTypes verified.");
}

// -----------------------------------------------------------------------------
// Test 2: In-Browser Compilation and Rendering of Valid Code
// -----------------------------------------------------------------------------
{
  const validCode = `
    import React from "react";
    import { Button, Card } from "DS";

    export default function SampleCard({ initialValues = {}, onSubmit }) {
      return (
        <Card className="test-card">
          <span>{initialValues.name || "Default Name"}</span>
          <Button onClick={() => onSubmit({ status: "success" })}>Submit</Button>
        </Card>
      );
    }
  `;

  const html = renderToString(
    React.createElement(DynamicRenderer, {
      code: validCode,
      initialValues: { name: "Alice Wonderland" },
      onSubmit: () => {}
    })
  );

  assert.ok(html.includes("Alice Wonderland"), "HTML must contain injected initialValues");
  assert.ok(html.includes("test-card"), "HTML must contain Card component output");
  console.log("✅ Test 2 Passed: Valid React code string compiled and rendered successfully.");
}

// -----------------------------------------------------------------------------
// Test 3: Automatic Fallback on Compilation Failure (Syntax Error)
// -----------------------------------------------------------------------------
{
  const brokenCode = `
    export default function Broken() {
      return <div className="unterminated"
    }
  `;

  const fallbackElement = React.createElement("div", { className: "custom-fallback" }, "Custom Fallback Rendered");

  const html = renderToString(
    React.createElement(DynamicRenderer, {
      code: brokenCode,
      fallback: fallbackElement
    })
  );

  assert.ok(html.includes("Custom Fallback Rendered"), "Must automatically render fallback element on compilation error");
  console.log("✅ Test 3 Passed: Automatic fallback element rendered on compilation failure.");
}

// -----------------------------------------------------------------------------
// Test 4: Automatic Fallback on Security Violation (Blocked Global)
// -----------------------------------------------------------------------------
{
  const unauthorizedCode = `
    import axios from "axios";
    export default function Bad() {
      return <div>Bad</div>;
    }
  `;

  const fallbackFn = ({ error }) => {
    return React.createElement("div", { className: "error-fn" }, `Error: ${error.message}`);
  };

  const html = renderToString(
    React.createElement(DynamicRenderer, {
      code: unauthorizedCode,
      fallback: fallbackFn
    })
  );

  assert.ok(html.includes("Unauthorized module import"), "Fallback function must receive compilation error");
  console.log("✅ Test 4 Passed: Automatic fallback function rendered on security violation.");
}

// -----------------------------------------------------------------------------
// Test 5: Fallback on Empty or Null Code
// -----------------------------------------------------------------------------
{
  const emptyFallback = React.createElement("div", { className: "empty-state" }, "No Code Provided");

  const html1 = renderToString(
    React.createElement(DynamicRenderer, {
      code: "",
      fallback: emptyFallback
    })
  );
  assert.ok(html1.includes("No Code Provided"), "Must render fallback when code is empty");

  const html2 = renderToString(
    React.createElement(DynamicRenderer, {
      code: null,
      fallback: emptyFallback
    })
  );
  assert.ok(html2.includes("No Code Provided"), "Must render fallback when code is null");

  console.log("✅ Test 5 Passed: Fallback rendered for empty and null code inputs.");
}

// -----------------------------------------------------------------------------
// Test 6: ErrorBoundary Class Definition
// -----------------------------------------------------------------------------
{
  assert.equal(typeof DynamicRendererErrorBoundary, "function", "ErrorBoundary must be exported");
  assert.equal(typeof DynamicRendererErrorBoundary.getDerivedStateFromError, "function", "Must have getDerivedStateFromError");
  console.log("✅ Test 6 Passed: DynamicRendererErrorBoundary class verified.");
}

console.log("\n===============================================================");
console.log("🎉 All 6 DynamicRenderer Client Component Tests Passed!");
console.log("===============================================================");
