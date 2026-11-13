import React from 'react';

/**
 * AuraGen Design System - Card Component
 * 
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 * @param {'normal'|'highlighted'} [props.variant='normal']
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

  return (
    <div
      className={`rounded-xl border p-6 transition-all ${chosenVariant} ${className}`.trim()}
      {...rest}
    >
      {(title || description) && (
        <div className="mb-5 border-b border-gray-100 pb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export default Card;
