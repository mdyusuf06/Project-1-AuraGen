import React from 'react';
import { Label } from './Label.js';

/**
 * AuraGen Design System - Input Component
 */
export function Input({
  id,
  name,
  label,
  type = 'text',
  value,
  placeholder = '',
  required = false,
  disabled = false,
  error,
  helperText,
  onChange,
  className = '',
  ...rest
}) {
  const inputId = id || name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helperId = helperText && inputId ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const baseInputStyles = 'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed';
  
  const stateStyles = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

  const labelElement = label
    ? React.createElement(Label, { htmlFor: inputId, required }, label)
    : null;

  const inputElement = React.createElement('input', {
    id: inputId,
    name,
    type,
    value,
    placeholder,
    required,
    disabled,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    'aria-required': required,
    onChange,
    className: `${baseInputStyles} ${stateStyles}`,
    ...rest
  });

  const errorElement = error
    ? React.createElement('p', { id: errorId, className: 'mt-1 text-xs text-red-600 font-medium', role: 'alert' }, error)
    : null;

  const helperElement = (!error && helperText)
    ? React.createElement('p', { id: helperId, className: 'mt-1 text-xs text-gray-500' }, helperText)
    : null;

  return React.createElement(
    'div',
    { className: `w-full ${className}`.trim() },
    labelElement,
    inputElement,
    errorElement,
    helperElement
  );
}

export default Input;
