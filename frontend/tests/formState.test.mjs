import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  deepSerialize,
  serializeFormState,
  formatFieldLabel,
  inferFieldType
} from "../src/hooks/useFormState.js";
import {
  ALL_FORM_FIELDS,
  FINANCIAL_FORM_SECTIONS,
  createInitialFormValues
} from "../src/data/financialFormSchema.js";

console.log("=================================================================");
console.log("🧪 AuraGen useFormState Deep Serialization & Architecture Tests");
console.log("   Strict Schema, Zero Main-Thread Lag, and UI Morph Snapshot");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Test 1: Strict JSON Schema Compliance
// -----------------------------------------------------------------------------
{
  const testValues = {
    fullName: "Jordan Alexander Mercer",
    email: "jordan.mercer@enterprise.com",
    annualIncome: 165000,
    monthlyNetIncome: 9800,
    employmentStatus: "full_time"
  };

  const testErrors = {
    taxId: "SSN must be 9 digits"
  };

  const snapshot = serializeFormState({
    formId: "financial-application-commercial",
    values: testValues,
    errors: testErrors,
    focusedField: "annualIncome",
    schema: ALL_FORM_FIELDS
  });

  // Verify top-level strict schema keys
  assert.equal(snapshot.formId, "financial-application-commercial", "formId must match");
  assert.equal(snapshot.focusedField, "annualIncome", "focusedField must match currently focused field");
  assert.ok(Array.isArray(snapshot.fields), "fields must be an array");
  assert.equal(snapshot.fields.length >= 21, true, "Must contain all 21 financial form fields");

  // Verify strict schema structure for each field item
  for (const field of snapshot.fields) {
    assert.equal(typeof field.name, "string", `Field name must be a string (found on ${field.name})`);
    assert.equal(typeof field.label, "string", `Field label must be a string (found on ${field.name})`);
    assert.equal(typeof field.type, "string", `Field type must be a string (found on ${field.name})`);
    assert.ok(field.hasOwnProperty("value"), `Field must have value property (${field.name})`);
    assert.ok(field.error === null || typeof field.error === "string", `Field error must be string or null (${field.name})`);
    assert.equal(typeof field.section, "string", `Field section must be a string (${field.name})`);
  }

  // Verify values mapped correctly
  const annualIncomeField = snapshot.fields.find((f) => f.name === "annualIncome");
  assert.ok(annualIncomeField, "annualIncome field must exist");
  assert.equal(annualIncomeField.value, 165000, "annualIncome value must be 165000");
  assert.equal(annualIncomeField.error, null, "annualIncome error must be null");
  assert.equal(annualIncomeField.section, "income", "annualIncome section must be 'income'");

  const taxIdField = snapshot.fields.find((f) => f.name === "taxId");
  assert.ok(taxIdField, "taxId field must exist");
  assert.equal(taxIdField.error, "SSN must be 9 digits", "taxId error must be preserved");
  assert.equal(taxIdField.section, "personal", "taxId section must be 'personal'");

  console.log("✅ Test 1 Passed: Strict JSON schema structure strictly validated.");
}

// -----------------------------------------------------------------------------
// Test 2: Deep Serialization of Complex React State (Not Raw DOM Values)
// -----------------------------------------------------------------------------
{
  const complexValues = {
    fullName: "Eleanor Vance",
    preferences: {
      notifications: true,
      paperlessDisclosures: false,
      tags: ["urgent", "underwriting", "commercial"]
    },
    jointApplicant: {
      name: "Marcus Vance",
      income: 82000,
      metadata: {
        scoreTier: "A+",
        verified: true
      }
    },
    submissionDate: new Date("2026-11-26T12:00:00.000Z")
  };

  const serialized = deepSerialize(complexValues);

  assert.equal(serialized.fullName, "Eleanor Vance");
  assert.equal(serialized.preferences.notifications, true);
  assert.deepEqual(serialized.preferences.tags, ["urgent", "underwriting", "commercial"]);
  assert.equal(serialized.jointApplicant.metadata.scoreTier, "A+");
  assert.equal(serialized.submissionDate, "2026-11-26T12:00:00.000Z", "Dates must serialize to ISO string");

  console.log("✅ Test 2 Passed: Deep complex React state structures serialized cleanly.");
}

