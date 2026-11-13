import React from 'react';

/**
 * AuraGen Design System - Button Component
 */
export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...rest
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm active:bg-blue-800',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400 active:bg-gray-300',
    outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-blue-500 active:bg-gray-100',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400 active:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm active:bg-red-800'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5'
  };

  const chosenVariant = variantStyles[variant] || variantStyles.primary;
  const chosenSize = sizeStyles[size] || sizeStyles.md;
  const isDisabled = Boolean(disabled || loading);

  // Guard against click executions when disabled or loading
  const handleClick = (e) => {
    if (isDisabled) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (typeof onClick === 'function') {
      onClick(e);
    }
  };

  const spinner = loading
    ? React.createElement(
        'svg',
        {
          className: 'animate-spin -ml-1 mr-2 h-4 w-4 text-current',
          xmlns: 'http://www.w3.org/2000/svg',
          fill: 'none',
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          role: 'status'
        },
        React.createElement('circle', {
          className: 'opacity-25',
          cx: '12',
          cy: '12',
          r: '10',
          stroke: 'currentColor',
          strokeWidth: '4'
        }),
        React.createElement('path', {
          className: 'opacity-75',
          fill: 'currentColor',
          d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        })
      )
    : null;

  return React.createElement(
    'button',
    {
      type,
      disabled: isDisabled,
      'aria-disabled': isDisabled,
      'aria-busy': loading,
      onClick: handleClick,
      className: `${baseStyles} ${chosenVariant} ${chosenSize} ${className}`.trim(),
      ...rest
    },
    spinner,
    children
  );
}

export default Button;
