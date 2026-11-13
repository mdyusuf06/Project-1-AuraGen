import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOutputContract,
  validateInputSchema,
  scanSecurityPatterns,
  validateFieldPreservation,
  validateGenerationResult
} from '../src/validator/index.js';

test('Validator - Accepts valid output contract', () => {
  const validOutput = {
    componentName: 'TestWizard',
    componentCode: 'export default function TestWizard() { return null; }',
    steps: [{ stepIndex: 0, title: 'Step 1', fields: ['name'] }],
    fieldMapping: { originalFieldCount: 1, mappedFieldCount: 1, fieldsByStep: { '0': ['name'] } },
    validationSummary: { isValid: true, hasAllRequiredFields: true, notes: 'Valid' }
  };

  const result = validateOutputContract(validOutput);
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
});

test('Validator - Rejects incomplete output contracts', () => {
  const missingKeys = {
    componentName: 'TestWizard'
  };

  const result = validateOutputContract(missingKeys);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.length > 0);
});

test('Validator - Input schema validation rejects duplicates and empty fields', () => {
  const invalidSchema = {
    fields: [
      { name: 'email', type: 'email' },
      { name: 'email', type: 'text' }
    ]
  };

  const result = validateInputSchema(invalidSchema);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('Duplicate field name')));
});

test('Validator - Detects prohibited security patterns', () => {
  const codeWithEval = 'function run(x) { eval(x); }';
  assert.equal(scanSecurityPatterns(codeWithEval).isSecure, false);

  const codeWithInnerHTML = 'function run() { return <div dangerouslySetInnerHTML={{ __html: "alert" }} />; }';
  assert.equal(scanSecurityPatterns(codeWithInnerHTML).isSecure, false);

  const codeWithScript = '<div><script>alert(1)</script></div>';
  assert.equal(scanSecurityPatterns(codeWithScript).isSecure, false);

  const cleanCode = 'export default function Clean() { return <div>Safe</div>; }';
  assert.equal(scanSecurityPatterns(cleanCode).isSecure, true);
});

test('Validator - Validates field preservation accurately', () => {
  const schema = {
    fields: [
      { name: 'firstName', type: 'text' },
      { name: 'lastName', type: 'text' },
      { name: 'secretCode', type: 'text' }
    ]
  };

  const outputWithMissingField = {
    componentCode: 'function Comp() { return <div>{formData.firstName}</div>; }',
    steps: [{ fields: ['firstName', 'lastName'] }]
  };

  const result = validateFieldPreservation(schema, outputWithMissingField);
  assert.equal(result.isPreserved, false);
  assert.deepEqual(result.missingFields, ['secretCode']);
});
