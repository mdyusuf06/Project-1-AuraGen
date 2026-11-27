import React from 'react';
import { Label } from './Label.jsx';

/**
 * AuraGen Design System - Select Component
 * 
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.name
 * @param {string} [props.label]
 * @param {string|number} [props.value]
 * @param {Array<{label: string, value: string|number}>} [props.options=[]]
 * @param {string} [props.placeholder='Select an option']
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.error]
 * @param {Function} [props.onChange]
 * @param {string} [props.className='']
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

  return (
    <div className={`w-full ${className}`.trim()}>
      {label && (
        <Label htmlFor={selectId} required={required}>
          {label}
        </Label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value ?? ''}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          aria-required={required}
          onChange={onChange}
          className={`${baseSelectStyles} ${stateStyles}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {safeOptions.map((opt, index) => {
            const optVal = typeof opt === 'object' && opt !== null ? opt.value : opt;
            const optLabel = typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt;
            return (
              <option key={`${optVal}-${index}`} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;