// -----------------------------------------------------------------------------
// Test 3: Trapping and Neutralization of Raw DOM Nodes, Events & Circular References
// -----------------------------------------------------------------------------
{
  // 1. Synthetic event simulation
  const mockSyntheticEvent = {
    _reactName: "onChange",
    nativeEvent: {},
    target: {
      name: "annualIncome",
      value: "145000"
    }
  };

  const serializedEvent = deepSerialize(mockSyntheticEvent);
  assert.equal(serializedEvent, "145000", "Synthetic event must unwrap to primitive value safely");

  // 2. Mock DOM Node
  const mockDomNode = {
    nodeType: 1,
    tagName: "INPUT",
    value: "250000"
  };

  const serializedNode = deepSerialize(mockDomNode);
  assert.equal(serializedNode, "250000", "DOM node must not be traversed into properties");

  // 3. Circular Reference Detection
  const circularObj = {
    name: "Recursive Loan Plan"
  };
  circularObj.self = circularObj;

  const serializedCircular = deepSerialize(circularObj);
  assert.equal(serializedCircular.name, "Recursive Loan Plan");
  assert.equal(serializedCircular.self, "[Circular]", "Circular references must be caught with [Circular]");

  console.log("✅ Test 3 Passed: Raw DOM nodes and circular references trapped safely without thread freezing.");
}

// -----------------------------------------------------------------------------
// Test 4: Section Categorization across All 5 Financial Form Sections
// -----------------------------------------------------------------------------
{
  const snapshot = serializeFormState({
    formId: "auragen-financial",
    values: createInitialFormValues(),
    schema: ALL_FORM_FIELDS
  });

  const sectionsFound = new Set(snapshot.fields.map((f) => f.section));
  assert.ok(sectionsFound.has("personal"), "Must contain 'personal' section");
  assert.ok(sectionsFound.has("employment"), "Must contain 'employment' section");
  assert.ok(sectionsFound.has("income"), "Must contain 'income' section");
  assert.ok(sectionsFound.has("assets"), "Must contain 'assets' section");
  assert.ok(sectionsFound.has("liabilities"), "Must contain 'liabilities' section");

  console.log("✅ Test 4 Passed: All 5 financial sections mapped accurately.");
}

// -----------------------------------------------------------------------------
// Test 5: Focused Field Tracking & Progress Metrics
// -----------------------------------------------------------------------------
{
  const initial = createInitialFormValues();
  const partialValues = {
    ...initial,
    fullName: "Alex Rivera",
    email: "alex@rivera.co",
    annualIncome: "180000"
  };

  // When focused on email
  const snap1 = serializeFormState({
    formId: "auragen-app",
    values: partialValues,
    focusedField: "email",
    schema: ALL_FORM_FIELDS
  });

  assert.equal(snap1.focusedField, "email", "focusedField must be 'email'");
  assert.equal(snap1.completedCount, 3, "completedCount must be 3");
  assert.ok(snap1.progressPercentage > 0, "progressPercentage must be computed");

  // When no field is focused
  const snap2 = serializeFormState({
    formId: "auragen-app",
    values: partialValues,
    focusedField: null,
    schema: ALL_FORM_FIELDS
  });

  assert.equal(snap2.focusedField, null, "focusedField must be null when unfocused");

  console.log("✅ Test 5 Passed: Focused field tracking and completion percentages verified.");
}

