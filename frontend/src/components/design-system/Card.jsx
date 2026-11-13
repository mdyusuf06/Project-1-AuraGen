import React from "react";

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
  className = "",
  variant = "normal",
  ...rest
}) {
  const variantStyles = {
    normal:
      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl",
    highlighted:
      "bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-xl rounded-2xl ring-1 ring-indigo-200 dark:ring-indigo-800"
  };

  const chosenVariant = variantStyles[variant] || variantStyles.normal;

  return (
    <div
      className={`p-6 sm:p-8 transition-all ${chosenVariant} ${className}`.trim()}
      {...rest}
    >
      {(title || description) && (
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          {title && (
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
