import React from "react";

/**
 * AuraGen Design System - StepProgress Component
 *
 * @param {Object} props
 * @param {Array<{id: string|number, title: string}>|Array<string>} props.steps
 * @param {number} props.currentStep - 0-indexed current active step
 * @param {number[]} [props.completedSteps] - list of step indices marked completed
 * @param {string} [props.className='']
 */
export function StepProgress({
  steps = [],
  currentStep = 0,
  completedSteps,
  className = "",
  ...rest
}) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  if (safeSteps.length === 0) return null;

  const safeCurrent = Math.max(0, Math.min(currentStep, safeSteps.length - 1));
  const isCompleted = (index) => {
    if (Array.isArray(completedSteps)) {
      return completedSteps.includes(index);
    }
    return index < safeCurrent;
  };

  const progressPercent = Math.round(
    ((safeCurrent + 1) / safeSteps.length) * 100
  );

  return (
    <nav
      aria-label="Wizard Progress"
      className={`w-full mb-6 ${className}`.trim()}
      {...rest}
    >
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        <span>
          Step {safeCurrent + 1} of {safeSteps.length}:{" "}
          <strong className="text-slate-900 dark:text-white">
            {typeof safeSteps[safeCurrent] === "object"
              ? safeSteps[safeCurrent]?.title
              : safeSteps[safeCurrent]}
          </strong>
        </span>
        <span>{progressPercent}% Complete</span>
      </div>

      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="hidden sm:flex items-center justify-between mt-3 text-xs">
        {safeSteps.map((step, idx) => {
          const title = typeof step === "object" ? step.title : step;
          const active = idx === safeCurrent;
          const completed = isCompleted(idx);

          return (
            <li
              key={idx}
              className={`flex items-center gap-1.5 ${
                active
                  ? "text-indigo-600 dark:text-indigo-400 font-bold"
                  : completed
                  ? "text-slate-700 dark:text-slate-300 font-medium"
                  : "text-slate-400"
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  completed
                    ? "bg-indigo-600 text-white"
                    : active
                    ? "border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border border-slate-300 text-slate-400"
                }`}
              >
                {completed ? "✓" : idx + 1}
              </span>
              <span>{title}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default StepProgress;
