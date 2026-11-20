"use client";

import React, { useState } from "react";

/**
 * Pre-built Wizard Template: Income Stepper
 * Pavilson's template for income and financial friction points.
 */
export function PrebuiltIncomeWizard({
  initialValues = {},
  onUpdateValues,
  onRestoreOriginal,
  onSubmitWizard
}) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({
    annualIncome: initialValues.annualIncome || "",
    monthlyNetIncome: initialValues.monthlyNetIncome || "",
    incomeVerificationType: initialValues.incomeVerificationType || "W2",
    employmentStatus: initialValues.employmentStatus || "Employed",
    employerName: initialValues.employerName || ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...values, [name]: value };
    setValues(next);
    onUpdateValues?.(next);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 2) {
      setStep(2);
    } else {
      onSubmitWizard?.(values);
    }
  };

  return React.createElement(
    "div",
    {
      className:
        "bg-[#11172A] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden min-h-[520px] flex flex-col justify-between text-slate-100 backdrop-blur-xl"
    },
    // Header
    React.createElement(
      "div",
      {
        className:
          "bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4"
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { className: "flex items-center gap-2 mb-1.5" },
          React.createElement(
            "span",
            {
              className:
                "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/30 text-amber-300 border border-amber-500/40"
            },
            "Verified Fallback Template"
          ),
          React.createElement(
            "span",
            {
              className:
                "px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700"
            },
            "templateId: income-stepper"
          )
        ),
        React.createElement(
          "h2",
          { className: "text-xl sm:text-2xl font-black tracking-tight text-white" },
          "Simplified Income Assistant"
        ),
        React.createElement(
          "p",
          { className: "text-xs text-amber-200/80 mt-0.5" },
          "Pre-built verified assistant activated to keep your progress moving with zero data loss."
        )
      ),
      onRestoreOriginal
        ? React.createElement(
            "button",
            {
              type: "button",
              onClick: onRestoreOriginal,
              className:
                "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
            },
            "← Back to Full Form"
          )
        : null
    ),
    // Progress Indicator
    React.createElement(
      "div",
      {
        className:
          "px-6 sm:px-8 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between text-xs font-semibold text-amber-950"
      },
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement(
          "span",
          {
            className:
              "w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold"
          },
          step
        ),
        React.createElement(
          "span",
          null,
          step === 1 ? "Step 1: Earnings Details" : "Step 2: Employment & Verification"
        )
      ),
      React.createElement("span", { className: "text-slate-500 text-[11px]" }, `Step ${step} of 2`)
    ),
    // Step Body
    React.createElement(
      "form",
      { onSubmit: handleNext, className: "p-6 sm:p-8 flex-1 flex flex-col justify-between" },
      step === 1
        ? React.createElement(
            "div",
            { className: "space-y-4 max-w-lg mx-auto w-full" },
            React.createElement(
              "div",
              null,
              React.createElement(
                "label",
                { className: "block text-xs font-bold text-slate-700 uppercase mb-1" },
                "Annual Gross Income ($)"
              ),
              React.createElement("input", {
                type: "number",
                name: "annualIncome",
                value: values.annualIncome,
                onChange: handleChange,
                placeholder: "e.g. 85000",
                required: true,
                className:
                  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement(
                "label",
                { className: "block text-xs font-bold text-slate-700 uppercase mb-1" },
                "Monthly Net Income ($)"
              ),
              React.createElement("input", {
                type: "number",
                name: "monthlyNetIncome",
                value: values.monthlyNetIncome,
                onChange: handleChange,
                placeholder: "e.g. 5200",
                required: true,
                className:
                  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900"
              })
            )
          )
        : React.createElement(
            "div",
            { className: "space-y-4 max-w-lg mx-auto w-full" },
            React.createElement(
              "div",
              null,
              React.createElement(
                "label",
                { className: "block text-xs font-bold text-slate-700 uppercase mb-1" },
                "Employment Status"
              ),
              React.createElement(
                "select",
                {
                  name: "employmentStatus",
                  value: values.employmentStatus,
                  onChange: handleChange,
                  className:
                    "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900"
                },
                React.createElement("option", { value: "Employed" }, "Employed"),
                React.createElement("option", { value: "Self-Employed" }, "Self-Employed"),
                React.createElement("option", { value: "Contract" }, "Contract / Freelance"),
                React.createElement("option", { value: "Retired" }, "Retired")
              )
            ),
            React.createElement(
              "div",
              null,
              React.createElement(
                "label",
                { className: "block text-xs font-bold text-slate-700 uppercase mb-1" },
                "Employer / Company Name"
              ),
              React.createElement("input", {
                type: "text",
                name: "employerName",
                value: values.employerName,
                onChange: handleChange,
                placeholder: "Acme Financial Corp",
                className:
                  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900"
              })
            )
          ),
      // Footer controls
      React.createElement(
        "div",
        {
          className:
            "pt-6 mt-6 border-t border-slate-100 flex items-center justify-between"
        },
        step > 1
          ? React.createElement(
              "button",
              {
                type: "button",
                onClick: () => setStep(1),
                className:
                  "px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              },
              "Back"
            )
          : React.createElement("div", null),
        React.createElement(
          "button",
          {
            type: "submit",
            className:
              "px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-md transition-all"
          },
          step === 1 ? "Next Step →" : "Confirm & Apply"
        )
      )
    )
  );
}

/**
 * Pre-built Wizard Template: Loan Details
 * Pavilson's template for loan requests and amounts.
 */
export function PrebuiltLoanWizard({
  initialValues = {},
  onUpdateValues,
  onRestoreOriginal,
  onSubmitWizard
}) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({
    loanAmount: initialValues.loanAmount || "25000",
    loanTermMonths: initialValues.loanTermMonths || "36",
    loanPurpose: initialValues.loanPurpose || "Debt Consolidation"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...values, [name]: value };
    setValues(next);
    onUpdateValues?.(next);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 2) {
      setStep(2);
    } else {
      onSubmitWizard?.(values);
    }
  };

  return React.createElement(
    "div",
    {
      className:
        "bg-[#11172A] border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden min-h-[520px] flex flex-col justify-between text-slate-100 backdrop-blur-xl"
    },
    // Header
    React.createElement(
      "div",
      {
        className:
          "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4"
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { className: "flex items-center gap-2 mb-1.5" },
          React.createElement(
            "span",
            {
              className:
                "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
            },
            "Verified Fallback Template"
          ),
          React.createElement(
            "span",
            {
              className:
                "px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700"
            },
            "templateId: loan-details"
          )
        ),
        React.createElement(
          "h2",
          { className: "text-xl sm:text-2xl font-black tracking-tight text-white" },
          "Loan Purpose & Terms Assistant"
        ),
        React.createElement(
          "p",
          { className: "text-xs text-indigo-200/80 mt-0.5" },
          "Pre-built verified loan wizard active."
        )
      ),
      onRestoreOriginal
        ? React.createElement(
            "button",
            {
              type: "button",
              onClick: onRestoreOriginal,
              className:
                "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
            },
            "← Back to Full Form"
          )
        : null
    ),
    // Step Body
    React.createElement(
      "form",
      { onSubmit: handleNext, className: "p-6 sm:p-8 flex-1 flex flex-col justify-between" },
      React.createElement(
        "div",
        { className: "space-y-4 max-w-lg mx-auto w-full" },
        React.createElement(
          "div",
          null,
          React.createElement(
            "label",
            { className: "block text-xs font-bold text-slate-700 uppercase mb-1" },
            "Requested Loan Amount ($)"
          ),
          React.createElement("input", {
            type: "number",
            name: "loanAmount",
            value: values.loanAmount,
            onChange: handleChange,
            required: true,
            className:
              "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900"
          })
        ),
        React.createElement(
          "div",
          null,
          React.createElement(
            "label",
            { className: "block text-xs font-bold text-slate-700 uppercase mb-1" },
            "Loan Purpose"
          ),
          React.createElement("input", {
            type: "text",
            name: "loanPurpose",
            value: values.loanPurpose,
            onChange: handleChange,
            required: true,
            className:
              "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900"
          })
        )
      ),
      React.createElement(
        "div",
        { className: "pt-6 mt-6 border-t border-slate-100 flex items-center justify-end" },
        React.createElement(
          "button",
          {
            type: "submit",
            className:
              "px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all"
          },
          "Confirm Loan Terms →"
        )
      )
    )
  );
}

