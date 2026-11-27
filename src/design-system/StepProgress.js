import React from 'react';

/**
 * AuraGen Design System - StepProgress Component
 */
export function StepProgress({
  steps = [],
  currentStep = 0,
  completedSteps,
  className = '',
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

  const checkmarkIcon = React.createElement(
    'svg',
    {
      className: 'w-4 h-4 text-white',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2.5',
      viewBox: '0 0 24 24',
      'aria-hidden': 'true'
    },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M5 13l4 4L19 7'
    })
  );

  const stepItems = safeSteps.map((step, index) => {
    const stepTitle = typeof step === 'object' && step !== null ? step.title : String(step);
    const completed = isCompleted(index);
    const active = index === safeCurrent;
    const isLast = index === safeSteps.length - 1;

    const circleClass = completed
      ? 'bg-blue-600 text-white shadow-sm'
      : active
      ? 'border-2 border-blue-600 text-blue-600 bg-white ring-4 ring-blue-50'
      : 'border border-gray-300 text-gray-500 bg-gray-50';

    const circleContent = completed
      ? checkmarkIcon
      : React.createElement('span', null, index + 1);

    const titleClass = active
      ? 'text-blue-600'
      : completed
      ? 'text-gray-900'
      : 'text-gray-500';

    const stepLabel = React.createElement(
      'div',
      { className: 'hidden sm:block text-left' },
      React.createElement('p', { className: `text-xs font-medium ${titleClass}` }, stepTitle)
    );

    const circle = React.createElement(
      'div',
      {
        className: `w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-200 ${circleClass}`,
        'aria-label': `Step ${index + 1}: ${stepTitle}`
      },
      circleContent
    );

    const divider = !isLast
      ? React.createElement('div', {
          className: `flex-1 h-0.5 mx-2 transition-colors duration-200 ${
            completed ? 'bg-blue-600' : 'bg-gray-200'
          }`,
          'aria-hidden': 'true'
        })
      : null;

    return React.createElement(
      'li',
      {
        key: typeof step === 'object' && step?.id ? step.id : index,
        className: `flex items-center ${isLast ? 'flex-none' : 'flex-1'} relative`,
        'aria-current': active ? 'step' : undefined
      },
      React.createElement(
        'div',
        { className: 'flex items-center gap-3 z-10 bg-white pr-2' },
        circle,
        stepLabel
      ),
      divider
    );
  });

  const mobileInfo = React.createElement(
    'div',
    { className: 'sm:hidden mt-2 text-center text-xs text-gray-500 font-medium' },
    `Step ${safeCurrent + 1} of ${safeSteps.length}: ${
      typeof safeSteps[safeCurrent] === 'object'
        ? safeSteps[safeCurrent]?.title
        : safeSteps[safeCurrent]
    }`
  );

  return React.createElement(
    'nav',
    {
      'aria-label': 'Wizard Progress',
      className: `w-full py-4 ${className}`.trim(),
      ...rest
    },
    React.createElement('ol', { className: 'flex items-center justify-between w-full relative' }, ...stepItems),
    mobileInfo
  );
}

export default StepProgress;
