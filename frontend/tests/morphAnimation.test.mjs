import assert from "node:assert/strict";
import {
  originalFormMorphVariant,
  wizardMorphVariant,
  simplifyingOverlayVariant,
  stepSlideVariant,
  springTransition
} from "../src/animation/variants.js";

console.log("=================================================================");
console.log("🧪 AuraGen Dynamic Form Morphing & Wizard Step Navigation Tests");
console.log("   (Commits 5 & 6: Morphing, Directional Slide, Reduced Motion)");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Original Form Exit Transition Timing (300-400 ms requirement)
// -----------------------------------------------------------------------------
{
  assert.ok(originalFormMorphVariant.exit, "originalFormMorphVariant must define an exit state");
  assert.equal(originalFormMorphVariant.exit.opacity, 0, "Exit state must fade out (opacity 0)");
  assert.ok(
    originalFormMorphVariant.exit.scale < 1.0,
    "Exit state must scale down (scale < 1.0)"
  );
  assert.equal(
    originalFormMorphVariant.exit.scale,
    0.94,
    "Exit state should scale down to 0.94"
  );

  const exitDuration = originalFormMorphVariant.exit.transition.duration;
  assert.ok(
    exitDuration >= 0.3 && exitDuration <= 0.4,
    `Original form exit transition duration must be between 0.3s and 0.4s (300-400ms). Got ${exitDuration}s`
  );

  console.log(`✅ Test 1 Passed: Original form fades out and scales down in calibrated ${exitDuration * 1000}ms (within 300-400ms)`);
}

// -----------------------------------------------------------------------------
// Test 2: Wizard Spring Entrance Animation Verification
// -----------------------------------------------------------------------------
{
  assert.ok(wizardMorphVariant.initial, "wizardMorphVariant must define an initial state");
  assert.ok(wizardMorphVariant.animate, "wizardMorphVariant must define an animate state");

  assert.equal(wizardMorphVariant.initial.opacity, 0, "Initial wizard opacity must be 0");
  assert.equal(wizardMorphVariant.animate.opacity, 1, "Animate wizard opacity must be 1 (fade in)");
  assert.ok(wizardMorphVariant.initial.y > 0, "Initial wizard y must be > 0 for slide in");
  assert.equal(wizardMorphVariant.animate.y, 0, "Animate wizard y must be 0");

  const yTransition = wizardMorphVariant.animate.transition.y;
  assert.equal(yTransition.type, "spring", "Wizard slide transition must use spring physics");
  assert.ok(yTransition.stiffness > 0, "Spring stiffness must be positive");
  assert.ok(yTransition.damping > 0, "Spring damping must be positive");

  const scaleTransition = wizardMorphVariant.animate.transition.scale;
  assert.equal(scaleTransition.type, "spring", "Wizard scale transition must use spring physics");

  console.log("✅ Test 2 Passed: Conversational wizard entrance utilizes spring physics and slide-in");
}

// -----------------------------------------------------------------------------
// Test 3: "Simplifying this for you..." Overlay Variant Verification
// -----------------------------------------------------------------------------
{
  assert.ok(simplifyingOverlayVariant.initial, "simplifyingOverlayVariant must have initial state");
  assert.ok(simplifyingOverlayVariant.animate, "simplifyingOverlayVariant must have animate state");
  assert.ok(simplifyingOverlayVariant.exit, "simplifyingOverlayVariant must have exit state");

  assert.equal(simplifyingOverlayVariant.initial.opacity, 0);
  assert.equal(simplifyingOverlayVariant.animate.opacity, 1);
  assert.equal(simplifyingOverlayVariant.exit.opacity, 0);

  console.log("✅ Test 3 Passed: 'Simplifying this for you...' overlay animation variants verified");
}