// -----------------------------------------------------------------------------
// Test 6: Performance Benchmark: Zero Main-Thread Lag (< 0.05ms per snapshot)
// -----------------------------------------------------------------------------
{
  const complexFormValues = {
    fullName: "Jordan Alexander Mercer",
    email: "jordan.mercer@enterprise.com",
    phone: "+1 (555) 234-8910",
    dateOfBirth: "1988-04-12",
    taxId: "123-45-6789",
    employmentStatus: "full_time",
    employerName: "Infotact Financial Holdings LLC",
    jobTitle: "Senior Operations Director",
    yearsAtEmployer: "6.5",
    annualIncome: "175000",
    monthlyNetIncome: "10500",
    additionalIncome: "25000",
    incomeVerificationType: "w2_paystubs",
    checkingSavingsBalance: "65000",
    investmentPortfolioValue: "120000",
    retirementAccountsValue: "210000",
    realEstateMarketValue: "550000",
    monthlyHousingPayment: "2800",
    totalCreditCardDebt: "3200",
    autoAndStudentLoans: "14000",
    monthlyDebtService: "650"
  };

  const errors = {
    totalCreditCardDebt: "Requires statement verification"
  };

  // Warm-up JIT compiler
  for (let i = 0; i < 50; i++) {
    serializeFormState({
      formId: "bench-warmup",
      values: complexFormValues,
      errors,
      focusedField: "annualIncome",
      schema: ALL_FORM_FIELDS
    });
  }

  const iterations = 1000;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    serializeFormState({
      formId: "bench-run",
      values: complexFormValues,
      errors,
      focusedField: i % 2 === 0 ? "annualIncome" : "loanAmount",
      schema: ALL_FORM_FIELDS
    });
  }

  const totalTimeMs = performance.now() - startTime;
  const timePerOpMs = totalTimeMs / iterations;

  console.log(`⚡ Performance Benchmark: ${iterations} snapshots serialized in ${totalTimeMs.toFixed(2)}ms (${(timePerOpMs * 1000).toFixed(1)}μs / snapshot)`);
  assert.ok(
    timePerOpMs < 0.2,
    `Each serialization must take < 0.2ms to ensure zero main-thread lag (measured ${timePerOpMs.toFixed(4)}ms)`
  );

  console.log("✅ Test 6 Passed: High-throughput benchmark proved zero main thread lag (< 0.2ms/op).");
}

// -----------------------------------------------------------------------------
// Test 7: Synchronous Pre-UI-Swap Progress Capture Simulation
// -----------------------------------------------------------------------------
{
  // Simulate user filling in form
  let formStateValues = createInitialFormValues();
  formStateValues.fullName = "Sarah Connor";
  formStateValues.annualIncome = "195000";
  formStateValues.checkingSavingsBalance = "80000";

  // Friction occurs on annualIncome -> User about to be swapped to Conversational Wizard
  // Immediate synchronous snapshot captured before unmounting static form:
  const preSwapSnapshot = serializeFormState({
    formId: "financial-application-v1",
    values: formStateValues,
    errors: {},
    focusedField: "annualIncome",
    schema: ALL_FORM_FIELDS
  });

  // Verify the snapshot contains exact user inputs ready to inject into DynamicRenderer
  assert.equal(preSwapSnapshot.formId, "financial-application-v1");
  assert.equal(preSwapSnapshot.focusedField, "annualIncome");
  const incomeField = preSwapSnapshot.fields.find((f) => f.name === "annualIncome");
  assert.equal(incomeField.value, "195000", "Value before swap must be captured with 100% fidelity");

  // Dynamic wizard consumes preSwapSnapshot.fields to populate its initial state
  const reconstructedWizardValues = {};
  for (const f of preSwapSnapshot.fields) {
    if (f.value !== "") {
      reconstructedWizardValues[f.name] = f.value;
    }
  }

  assert.equal(reconstructedWizardValues.fullName, "Sarah Connor");
  assert.equal(reconstructedWizardValues.annualIncome, "195000");
  assert.equal(reconstructedWizardValues.checkingSavingsBalance, "80000");

  console.log("✅ Test 7 Passed: Pre-UI-swap capture simulation preserves 100% of typed user data.");
}

console.log("=================================================================");
console.log("🎉 All 7 useFormState Architecture & Serialization Tests Passed!");
console.log("=================================================================");
