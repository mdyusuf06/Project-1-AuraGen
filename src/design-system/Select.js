import React from 'react';
import { Label } from './Label.js';

/**
 * AuraGen Design System - Select Component
 */
export function Select({
  id,
  name,
  label,
  value,
  options = [],
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error,
  onChange,
  className = '',
  ...rest
}) {
  const selectId = id || name;
  const errorId = error && selectId ? `${selectId}-error` : undefined;

  const baseSelectStyles = 'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed bg-white';
  
  const stateStyles = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

  const safeOptions = Array.isArray(options) ? options : [];

  const labelElement = label
    ? React.createElement(Label, { htmlFor: selectId, required }, label)
    : null;

  const placeholderOption = placeholder
    ? React.createElement('option', { value: '', disabled: true }, placeholder)
    : null;

  const optionElements = safeOptions.map((opt, index) => {
    const optVal = typeof opt === 'object' && opt !== null ? opt.value : opt;
    const optLabel = typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt;
    return React.createElement(
      'option',
      { key: `${optVal}-${index}`, value: optVal },
      optLabel
    );
  });

  const selectElement = React.createElement(
    'select',
    {
      id: selectId,
      name,
      value: value ?? '',
      required,
      disabled,
      'aria-invalid': Boolean(error),
      'aria-describedby': errorId,
      'aria-required': required,
      onChange,
      className: `${baseSelectStyles} ${stateStyles}`,
      ...rest
    },
    placeholderOption,
    ...optionElements
  );

  const errorElement = error
    ? React.createElement('p', { id: errorId, className: 'mt-1 text-xs text-red-600 font-medium', role: 'alert' }, error)
    : null;

  return React.createElement(
    'div',
    { className: `w-full ${className}`.trim() },
    labelElement,
    React.createElement('div', { className: 'relative' }, selectElement),
    errorElement
  );
}

export default Select;
