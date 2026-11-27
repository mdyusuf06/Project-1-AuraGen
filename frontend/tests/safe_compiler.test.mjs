import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  compileSafeComponent,
  transpileCode,
  createSecureEnvironment,
  DEFAULT_ALLOWED_DS
} from "../src/utils/safeCompiler.js";

console.log("===============================================================");
console.log("🛡️  AuraGen Safe Compiler & Sandbox Security Test Suite");
console.log("===============================================================");

// -----------------------------------------------------------------------------
// Test 1: Transpilation of JSX/ES6 via @babel/standalone
// -----------------------------------------------------------------------------
{
  const rawCode = `
    import React from "react";
    export default function TestComp() {
      return <div className="test">Hello AuraGen</div>;
    }
  `;

  const transpiled = transpileCode(rawCode);
  assert.equal(typeof transpiled, "string", "Transpilation must return a string");
  assert.ok(transpiled.includes("createElement"), "JSX must be converted to createElement calls");
  assert.ok(transpiled.includes("exports"), "ES6 export must be converted to CommonJS exports");
  console.log("✅ Test 1 Passed: JSX/ES6 correctly transpiled to CommonJS via @babel/standalone");
}

// -----------------------------------------------------------------------------
// Test 2: Secure Evaluation via new Function('React', 'DS', 'exports', ...)
// -----------------------------------------------------------------------------
{
  const rawCode = `
    import React, { useState } from "react";
    import { Button, Card, Badge } from "DS";

    export default function DynamicWizard({ initialTitle = "Wizard Title" }) {
      const [title, setTitle] = useState(initialTitle);
      return (
        <Card className="max-w-md mx-auto">
          <Badge variant="indigo">{title}</Badge>
          <Button onClick={() => setTitle("Updated")}>Next</Button>
        </Card>
      );
    }
  `;

  const Component = compileSafeComponent(rawCode);
  assert.equal(typeof Component, "function", "Compiled output must be a React component function");

  const html = renderToString(React.createElement(Component, { initialTitle: "Security Check" }));
  assert.ok(html.includes("Security Check"), "Rendered HTML must contain initialTitle prop");
  assert.ok(html.includes("bg-emerald-600"), "Rendered HTML must contain DS Button styles");
  assert.ok(html.includes("bg-indigo-100"), "Rendered HTML must contain DS Badge styles");
  console.log("✅ Test 2 Passed: Component securely evaluated and rendered with Design System components");
}

// -----------------------------------------------------------------------------
// Test 3: Scope Restriction - window is blocked
// -----------------------------------------------------------------------------
{
  const maliciousWindowCode = `
    import React from "react";
    export default function Malicious() {
      if (typeof window !== "undefined") {
        throw new Error("SECURITY_BREACH: window is accessible!");
      }
      return <div>Window Blocked</div>;
    }
  `;

  const Component = compileSafeComponent(maliciousWindowCode);
  const html = renderToString(React.createElement(Component));
  assert.ok(html.includes("Window Blocked"), "window must be strictly undefined");
  console.log("✅ Test 3 Passed: Access to 'window' is completely blocked");
}

// -----------------------------------------------------------------------------
// Test 4: Scope Restriction - document is blocked
// -----------------------------------------------------------------------------
{
  const maliciousDocCode = `
    import React from "react";
    export default function Malicious() {
      if (typeof document !== "undefined") {
        throw new Error("SECURITY_BREACH: document is accessible!");
      }
      return <div>Document Blocked</div>;
    }
  `;

  const Component = compileSafeComponent(maliciousDocCode);
  const html = renderToString(React.createElement(Component));
  assert.ok(html.includes("Document Blocked"), "document must be strictly undefined");
  console.log("✅ Test 4 Passed: Access to 'document' is completely blocked");
}

// -----------------------------------------------------------------------------
// Test 5: Scope Restriction - fetch is blocked
// -----------------------------------------------------------------------------
{
  const maliciousFetchCode = `
    import React from "react";
    export default function Malicious() {
      if (typeof fetch !== "undefined") {
        throw new Error("SECURITY_BREACH: fetch is accessible!");
      }
      return <div>Fetch Blocked</div>;
    }
  `;

  const Component = compileSafeComponent(maliciousFetchCode);
  const html = renderToString(React.createElement(Component));
  assert.ok(html.includes("Fetch Blocked"), "fetch must be strictly undefined");
  console.log("✅ Test 5 Passed: Access to 'fetch' is completely blocked");
}

// -----------------------------------------------------------------------------
// Test 6: Scope Restriction - localStorage is blocked
// -----------------------------------------------------------------------------
{
  const maliciousStorageCode = `
    import React from "react";
    export default function Malicious() {
      if (typeof localStorage !== "undefined") {
        throw new Error("SECURITY_BREACH: localStorage is accessible!");
      }
      return <div>LocalStorage Blocked</div>;
    }
  `;

  const Component = compileSafeComponent(maliciousStorageCode);
  const html = renderToString(React.createElement(Component));
  assert.ok(html.includes("LocalStorage Blocked"), "localStorage must be strictly undefined");
  console.log("✅ Test 6 Passed: Access to 'localStorage' is completely blocked");
}

// -----------------------------------------------------------------------------
// Test 7: Guarded Module Resolver - Unauthorized imports blocked
// -----------------------------------------------------------------------------
{
  const unauthorizedImportCode = `
    import React from "react";
    import axios from "axios";
    export default function BadComp() {
      return <div>Unauthorized</div>;
    }
  `;

  assert.throws(
    () => {
      compileSafeComponent(unauthorizedImportCode);
    },
    (err) => {
      return err.message.includes("Unauthorized module import");
    },
    "Should throw on unauthorized module import"
  );
  console.log("✅ Test 7 Passed: Unauthorized external module imports blocked");
}

// -----------------------------------------------------------------------------
// Test 8: Custom Design System (DS) Injection
// -----------------------------------------------------------------------------
{
  const customDSCode = `
    import React from "react";
    import { CustomHero } from "DS";

    export default function WithCustomHero() {
      return <CustomHero title="Custom Hero Banner" />;
    }
  `;

  const customDS = {
    CustomHero: function CustomHero({ title }) {
      return React.createElement("header", { className: "hero-banner" }, title);
    }
  };

  const Component = compileSafeComponent(customDSCode, { allowedDS: customDS });
  const html = renderToString(React.createElement(Component));
  assert.ok(html.includes("Custom Hero Banner"), "Custom DS component rendered");
  console.log("✅ Test 8 Passed: Custom Design System components cleanly injected and rendered");
}

// -----------------------------------------------------------------------------
// Test 9: Syntax Error Handling
// -----------------------------------------------------------------------------
{
  const brokenCode = `
    export default function Broken() {
      return <div className="bad"
    }
  `;

  assert.throws(
    () => {
      compileSafeComponent(brokenCode);
    },
    /Unexpected token|SyntaxError/,
    "Malformed JSX must throw syntax error"
  );
  console.log("✅ Test 9 Passed: Syntax errors caught gracefully during Babel transpilation");
}

// -----------------------------------------------------------------------------
// Test 10: Null & Empty Input Safety
// -----------------------------------------------------------------------------
{
  assert.equal(compileSafeComponent(""), null, "Empty string should return null");
  assert.equal(compileSafeComponent(null), null, "Null input should return null");
  assert.equal(compileSafeComponent("   "), null, "Whitespace input should return null");
  console.log("✅ Test 10 Passed: Null and empty inputs handled safely");
}

console.log("\n===============================================================");
console.log("🎉 All 10 Safe Compiler Security Tests Passed Successfully!");
console.log("===============================================================");
