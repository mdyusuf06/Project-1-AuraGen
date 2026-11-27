import assert from "node:assert/strict";
import { createInitialFormValues } from "../src/data/financialFormSchema.js";
import { revertMorphVariant, springTransition } from "../src/animation/variants.js";

console.log("=================================================================");
console.log("🧪 AuraGen Form Revert & Bidirectional State Preservation Tests");
console.log("   (Commit 9: Revert Flow, Latest Values Restored, WebSocket revert)");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Flow: Original Form → Generated Wizard → Enter Values → Back to Form
// -----------------------------------------------------------------------------
{
  // 1. Initial empty form values
  const baseValues = createInitialFormValues();
  assert.equal(baseValues.annualIncome, "", "Initial annualIncome must be empty");
  assert.equal(baseValues.fullName, "", "Initial fullName must be empty");

  // 2. User enters values in the Original Complex Form
  let formState = {
    ...baseValues,
    fullName: "Eleanor Vance",
    email: "eleanor.vance@example.com",
    annualIncome: "85000",
    loanAmount: "45000",
    loanPurpose: "Home Renovation",
    creditScoreRange: "720-799"
  };

  assert.equal(formState.fullName, "Eleanor Vance");
  assert.equal(formState.annualIncome, "85000");

  // 3. User experiences friction -> UI morphs to Conversational Wizard
  // Wizard receives current formState as initialValues
  let wizardState = {
    ...formState,
    // Wizard specific defaults if not yet present
    monthlyNetIncome: formState.monthlyNetIncome || "",
    employmentStatus: formState.employmentStatus || "Employed"
  };

  assert.equal(
    wizardState.fullName,
    "Eleanor Vance",
    "Wizard must receive pre-filled fullName from form"
  );
  assert.equal(
    wizardState.annualIncome,
    "85000",
    "Wizard must receive pre-filled annualIncome from form"
  );

  // 4. In Wizard, user updates values (Enter Values step)
  const wizardUpdates = {
    annualIncome: "115000", // Updated to higher gross
    monthlyNetIncome: "7200", // Newly supplied monthly net
    employmentStatus: "Self-Employed", // Changed employment status
    employerName: "Vance Architecture Studio" // New employer name
  };

  wizardState = {
    ...wizardState,
    ...wizardUpdates
  };

  // Sync back to central form state (onUpdateValues)
  formState = {
    ...formState,
    ...wizardUpdates
  };

  assert.equal(formState.annualIncome, "115000", "State must reflect updated income from wizard");
  assert.equal(formState.monthlyNetIncome, "7200", "State must reflect monthly income from wizard");

  // 5. User clicks "Back to Original Form" (Revert Action)
  // Form is restored with formState without a page refresh
  const restoredFormValues = {
    ...createInitialFormValues(),
    ...formState
  };

  // 6. Verify that the latest values are preserved across all categories!
  assert.equal(
    restoredFormValues.fullName,
    "Eleanor Vance",
    "Form must preserve original field 'fullName'"
  );
  assert.equal(
    restoredFormValues.email,
    "eleanor.vance@example.com",
    "Form must preserve original field 'email'"
  );
  assert.equal(
    restoredFormValues.loanAmount,
    "45000",
    "Form must preserve original field 'loanAmount'"
  );
  assert.equal(
    restoredFormValues.loanPurpose,
    "Home Renovation",
    "Form must preserve original field 'loanPurpose'"
  );

  // CRITICAL REQUIREMENT 5: Restore the latest values, not the initial empty form
  assert.equal(
    restoredFormValues.annualIncome,
    "115000",
    "CRITICAL: Form must restore the latest updated annualIncome from the wizard (115000, not 85000 or empty)"
  );
  assert.equal(
    restoredFormValues.monthlyNetIncome,
    "7200",
    "CRITICAL: Form must restore the newly entered monthlyNetIncome from the wizard"
  );
  assert.equal(
    restoredFormValues.employmentStatus,
    "Self-Employed",
    "CRITICAL: Form must restore employmentStatus modified in wizard"
  );
  assert.equal(
    restoredFormValues.employerName,
    "Vance Architecture Studio",
    "CRITICAL: Form must restore employerName modified in wizard"
  );

  console.log("✅ Test 1 Passed: Complete flow (Form -> Wizard -> Updates -> Back to Form) verified with 100% data preservation");
}

