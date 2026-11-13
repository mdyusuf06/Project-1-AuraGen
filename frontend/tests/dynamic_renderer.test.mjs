import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { compileComponent } from "../src/services/dynamicCompiler.js";
import { generateComponentStub } from "../../backend/src/services/codeGenStub.js";

console.log("===============================================================");
console.log("🧪 AuraGen DynamicUIRenderer Unit Test Suite");
console.log("===============================================================");

// -----------------------------------------------------------------------------
// Test 1: Basic JSX Component Compilation and Server-Side Rendering
// -----------------------------------------------------------------------------
{
  const rawCode = `
    import React from "react";
    export default function SimpleCard({ title = "Default Title" }) {
      return (
        <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg">
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
      );
    }
  `;

  const Component = compileComponent(rawCode);
  assert.equal(typeof Component, "function", "Compiled component must be a function");

  const html = renderToString(React.createElement(Component, { title: "Infotact AuraGen" }));
  assert.ok(html.includes("Infotact AuraGen"), "Rendered HTML must contain passed title");
  assert.ok(html.includes("bg-indigo-600"), "Rendered HTML must include Tailwind CSS classes");
  console.log("✅ Test 1 Passed: Basic JSX component compiled and rendered with Tailwind CSS.");
}

// -----------------------------------------------------------------------------
// Test 2: React Hooks and State Preservation
// -----------------------------------------------------------------------------
{
  const rawCode = `
    import React, { useState } from "react";
    export default function Wizard({ initialValues = {} }) {
      const [income, setIncome] = useState(initialValues.annualIncome || "0");
      return (
        <div className="p-4 border rounded">
          <span className="income-display">{income}</span>
        </div>
      );
    }
  `;

  const Component = compileComponent(rawCode);
  const html = renderToString(
    React.createElement(Component, { initialValues: { annualIncome: "150000" } })
  );
  assert.ok(html.includes("150000"), "Component must preserve and display initialValues");
  console.log("✅ Test 2 Passed: React hooks and initialValues state preserved.");
}

// -----------------------------------------------------------------------------
// Test 3: Backend Stub Code Compilation (AuraGen Week 1 Stub Payload)
// -----------------------------------------------------------------------------
{
  const stubCode = await generateComponentStub({
    activeField: "annualIncome",
    formFields: ["annualIncome", "creditScore", "employmentStatus"],
    userInput: { annualIncome: "95000", creditScore: "780" },
    score: 82
  });

  const Component = compileComponent(stubCode);
  assert.equal(typeof Component, "function", "Backend stub must compile into a React component");

  const html = renderToString(
    React.createElement(Component, {
      initialValues: { annualIncome: "95000" },
      onSubmit: () => {}
    })
  );

  assert.ok(html.includes("AuraGen Simplified Wizard"), "HTML must contain wizard title");
  assert.ok(html.includes("Score: 82"), "HTML must contain friction score");
  assert.ok(html.includes("annualIncome"), "HTML must contain active friction field");
  console.log("✅ Test 3 Passed: Real backend code-gen stub compiled and rendered flawlessly.");
}

// -----------------------------------------------------------------------------
// Test 4: Security Sandbox - Block Unauthorized Module Imports
// -----------------------------------------------------------------------------
{
  const maliciousImportCode = `
    import React from "react";
    import axios from "axios";
    export default function Malicious() {
      return <div>Test</div>;
    }
  `;

  assert.throws(
    () => {
      compileComponent(maliciousImportCode);
    },
    (err) => {
      return err.message.includes("Unauthorized module import");
    },
    "Should throw on unauthorized module import"
  );
  console.log("✅ Test 4 Passed: Unauthorized external module imports blocked.");
}

// -----------------------------------------------------------------------------
// Test 5: Security Sandbox - Shadowed Dangerous Globals
// -----------------------------------------------------------------------------
{
  const maliciousGlobalCode = `
    import React from "react";
    export default function Malicious() {
      // Attempt to access shadowed globals at render time
      if (typeof window !== "undefined") throw new Error("Window leaked");
      if (typeof localStorage !== "undefined") throw new Error("LocalStorage leaked");
      if (typeof fetch !== "undefined") throw new Error("Fetch leaked");
      return <div>Safe</div>;
    }
  `;

  const Component = compileComponent(maliciousGlobalCode);
  const html = renderToString(React.createElement(Component));
  assert.ok(html.includes("Safe"), "Component executed in sandbox without global leaks");
  console.log("✅ Test 5 Passed: Browser globals successfully shadowed in evaluation scope.");
}

// -----------------------------------------------------------------------------
// Test 6: Malformed / Syntax Error Handling
// -----------------------------------------------------------------------------
{
  const invalidSyntaxCode = `
    export default function Broken() {
      return <div className="test"
    }
  `;

  assert.throws(
    () => {
      compileComponent(invalidSyntaxCode);
    },
    /Unexpected token|SyntaxError/,
    "Should throw on invalid JSX syntax"
  );
  console.log("✅ Test 6 Passed: Syntax errors caught gracefully during compilation.");
}

// -----------------------------------------------------------------------------
// Test 7: Empty / Null Code Safety
// -----------------------------------------------------------------------------
{
  assert.equal(compileComponent(""), null, "Empty string should return null");
  assert.equal(compileComponent(null), null, "Null should return null");
  assert.equal(compileComponent("   "), null, "Whitespace should return null");
  console.log("✅ Test 7 Passed: Empty and null inputs handled safely.");
}

console.log("===============================================================");
console.log("🎉 All 7 DynamicUIRenderer Unit Tests Passed Successfully!");
console.log("===============================================================");
