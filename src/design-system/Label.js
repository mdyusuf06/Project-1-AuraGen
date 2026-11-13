import React from 'react';

/**
 * AuraGen Design System - Label Component
 */
export function Label({
  htmlFor,
  children,
  required = false,
  optional = false,
  className = '',
  ...rest
}) {
  return React.createElement(
    'label',
    {
      htmlFor,
      className: `block text-sm font-medium text-gray-700 mb-1 select-none ${className}`.trim(),
      ...rest
    },
    React.createElement('span', null, children),
    required
      ? React.createElement('span', { className: 'ml-1 text-red-500 font-semibold', 'aria-hidden': 'true' }, '*')
      : null,
    required
      ? React.createElement('span', { className: 'sr-only' }, ' (required)')
      : null,
    !required && optional
      ? React.createElement('span', { className: 'ml-1.5 text-xs text-gray-500 font-normal' }, '(optional)')
      : null
  );
}

export default Label;