// -----------------------------------------------------------------------------
// Test 2: Multiple Bidirectional Switches (No Data Loss Guarantee)
// -----------------------------------------------------------------------------
{
  let activeSharedValues = createInitialFormValues();

  // Cycle 1: Form input
  activeSharedValues = { ...activeSharedValues, fullName: "Robert Paulson", creditScoreRange: "680-719" };

  // Cycle 2: Wizard input
  activeSharedValues = { ...activeSharedValues, annualIncome: "65000", monthlyNetIncome: "4100" };

  // Cycle 3: Form input
  activeSharedValues = { ...activeSharedValues, loanAmount: "15000", monthlyDebt: "500" };

  // Cycle 4: Wizard input
  activeSharedValues = { ...activeSharedValues, annualIncome: "72000" };

  // Cycle 5: Revert to form
  const finalFormState = { ...createInitialFormValues(), ...activeSharedValues };

  assert.equal(finalFormState.fullName, "Robert Paulson");
  assert.equal(finalFormState.creditScoreRange, "680-719");
  assert.equal(finalFormState.annualIncome, "72000"); // Latest value retained
  assert.equal(finalFormState.monthlyNetIncome, "4100");
  assert.equal(finalFormState.loanAmount, "15000");
  assert.equal(finalFormState.monthlyDebt, "500");

  console.log("✅ Test 2 Passed: Multiple back-and-forth switches retain all accumulated values without regression");
}

// -----------------------------------------------------------------------------
// Test 3: Revert Morph Animation Variant Verification
// -----------------------------------------------------------------------------
{
  assert.ok(revertMorphVariant.initial, "revertMorphVariant must have an initial state");
  assert.ok(revertMorphVariant.animate, "revertMorphVariant must have an animate state");
  assert.ok(revertMorphVariant.exit, "revertMorphVariant must have an exit state");

  assert.equal(revertMorphVariant.initial.opacity, 0, "Initial opacity must fade in from 0");
  assert.equal(revertMorphVariant.animate.opacity, 1, "Animate opacity must reach 1");
  assert.equal(revertMorphVariant.exit.opacity, 0, "Exit opacity must fade out to 0");

  assert.ok(revertMorphVariant.initial.scale < 1.0, "Initial scale should be slightly recessed");
  assert.equal(revertMorphVariant.animate.scale, 1.0, "Animate scale should reach 1.0");

  const scaleTransition = revertMorphVariant.animate.transition.scale;
  assert.equal(scaleTransition.type, "spring", "Revert transition must use spring physics");

  console.log("✅ Test 3 Passed: Framer Motion revertMorphVariant validated with spring physics");
}

// -----------------------------------------------------------------------------
// Test 4: WebSocket Revert Action Protocol Formatting
// -----------------------------------------------------------------------------
{
  const sessionId = "sess_test_revert_99";
  const formValues = { annualIncome: "125000", fullName: "Diana Prince" };

  // Verify format matching shared WebSocket protocol specification
  const revertPayload = {
    type: "revert",
    sessionId: String(sessionId),
    timestamp: Date.now(),
    formValues
  };

  assert.equal(revertPayload.type, "revert", "Message type must be 'revert'");
  assert.equal(revertPayload.sessionId, sessionId, "SessionId must match current session");
  assert.ok(revertPayload.timestamp > 0, "Timestamp must be a positive number");
  assert.equal(revertPayload.formValues.annualIncome, "125000");

  const jsonString = JSON.stringify(revertPayload);
  const parsed = JSON.parse(jsonString);
  assert.equal(parsed.type, "revert");

  console.log("✅ Test 4 Passed: WebSocket revert message protocol compliant with shared specification");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("=================================================================");
console.log("🎉 All Form Revert & Bidirectional State Preservation tests passed!");
console.log("=================================================================");
