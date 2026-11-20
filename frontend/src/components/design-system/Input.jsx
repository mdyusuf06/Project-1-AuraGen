import React from "react";
import { Label } from "./Label.jsx";

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
 * @param {boolean} [props.readOnly=false]
 * @param {string} [props.error]
 * @param {string} [props.helperText]
 * @param {Function} [props.onChange]
 * @param {Function} [props.onBlur]
 * @param {string} [props.className='']
 */
export function Input({
  id,
  name,
  label,
  type = "text",
  value,
  placeholder = "",
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helperText,
  onChange,
  onBlur,
  className = "",
  ...rest
}) {
  const inputId = id || name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helperId = helperText && inputId ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  const baseInputStyles =
    "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed";

  const stateStyles = error
    ? "border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-100"
    : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-transparent";

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
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        aria-required={required}
        onChange={onChange}
        onBlur={onBlur}
        className={`${baseInputStyles} ${stateStyles}`}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default Input;