/**
 * Pre-built Wizard Template: Universal Quick Review
 * Pavilson's template for general form assistance.
 */
export function PrebuiltQuickReviewWizard({
  activeField = "form",
  initialValues = {},
  onRestoreOriginal,
  onSubmitWizard
}) {
  return React.createElement(
    "div",
    {
      className:
        "bg-[#11172A] border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden min-h-[520px] flex flex-col justify-between text-slate-100 backdrop-blur-xl"
    },
    React.createElement(
      "div",
      {
        className:
          "bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4"
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "span",
          {
            className:
              "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 mb-1.5 inline-block"
          },
          "Verified Fallback Template: quick-review"
        ),
        React.createElement(
          "h2",
          { className: "text-xl sm:text-2xl font-black tracking-tight text-white" },
          "Quick Application Review"
        )
      ),
      onRestoreOriginal
        ? React.createElement(
            "button",
            {
              type: "button",
              onClick: onRestoreOriginal,
              className:
                "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
            },
            "← Back to Full Form"
          )
        : null
    ),
    React.createElement(
      "div",
      { className: "p-6 sm:p-8 flex-1 flex flex-col items-center justify-center text-center space-y-4" },
      React.createElement("div", { className: "text-3xl" }, "📋"),
      React.createElement(
        "h3",
        { className: "text-base font-bold text-slate-900" },
        "Pre-built Guidance Active"
      ),
      React.createElement(
        "p",
        { className: "text-xs text-slate-600 max-w-sm" },
        "Reviewing your application step-by-step using verified templates. All previously entered data has been preserved."
      )
    ),
    React.createElement(
      "div",
      { className: "px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between" },
      onRestoreOriginal
        ? React.createElement(
            "button",
            {
              type: "button",
              onClick: onRestoreOriginal,
              className:
                "px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            },
            "Return to Full Form"
          )
        : React.createElement("div", null),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => onSubmitWizard?.(initialValues),
          className:
            "px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all"
        },
        "Submit Application"
      )
    )
  );
}

