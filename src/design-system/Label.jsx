import React from 'react';

/**
 * AuraGen Design System - Label Component
 * 
 * @param {Object} props
 * @param {string} [props.htmlFor]
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.optional=false]
 * @param {string} [props.className='']
 */
export function Label({
  htmlFor,
  children,
  required = false,
  optional = false,
  className = '',
  ...rest
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-1 select-none ${className}`.trim()}
      {...rest}
    >
      <span>{children}</span>
      {required && (
        <span className="ml-1 text-red-500 font-semibold" aria-hidden="true">
          *
        </span>
      )}
      {required && (
        <span className="sr-only"> (required)</span>
      )}
      {!required && optional && (
        <span className="ml-1.5 text-xs text-gray-500 font-normal">
          (optional)
        </span>
      )}
    </label>
  );
}

export default Label;
