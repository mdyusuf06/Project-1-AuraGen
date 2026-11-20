/**
 * AuraGen Intelligent Self-Healing Code Generator
 *
 * Specifically addresses the user's validation errors and preserved inputs,
 * outputting a simplified, step-by-step assistant styled with clean,
 * minimalist white & emerald tokens with stable state management.
 */

export async function generateComponentStub({
  activeField = "annualIncome",
  formFields = [],
  userInput = {},
  domContext = {},
  score = 65
}) {
  const safeField = String(activeField || "annualIncome").replace(/[^a-zA-Z0-9_]/g, "");
  const serializedInitial = JSON.stringify(userInput || {});
  const validationErrors = domContext?.validationErrors || {};
  const errorEntries = Object.entries(validationErrors);
  const hasErrors = errorEntries.length > 0;
  const primaryErrorText = hasErrors ? errorEntries[0][1] : "";
  const primaryErrorField = hasErrors ? errorEntries[0][0] : safeField;

  return `import React, { useState } from "react";

/**
 * AuraGen Simplified Wizard
 * Generated dynamically in response to Cognitive Friction (Score: ${score}/100)
 * Specifically targeting: "${safeField}"
 */
export default function DynamicFormWizard({ initialValues = ${serializedInitial}, onSubmit = () => {}, onChange }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => ({
    ...initialValues,
    ${safeField}: initialValues.${safeField} || ""
  }));
  const [localErrors, setLocalErrors] = useState(${JSON.stringify(validationErrors)});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (typeof onChange === "function") {
        onChange(next);
      }
      return next;
    });

    if (localErrors[name]) {
      setLocalErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-200 shadow-sm text-slate-800">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <span className="text-emerald-700 font-bold text-xs font-mono">AG</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              AuraGen Simplified Wizard
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {step === 1 ? "Step 1 of 2: Guided Assistance" : "Step 2 of 2: Review & Confirmation"}
            </h2>
          </div>
        </div>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Score: ${score}
        </span>
      </div>

      {/* Dynamic Contextual Guidance Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
        <strong className="text-slate-800 block font-semibold mb-1">
          {${JSON.stringify(hasErrors)} ? "We simplified this step for you:" : "Form Simplified For You:"}
        </strong>
        {${JSON.stringify(hasErrors)} ? (
          <span>
            Identified issue on <code className="bg-white text-rose-600 px-1.5 py-0.5 rounded border border-rose-200 font-mono text-[11px] font-bold">${primaryErrorField}</code>: ${primaryErrorText}. You can easily correct it here with all other inputs safely preserved.
          </span>
        ) : (
          <span>
            We noticed friction around "${safeField}". We simplified the form into this step-by-step assistant. All your entered values are safely preserved.
          </span>
        )}
      </div>

      {/* Step Form */}
      <form onSubmit={step === 1 ? handleNext : handleFinalSubmit} className="space-y-5">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                ${safeField}
              </label>
              <input
                type="text"
                name="${safeField}"
                value={formData.${safeField} || ""}
                onChange={handleChange}
                placeholder="Enter value"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-colors"
              />
              {localErrors.${safeField} && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">{localErrors.${safeField}}</p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Preserved Fields: <strong className="text-slate-700">{Object.keys(initialValues).length} disclosures</strong> stored securely.
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
            >
              Continue to Confirmation &rarr;
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="font-semibold text-slate-800">Summary of Preserved Data:</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600 text-xs">
                {Object.entries(formData).slice(0, 8).map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="text-slate-400">{k}:</span> <span className="font-medium text-slate-700">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                Submit Application
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
`;
}
