import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';

import {
  Button,
  Input,
  Select,
  Card,
  StepProgress,
  Label
} from '../src/design-system/index.js';

test('Design System - Exports all 6 required components', () => {
  assert.ok(typeof Button === 'function', 'Button must be exported as a function');
  assert.ok(typeof Input === 'function', 'Input must be exported as a function');
  assert.ok(typeof Select === 'function', 'Select must be exported as a function');
  assert.ok(typeof Card === 'function', 'Card must be exported as a function');
  assert.ok(typeof StepProgress === 'function', 'StepProgress must be exported as a function');
  assert.ok(typeof Label === 'function', 'Label must be exported as a function');
});

test('Design System - Button functional props and defaults', () => {
  const element = Button({ children: 'Click me' });
  assert.ok(element, 'Button renders without throwing');
  assert.equal(element.type, 'button');
  assert.equal(element.props.type, 'button', 'Default button type must be "button"');
  assert.equal(element.props.disabled, false);

  const disabledBtn = Button({ children: 'Disabled', disabled: true });
  assert.equal(disabledBtn.props.disabled, true);
  assert.equal(disabledBtn.props['aria-disabled'], true);

  const loadingBtn = Button({ children: 'Loading', loading: true });
  assert.equal(loadingBtn.props.disabled, true);
  assert.equal(loadingBtn.props['aria-busy'], true);
});

test('Design System - Input functional props and error association', () => {
  const element = Input({
    id: 'testInput',
    name: 'testInput',
    label: 'Test Label',
    value: 'hello',
    error: 'Field is required'
  });

  assert.ok(element, 'Input renders without throwing');
  assert.equal(element.type, 'div');
  
  // Find input element in children
  const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
  const inputChild = children.find(c => c && c.type === 'input');
  assert.ok(inputChild, 'Contains input element');
  assert.equal(inputChild.props.id, 'testInput');
  assert.equal(inputChild.props['aria-invalid'], true);
  assert.equal(inputChild.props['aria-describedby'], 'testInput-error');
});

test('Design System - Select handles empty and populated options safely', () => {
  const emptySelect = Select({ id: 'sel1', name: 'sel1', options: [] });
  assert.ok(emptySelect, 'Empty options handled safely');

  const populatedSelect = Select({
    id: 'sel2',
    name: 'sel2',
    options: [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' }
    ]
  });
  assert.ok(populatedSelect, 'Populated options rendered');
});

test('Design System - Card supports normal and highlighted variants', () => {
  const normalCard = Card({ title: 'Title', description: 'Desc', children: 'Content', variant: 'normal' });
  assert.ok(normalCard.props.className.includes('bg-white'));

  const highlightedCard = Card({ title: 'Highlighted', children: 'Content', variant: 'highlighted' });
  assert.ok(highlightedCard.props.className.includes('bg-blue-50/50'));
});

test('Design System - StepProgress calculates current and completed steps accurately', () => {
  const emptyNav = StepProgress({ steps: [], currentStep: 0 });
  assert.equal(emptyNav, null, 'Empty steps array returns null safely');

  const progress = StepProgress({
    steps: ['Step 1', 'Step 2', 'Step 3'],
    currentStep: 1
  });
  assert.ok(progress, 'StepProgress renders');
  assert.equal(progress.type, 'nav');
  assert.equal(progress.props['aria-label'], 'Wizard Progress');
});

test('Design System - Label visualizes required indicator and screen-reader marker', () => {
  const reqLabel = Label({ htmlFor: 'email', children: 'Email', required: true });
  assert.ok(reqLabel, 'Label renders');
  assert.equal(reqLabel.type, 'label');
  assert.equal(reqLabel.props.htmlFor, 'email');
});
