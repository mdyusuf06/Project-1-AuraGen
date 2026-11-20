import React from "react";

/**
 * AuraGen Design System - Button Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'button'|'submit'|'reset'} [props.type='button']
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'} [props.variant='primary']
 * @param {'small'|'medium'|'large'|'sm'|'md'|'lg'} [props.size='medium']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.loading=false]
 * @param {Function} [props.onClick]
 * @param {string} [props.className='']
 */
export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  ...rest
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variantStyles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm active:bg-indigo-800",
    secondary:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
    outline:
      "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-indigo-500 active:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm active:bg-rose-800"
  };

  const sizeStyles = {
    small: "px-3 py-1.5 text-xs gap-1.5",
    sm: "px-3 py-1.5 text-xs gap-1.5",
    medium: "px-4 py-2 text-sm gap-2",
    md: "px-4 py-2 text-sm gap-2",
    large: "px-6 py-2.5 text-base gap-2.5",
    lg: "px-6 py-2.5 text-base gap-2.5"
  };

  const chosenVariant = variantStyles[variant] || variantStyles.primary;
  const chosenSize = sizeStyles[size] || sizeStyles.medium;
  const isDisabled = Boolean(disabled || loading);

  const handleClick = (e) => {
    if (isDisabled) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (typeof onClick === "function") {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      onClick={handleClick}
      className={`${baseStyles} ${chosenVariant} ${chosenSize} ${className}`.trim()}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
          role="status"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
