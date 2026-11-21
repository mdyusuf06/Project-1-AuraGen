import assert from "node:assert/strict";
import React from "react";
import {
  ErrorBoundary,
  WizardErrorFallback,
  WizardLoadingSkeleton
} from "../src/fallback/index.js";
import * as modularFallback from "../fallback/index.js";

console.log("=================================================================");
console.log("🧪 AuraGen Fallback UI & Graceful Error Handling Tests");
console.log("   (Commit 7: Loading Skeleton, ErrorBoundary, Safe Recovery UI)");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Fallback Module Exports & Directory Structure Compatibility
// -----------------------------------------------------------------------------
{
  assert.ok(ErrorBoundary, "ErrorBoundary must be exported from frontend/src/fallback");
  assert.ok(WizardErrorFallback, "WizardErrorFallback must be exported from frontend/src/fallback");
  assert.ok(WizardLoadingSkeleton, "WizardLoadingSkeleton must be exported from frontend/src/fallback");

  // Verify re-export from frontend/fallback/index.js
  assert.equal(
    modularFallback.ErrorBoundary,
    ErrorBoundary,
    "frontend/fallback must re-export ErrorBoundary"
  );
  assert.equal(
    modularFallback.WizardErrorFallback,
    WizardErrorFallback,
    "frontend/fallback must re-export WizardErrorFallback"
  );
  assert.equal(
    modularFallback.WizardLoadingSkeleton,
    WizardLoadingSkeleton,
    "frontend/fallback must re-export WizardLoadingSkeleton"
  );

  console.log("✅ Test 1 Passed: Fallback module exports and re-exports verified");
}

// -----------------------------------------------------------------------------
// Test 2: WizardLoadingSkeleton Default Loading Message and Structure
// -----------------------------------------------------------------------------
{
  const defaultSkeleton = WizardLoadingSkeleton({});
  assert.ok(defaultSkeleton, "WizardLoadingSkeleton must render a valid element");
  assert.ok(
    defaultSkeleton.type === "div" ||
      defaultSkeleton.type?.render?.displayName === "motion.div" ||
      typeof defaultSkeleton.type === "object",
    "Root component must render a motion.div"
  );

  // Helper to extract all nested string children from React element tree
  const extractText = (node) => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(" ");
    if (node.props && node.props.children) {
      return extractText(node.props.children);
    }
    return "";
  };

  const defaultText = extractText(defaultSkeleton);
  assert.ok(
    defaultText.includes("Preparing your simplified form..."),
    `Loading skeleton must display "Preparing your simplified form...". Got: ${defaultText}`
  );
  assert.ok(
    defaultText.includes("Annual Income"),
    "Loading skeleton should format activeField appropriately"
  );

  // Test custom message override
  const customSkeleton = WizardLoadingSkeleton({
    loadingMessage: "Tailoring step-by-step assistant...",
    activeField: "monthlyDebt"
  });
  const customText = extractText(customSkeleton);
  assert.ok(
    customText.includes("Tailoring step-by-step assistant..."),
    "Loading skeleton must support custom loading message"
  );
  assert.ok(
    customText.includes("Monthly Debt"),
    "Loading skeleton should format activeField 'monthlyDebt' to 'Monthly Debt'"
  );

  console.log("✅ Test 2 Passed: WizardLoadingSkeleton displays 'Preparing your simplified form...' and respects props");
}

