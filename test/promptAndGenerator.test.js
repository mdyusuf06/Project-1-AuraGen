import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { AURAGEN_SYSTEM_PROMPT, buildUserPrompt } from '../src/prompts/systemPrompt.js';
import { FEW_SHOT_EXAMPLES } from '../src/prompts/fewShotExamples.js';
import { CodeGeneratorService } from '../src/generator/CodeGeneratorService.js';

test('Prompts - System prompt contains required constraints and components', () => {
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('Button'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('Input'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('Select'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('Card'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('StepProgress'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('Label'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('componentName'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('componentCode'));
  assert.ok(AURAGEN_SYSTEM_PROMPT.includes('dangerouslySetInnerHTML'));
});

test('Prompts - Few-shot examples module contains 3 rich demonstrations', () => {
  assert.equal(FEW_SHOT_EXAMPLES.length, 3);
  const names = FEW_SHOT_EXAMPLES.map(e => e.name);
  assert.ok(names.includes('Loan Application'));
  assert.ok(names.includes('KYC Verification'));
  assert.ok(names.includes('Tax Filing'));

  for (const eg of FEW_SHOT_EXAMPLES) {
    assert.ok(eg.input.fields.length >= 8);
    assert.ok(eg.output.componentCode.includes('StepProgress'));
    assert.ok(eg.output.componentCode.includes('Button'));
    assert.ok(eg.output.steps.length >= 3);
  }
});

test('Test Dataset - Exactly 10 valid test cases load from testCases.json', () => {
  const filePath = path.resolve('data/testCases.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(rawData);

  assert.ok(Array.isArray(data.testCases), 'testCases must be an array');
  assert.equal(data.testCases.length, 10, 'Must contain exactly 10 test cases');

  for (const tc of data.testCases) {
    assert.ok(tc.id, `Test case ${tc.name} must have an id`);
    assert.ok(tc.name, `Test case must have a name`);
    assert.ok(tc.input.fields.length > 0, `Test case ${tc.id} must have fields`);
    assert.ok(tc.expectedWizardSteps.length > 0, `Test case ${tc.id} must have expected steps`);
  }
});

test('Generator - Builds message payload correctly and generates valid wizard', async () => {
  const generator = new CodeGeneratorService();
  const testSchema = {
    formName: 'QuickContact',
    fields: [
      { name: 'name', label: 'Your Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'message', label: 'Message', type: 'text', required: true }
    ]
  };

  const messages = generator.buildMessages({ schema: testSchema });
  assert.ok(messages.length >= 7, 'Messages should include system, 3 few-shots (6 msgs), and target');

  const result = await generator.generateWizard({ schema: testSchema });
  assert.equal(result.success, true, 'Generation must succeed');
  assert.equal(result.data.componentName, 'QuickContactWizard');
  assert.ok(result.data.componentCode.includes('StepProgress'));
  assert.ok(result.data.componentCode.includes('QuickContactWizard'));
  assert.equal(result.data.validationSummary.isValid, true);
});

test('Generator - Handles all 10 test dataset cases without failure or field loss', async () => {
  const generator = new CodeGeneratorService();
  const filePath = path.resolve('data/testCases.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const { testCases } = JSON.parse(rawData);

  for (const tc of testCases) {
    const result = await generator.generateWizard({ schema: tc.input });
    assert.equal(result.success, true, `TC ${tc.id} (${tc.name}) generation must succeed`);
    assert.equal(result.data.fieldMapping.originalFieldCount, tc.input.fields.length);
    assert.equal(result.data.validationSummary.isValid, true);
  }
});
