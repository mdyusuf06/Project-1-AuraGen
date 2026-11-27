import React from "react";
import { Label } from "./Label.jsx";

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
  placeholder = "Select an option",
  required = false,
  disabled = false,
  error,
  onChange,
  className = "",
  ...rest
}) {
  const selectId = id || name;
  const errorId = error && selectId ? `${selectId}-error` : undefined;

  const baseSelectStyles =
    "w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";

  const stateStyles = error
    ? "border-rose-400 focus:ring-rose-500/30 text-rose-900"
    : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500";

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
          value={value ?? ""}
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
            const optVal =
              typeof opt === "object" && opt !== null ? opt.value : opt;
            const optLabel =
              typeof opt === "object" && opt !== null
                ? opt.label ?? opt.value
                : opt;
            return (
              <option key={`${optVal}-${index}`} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;