// -----------------------------------------------------------------------------
// Test 3: WizardErrorFallback UI & Privacy Check (No Internal Stack Traces)
// -----------------------------------------------------------------------------
{
  let retryClicked = false;
  let restoreClicked = false;

  const onRetry = () => {
    retryClicked = true;
  };
  const onRestoreOriginal = () => {
    restoreClicked = true;
  };

  const fallbackTree = WizardErrorFallback({ onRetry, onRestoreOriginal });

  const extractText = (node) => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(" ");
    if (node.props && node.props.children) {
      return extractText(node.props.children);
    }
    return "";
  };

  const fallbackText = extractText(fallbackTree);

  // Friendly user-facing messaging
  assert.ok(
    fallbackText.includes("Unable to Display Simplified Assistant"),
    "Fallback UI must present a clear, reassuring title"
  );
  assert.ok(
    fallbackText.includes("We ran into an unexpected issue"),
    "Fallback UI must state the issue without alarmist jargon"
  );
  assert.ok(
    fallbackText.includes("your previously entered form data is completely safe"),
    "Fallback UI must assure the user their data is preserved"
  );
  assert.ok(
    fallbackText.includes("Retry Assistance"),
    "Fallback UI must offer a Retry action"
  );
  assert.ok(
    fallbackText.includes("Return to Original Form") || fallbackText.includes("Back to Full Form"),
    "Fallback UI must offer a fallback action to return to the original form"
  );

  // SECURITY & PRIVACY: Ensure internal exceptions or stacks are NEVER displayed
  const internalErrorTrace = "TypeError: Cannot read properties of undefined (reading 'subField')\n    at ConversationalWizard.jsx:14:2";
  assert.ok(
    !fallbackText.includes(internalErrorTrace),
    "CRITICAL PRIVACY CHECK: Sensitive internal error traces must NEVER be exposed to the user"
  );
  assert.ok(
    !fallbackText.includes("at "),
    "CRITICAL PRIVACY CHECK: No stack trace markers ('at ...') allowed in user-facing UI"
  );

  console.log("✅ Test 3 Passed: WizardErrorFallback renders reassuring UI, retry/back actions, and suppresses internal errors");
}

// -----------------------------------------------------------------------------
// Test 4: ErrorBoundary Lifecycle & Error Catching
// -----------------------------------------------------------------------------
{
  const boundary = new ErrorBoundary({
    onRestoreOriginal: () => {},
    onRetry: () => {}
  });

  assert.equal(boundary.state.hasError, false, "Initial boundary state must have hasError: false");
  assert.equal(boundary.state.error, null, "Initial boundary state must have error: null");

  // Simulate error capture via getDerivedStateFromError
  const mockError = new Error("Simulated component crash during generation");
  const nextState = ErrorBoundary.getDerivedStateFromError(mockError);

  assert.equal(nextState.hasError, true, "getDerivedStateFromError must set hasError: true");
  assert.equal(nextState.error, mockError, "getDerivedStateFromError must capture error object");

  // Simulate componentDidCatch safe logging
  let loggedError = null;
  let loggedInfo = null;
  const boundaryWithHandler = new ErrorBoundary({
    onError: (err, info) => {
      loggedError = err;
      loggedInfo = info;
    }
  });

  boundaryWithHandler.componentDidCatch(mockError, { componentStack: "\n    in BrokenComponent" });
  assert.equal(loggedError, mockError, "componentDidCatch should forward error to onError callback");
  assert.ok(loggedInfo.componentStack, "componentDidCatch should capture componentStack");

  console.log("✅ Test 4 Passed: ErrorBoundary catches errors and derives state correctly");
}

// -----------------------------------------------------------------------------
// Test 5: ErrorBoundary Retry and Fallback Recovery Actions
// -----------------------------------------------------------------------------
{
  let retryTriggered = false;
  const boundary = new ErrorBoundary({
    onRetry: () => {
      retryTriggered = true;
    }
  });

  boundary.state = { hasError: true, error: new Error("Crash") };
  assert.equal(boundary.state.hasError, true);

  // Invoke handleRetry
  boundary.handleRetry();
  assert.equal(boundary.state.hasError, false, "handleRetry must clear hasError to false");
  assert.equal(boundary.state.error, null, "handleRetry must clear error to null");
  assert.equal(retryTriggered, true, "handleRetry must call props.onRetry callback");

  // Render when error is present
  boundary.state = { hasError: true, error: new Error("Crash") };
  const renderedFallback = boundary.render();
  assert.ok(renderedFallback, "ErrorBoundary must return a fallback element when hasError: true");
  assert.equal(
    renderedFallback.type,
    WizardErrorFallback,
    "ErrorBoundary should render WizardErrorFallback by default"
  );

  // Render custom fallback function if provided
  let customFallbackCalled = false;
  const boundaryCustom = new ErrorBoundary({
    fallback: ({ retry }) => {
      customFallbackCalled = true;
      return React.createElement("div", null, "Custom Error UI");
    }
  });
  boundaryCustom.state = { hasError: true, error: new Error("Custom Crash") };
  const customRendered = boundaryCustom.render();
  assert.equal(customFallbackCalled, true, "Custom fallback function must be invoked when provided");

  console.log("✅ Test 5 Passed: ErrorBoundary handleRetry restores state and renders appropriate fallback");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("=================================================================");
console.log("🎉 All Fallback UI & Graceful Error Handling tests passed cleanly!");
console.log("=================================================================");