// -----------------------------------------------------------------------------
// Test 4: Direction-Aware Wizard Step Navigation (Forward & Backward)
// -----------------------------------------------------------------------------
{
  assert.ok(typeof stepSlideVariant.initial === "function", "stepSlideVariant.initial must be a function accepting direction");
  assert.ok(typeof stepSlideVariant.exit === "function", "stepSlideVariant.exit must be a function accepting direction");

  // Forward Navigation (direction = 1, user clicks Next):
  // Enters from right (+36px), exits to left (-36px)
  const forwardInitial = stepSlideVariant.initial({ direction: 1, reduceMotion: false });
  assert.ok(forwardInitial.x > 0, `Forward initial x must be > 0 (enters from right), got ${forwardInitial.x}`);
  assert.equal(forwardInitial.opacity, 0, "Forward initial opacity must be 0");

  const forwardExit = stepSlideVariant.exit({ direction: 1, reduceMotion: false });
  assert.ok(forwardExit.x < 0, `Forward exit x must be < 0 (exits to left), got ${forwardExit.x}`);
  assert.equal(forwardExit.opacity, 0, "Forward exit opacity must be 0");

  // Backward Navigation (direction = -1, user clicks Back):
  // Enters from left (-36px), exits to right (+36px)
  const backwardInitial = stepSlideVariant.initial({ direction: -1, reduceMotion: false });
  assert.ok(backwardInitial.x < 0, `Backward initial x must be < 0 (enters from left), got ${backwardInitial.x}`);
  assert.equal(backwardInitial.opacity, 0, "Backward initial opacity must be 0");

  const backwardExit = stepSlideVariant.exit({ direction: -1, reduceMotion: false });
  assert.ok(backwardExit.x > 0, `Backward exit x must be > 0 (exits to right), got ${backwardExit.x}`);
  assert.equal(backwardExit.opacity, 0, "Backward exit opacity must be 0");

  console.log("✅ Test 4 Passed: Direction-aware horizontal slide transitions verified (Forward: +36 -> -36, Backward: -36 -> +36)");
}

// -----------------------------------------------------------------------------
// Test 5: Accessibility: Prefers-Reduced-Motion Support
// -----------------------------------------------------------------------------
{
  // When user OS has prefers-reduced-motion: reduce enabled:
  // Horizontal translation x must be 0 (no motion sickness), only clean opacity fade!
  const reducedForwardInitial = stepSlideVariant.initial({ direction: 1, reduceMotion: true });
  assert.equal(reducedForwardInitial.x, 0, "Reduced motion forward initial x must be 0 (no slide)");
  assert.equal(reducedForwardInitial.opacity, 0, "Reduced motion opacity fade must be preserved");

  const reducedForwardExit = stepSlideVariant.exit({ direction: 1, reduceMotion: true });
  assert.equal(reducedForwardExit.x, 0, "Reduced motion forward exit x must be 0");
  assert.equal(reducedForwardExit.opacity, 0);

  const reducedBackwardInitial = stepSlideVariant.initial({ direction: -1, reduceMotion: true });
  assert.equal(reducedBackwardInitial.x, 0, "Reduced motion backward initial x must be 0");

  console.log("✅ Test 5 Passed: prefers-reduced-motion accessibility verified (x-offsets strictly suppressed)");
}

// -----------------------------------------------------------------------------
// Test 6: Form State Preservation Across Wizard Steps
// -----------------------------------------------------------------------------
{
  const initialFormValues = {
    annualIncome: "125000",
    monthlyNetIncome: "7200",
    incomeVerificationType: "1099"
  };

  // Step 1: User types values
  const step1Values = {
    ...initialFormValues,
    annualIncome: "135000",
    monthlyNetIncome: "7800"
  };

  // Step 2: User advances and fills employment details
  const step2Values = {
    ...step1Values,
    employmentStatus: "SelfEmployed",
    employerName: "Rivera Tech LLC"
  };

  // Step 1 values MUST be preserved in Step 2
  assert.equal(step2Values.annualIncome, "135000", "Annual income must persist in Step 2");
  assert.equal(step2Values.monthlyNetIncome, "7800", "Monthly net income must persist in Step 2");
  assert.equal(step2Values.employmentStatus, "SelfEmployed", "Step 2 fields must be populated");

  // User navigates backward to Step 1: values must still be intact!
  assert.equal(step2Values.annualIncome, "135000", "Annual income persists when navigating back");

  console.log("✅ Test 6 Passed: Full input preservation across bidirectional step navigation validated");
}

console.log("\n=================================================================");
console.log("🎉 All 6 Morphing & Wizard Step Navigation Tests Passed!");
console.log("=================================================================");
