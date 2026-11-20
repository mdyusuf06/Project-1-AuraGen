import assert from "node:assert/strict";
import {
  springTransition,
  smoothTransition,
  fadeIn,
  fadeOut,
  scaleDown,
  slideIn,
  slideInUp,
  slideInDown,
  slideInLeft,
  slideInRight,
  formMorphVariant,
  overlayVariant,
  staggerContainer,
  staggerItem
} from "../src/animation/variants.js";
import * as animationModule from "../src/animation/index.js";
import * as legacyAnimationModule from "../animation/index.js";

console.log("=================================================================");
console.log("🧪 AuraGen Framer Motion Animation Module Test Suite (Commit 4)");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Spring Transition Specification
// -----------------------------------------------------------------------------
{
  assert.equal(springTransition.type, "spring", "Spring transition type must be 'spring'");
  assert.ok(typeof springTransition.stiffness === "number" && springTransition.stiffness > 0, "Spring stiffness must be positive number");
  assert.ok(typeof springTransition.damping === "number" && springTransition.damping > 0, "Spring damping must be positive number");
  assert.ok(typeof springTransition.mass === "number" && springTransition.mass > 0, "Spring mass must be positive number");
  console.log("✅ Test 1 Passed: Spring transition parameters verified");
}

// -----------------------------------------------------------------------------
// Test 2: Fade In / Fade Out Variants
// -----------------------------------------------------------------------------
{
  // Fade in
  assert.equal(fadeIn.initial.opacity, 0, "Fade in initial opacity must be 0");
  assert.equal(fadeIn.animate.opacity, 1, "Fade in animate opacity must be 1");
  assert.equal(fadeIn.exit.opacity, 0, "Fade in exit opacity must be 0");
  assert.ok(fadeIn.animate.transition.duration > 0, "Fade in must specify transition duration");

  // Fade out
  assert.equal(fadeOut.initial.opacity, 1, "Fade out initial opacity must be 1");
  assert.equal(fadeOut.animate.opacity, 0, "Fade out animate opacity must be 0");

  console.log("✅ Test 2 Passed: Fade In & Fade Out variants verified");
}

// -----------------------------------------------------------------------------
// Test 3: Scale Down Variant
// -----------------------------------------------------------------------------
{
  assert.equal(scaleDown.initial.scale, 1, "Scale down initial scale must be 1");
  assert.equal(scaleDown.animate.scale, 1, "Scale down animate scale must be 1");
  assert.ok(scaleDown.exit.scale < 1.0, "Scale down exit scale must be < 1.0 (shrinking)");
  assert.equal(scaleDown.exit.opacity, 0, "Scale down exit opacity must be 0");

  console.log("✅ Test 3 Passed: Scale Down variant verified (scale 1.0 -> 0.94)");
}

// -----------------------------------------------------------------------------
// Test 4: Directional Slide In Variants (Up, Down, Left, Right)
// -----------------------------------------------------------------------------
{
  // slideIn defaults to slideInUp
  assert.equal(slideInUp.initial.y, 24, "SlideInUp initial y must be > 0 (offset below)");
  assert.equal(slideInUp.animate.y, 0, "SlideInUp animate y must be 0");
  assert.equal(slideIn, slideInUp, "Default slideIn must map to slideInUp");

  // slideInDown
  assert.equal(slideInDown.initial.y, -24, "SlideInDown initial y must be < 0 (offset above)");
  assert.equal(slideInDown.animate.y, 0, "SlideInDown animate y must be 0");

  // slideInLeft
  assert.equal(slideInLeft.initial.x, -32, "SlideInLeft initial x must be < 0 (offset left)");
  assert.equal(slideInLeft.animate.x, 0, "SlideInLeft animate x must be 0");

  // slideInRight
  assert.equal(slideInRight.initial.x, 32, "SlideInRight initial x must be > 0 (offset right)");
  assert.equal(slideInRight.animate.x, 0, "SlideInRight animate x must be 0");

  console.log("✅ Test 4 Passed: Directional Slide In variants verified (Up, Down, Left, Right)");
}

// -----------------------------------------------------------------------------
// Test 5: Form Morph & Overlay Variants
// -----------------------------------------------------------------------------
{
  assert.ok(formMorphVariant.initial.scale < 1.0, "Form morph initial scale must be < 1.0");
  assert.equal(formMorphVariant.animate.scale, 1, "Form morph animate scale must be 1");
  assert.ok(formMorphVariant.exit.scale < 1.0, "Form morph exit scale must be < 1.0");

  assert.equal(overlayVariant.initial.opacity, 0, "Overlay initial opacity must be 0");
  assert.equal(overlayVariant.animate.opacity, 1, "Overlay animate opacity must be 1");
  assert.equal(overlayVariant.exit.opacity, 0, "Overlay exit opacity must be 0");

  console.log("✅ Test 5 Passed: Form Morph & Overlay variants verified");
}

// -----------------------------------------------------------------------------
// Test 6: AnimatePresence Wrapper & Re-export Integrity
// -----------------------------------------------------------------------------
{
  assert.ok(typeof animationModule.AnimatedTransition === "function", "AnimatedTransition component must be exported");
  assert.ok(typeof animationModule.FadeTransition === "function", "FadeTransition component must be exported");
  assert.ok(typeof animationModule.SlideTransition === "function", "SlideTransition component must be exported");
  assert.ok(typeof animationModule.ScaleTransition === "function", "ScaleTransition component must be exported");
  assert.ok(typeof animationModule.MorphTransition === "function", "MorphTransition component must be exported");
  assert.ok(animationModule.AnimatePresence !== undefined, "AnimatePresence must be exported");
  assert.ok(animationModule.motion !== undefined, "motion must be exported");

  // Verify legacy/aliased path under frontend/animation
  assert.equal(
    legacyAnimationModule.fadeIn,
    animationModule.fadeIn,
    "frontend/animation must match frontend/src/animation"
  );
  assert.equal(
    legacyAnimationModule.springTransition,
    animationModule.springTransition,
    "frontend/animation springTransition must match"
  );

  console.log("✅ Test 6 Passed: AnimatePresence wrapper and re-exports validated across all paths");
}

console.log("\n=================================================================");
console.log("🎉 All 6 Animation Module Unit Tests Passed Successfully!");
console.log("=================================================================");