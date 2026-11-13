import React from 'react';

/**
 * AuraGen Design System - Card Component
 */
export function Card({
  title,
  description,
  children,
  className = '',
  variant = 'normal',
  ...rest
}) {
  const variantStyles = {
    normal: 'bg-white border-gray-200 shadow-sm',
    highlighted: 'bg-blue-50/50 border-blue-200 shadow-md ring-1 ring-blue-100'
  };

  const chosenVariant = variantStyles[variant] || variantStyles.normal;

  const header = (title || description)
    ? React.createElement(
        'div',
        { className: 'mb-5 border-b border-gray-100 pb-4' },
        title
          ? React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 tracking-tight' }, title)
          : null,
        description
          ? React.createElement('p', { className: 'mt-1 text-sm text-gray-500' }, description)
          : null
      )
    : null;

  const body = React.createElement('div', null, children);

  return React.createElement(
    'div',
    {
      className: `rounded-xl border p-6 transition-all ${chosenVariant} ${className}`.trim(),
      ...rest
    },
    header,
    body
  );
}

export default Card;