/**
 * Registry of pre-built wizard templates
 */
export const FALLBACK_TEMPLATES = {
  "income-stepper": PrebuiltIncomeWizard,
  "loan-details": PrebuiltLoanWizard,
  "quick-review": PrebuiltQuickReviewWizard
};

/**
 * Dynamic registry allowing external modules (Pavilson's validator/templates)
 * to register or query pre-built templates.
 */
export function registerFallbackTemplate(templateId, component) {
  if (templateId && component) {
    FALLBACK_TEMPLATES[templateId] = component;
  }
}

/**
 * Resolves a pre-built wizard template by templateId or activeField.
 * Returns the React component if available, or null if unavailable.
 *
 * Requirements:
 * - Integrate with Pavilson's existing pre-built wizard templates when available.
 * - If a template is unavailable, returns null (so original form can be restored).
 *
 * @param {string} [templateId]
 * @param {string} [activeField]
 * @returns {React.ComponentType|null}
 */
export function getFallbackTemplate(templateId, activeField) {
  if (templateId && templateId !== "none" && templateId !== "unavailable") {
    if (FALLBACK_TEMPLATES[templateId]) {
      return FALLBACK_TEMPLATES[templateId];
    }
  }

  // Automatic mapping based on active friction field
  if (activeField) {
    if (activeField === "annualIncome" || activeField === "monthlyNetIncome") {
      return FALLBACK_TEMPLATES["income-stepper"] || null;
    }
    if (activeField === "loanAmount" || activeField === "loanPurpose") {
      return FALLBACK_TEMPLATES["loan-details"] || null;
    }
  }

  // Explicit unmapped or non-matching template returns null
  return null;
}
