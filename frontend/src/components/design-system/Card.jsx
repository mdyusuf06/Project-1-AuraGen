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
      "bg-white border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl",
    highlighted:
      "bg-emerald-50/70 border border-emerald-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl ring-1 ring-emerald-200/60"
  };

  const chosenVariant = variantStyles[variant] || variantStyles.normal;

  return (
    <div
      className={`p-6 sm:p-8 transition-all ${chosenVariant} ${className}`.trim()}
      {...rest}
    >
      {(title || description) && (
        <div className="mb-6 border-b border-slate-100 pb-4">
          {title && (
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-500">
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
