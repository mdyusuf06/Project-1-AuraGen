import React from 'react';
import { Label } from './Label.jsx';

/**
 * AuraGen Design System - Input Component
 * 
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.name
 * @param {string} [props.label]
 * @param {'text'|'email'|'password'|'number'|'date'|'tel'} [props.type='text']
 * @param {string|number} [props.value]
 * @param {string} [props.placeholder='']
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.error]
 * @param {string} [props.helperText]
 * @param {Function} [props.onChange]
 * @param {string} [props.className='']
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

  return (
    <div className={`w-full ${className}`.trim()}>
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        aria-required={required}
        onChange={onChange}
        className={`${baseInputStyles} ${stateStyles}`}
        {...rest}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default Input;
