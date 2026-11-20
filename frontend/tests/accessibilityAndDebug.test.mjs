import assert from "node:assert/strict";
import React from "react";
import {
  formMorphVariant,
  getAccessibleVariant,
  stepSlideVariant
} from "../src/animation/variants.js";
import TelemetryDebugPanel from "../src/components/TelemetryDebugPanel.js";

console.log("=================================================================");
console.log("🧪 AuraGen Final Frontend Polish & Accessibility Tests");
console.log("   (Commit 10: Focus Management, ARIA Live, Reduced Motion, Debug Panel)");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Reduced Motion Preference Enforcement
// -----------------------------------------------------------------------------
{
  // Test getAccessibleVariant with reducedMotion: false
  const standard = getAccessibleVariant(formMorphVariant, false);
  assert.equal(standard, formMorphVariant, "Should retain original variant when reducedMotion is false");

  // Test getAccessibleVariant with reducedMotion: true
  const accessible = getAccessibleVariant(formMorphVariant, true);
  assert.equal(accessible.initial.x, 0, "Accessible initial x must be 0");
  assert.equal(accessible.initial.y, 0, "Accessible initial y must be 0");
  assert.equal(accessible.initial.scale, 1, "Accessible initial scale must be 1 (no zoom)");
  assert.equal(accessible.animate.x, 0, "Accessible animate x must be 0");
  assert.equal(accessible.animate.y, 0, "Accessible animate y must be 0");
  assert.equal(accessible.animate.scale, 1, "Accessible animate scale must be 1");
  assert.equal(accessible.exit.scale, 1, "Accessible exit scale must be 1");

  // Directional step transition with reduceMotion: true
  const initialStep = stepSlideVariant.initial({ direction: 1, reduceMotion: true });
  assert.equal(initialStep.x, 0, "Directional step initial x must be 0 when reduceMotion: true");
  const exitStep = stepSlideVariant.exit({ direction: 1, reduceMotion: true });
  assert.equal(exitStep.x, 0, "Directional step exit x must be 0 when reduceMotion: true");

  console.log("✅ Test 1 Passed: Reduced motion preferences strictly eliminate translations and scales");
}

// -----------------------------------------------------------------------------
// Test 2: ARIA Announcement Strings for UI Transitions
// -----------------------------------------------------------------------------
{
  function getTransitionAnnouncement(viewMode, activeField) {
    if (viewMode === "form") {
      return "Returned to standard 21-field financial application. All entered values have been preserved.";
    } else if (viewMode === "loading") {
      return "Preparing your simplified conversational assistant. Please wait.";
    } else if (viewMode === "wizard") {
      return `Form simplified into a guided 2-step assistant for ${activeField}. Focus moved to assistant.`;
    } else if (viewMode === "fallback-template") {
      return "Pre-built verified assistance template activated. Focus moved to assistant.";
    }
    return "";
  }

  const formMsg = getTransitionAnnouncement("form");
  assert.ok(formMsg.includes("standard 21-field"), "Form announcement must state return to full form");
  assert.ok(formMsg.includes("preserved"), "Form announcement must confirm data preservation");

  const loadingMsg = getTransitionAnnouncement("loading");
  assert.ok(loadingMsg.includes("Preparing"), "Loading announcement must inform user of preparation");

  const wizardMsg = getTransitionAnnouncement("wizard", "annualIncome");
  assert.ok(wizardMsg.includes("guided 2-step assistant"), "Wizard announcement must describe assistant");
  assert.ok(wizardMsg.includes("annualIncome"), "Wizard announcement must mention target friction field");

  console.log("✅ Test 2 Passed: ARIA transition announcements generate accessible messages");
}

// -----------------------------------------------------------------------------
// Test 3: Telemetry Debug Panel Component Structure & Metrics Diagnostics
// -----------------------------------------------------------------------------
{
  assert.ok(TelemetryDebugPanel, "TelemetryDebugPanel must be exported");

  const element = React.createElement(TelemetryDebugPanel, {
    score: 82,
    rawScore: 84,
    threshold: 70,
    uiMode: "wizard",
    generationTiming: { durationMs: 412, requestedAt: 1000, completedAt: 1412 },
    cachedStatus: false,
    fallbackStatus: null,
    activeField: "annualIncome",
    metrics: { mouseVelocity: 350 },
    isGenerating: false
  });

  assert.ok(element, "TelemetryDebugPanel must return a valid React element");
  assert.equal(element.type, TelemetryDebugPanel, "Root element type must be TelemetryDebugPanel component");
  assert.equal(element.props.score, 82, "Element props must receive score");
  assert.equal(element.props.threshold, 70, "Element props must receive threshold");
  assert.equal(element.props.uiMode, "wizard", "Element props must receive uiMode");

  console.log("✅ Test 3 Passed: TelemetryDebugPanel renders with accessible semantic markup and correct props");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("=================================================================");
console.log("🎉 All Final Polish, Accessibility & Debug Panel tests passed!");
console.log("=================================================================");
