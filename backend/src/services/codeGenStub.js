/**
 * Placeholder Stub for Teammate's LangChain Code-Gen Module (Week 1)
 *
 * Replace or bypass this stub by wiring up teammate's `generateComponent`
 * module inside `src/services/codeGenService.js`.
 */

export async function generateComponentStub({
  activeField = "annualIncome",
  formFields = [],
  userInput = {},
  score = 75
}) {
  const safeField = String(activeField || "annualIncome").replace(/[^a-zA-Z0-9_]/g, "");
  const serializedInitial = JSON.stringify(userInput || {});
  const fieldCount = Array.isArray(formFields) ? formFields.length : 0;

  return `import React, { useState } from "react";

/**
 * [AuraGen Stub Component - Week 1 Placeholder]
 * Triggered for friction field: "${safeField}" (Cognitive Load Score: ${score}/100)
 * Original fields tracked: ${fieldCount}
 */
export default function DynamicFormWizard({ initialValues = ${serializedInitial}, onSubmit = () => {} }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ...initialValues,
    ${safeField}: initialValues.${safeField} || ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            AuraGen Simplified Wizard (Stub)
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Step {step} of 2: Guided Assistance
          </h2>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
          Score: ${score}
        </span>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-900">
        <strong>Focused Help for "${safeField}":</strong> We simplified the complex form into quick steps.
        Your previously entered values are preserved.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ${safeField}
            </label>
            <input
              type="text"
              name="${safeField}"
              value={formData.${safeField} || ""}
              onChange={handleChange}
              placeholder="Enter value for ${safeField}..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {step === 2 && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
            Ready to review and submit your simplified application data.
          </div>
        )}

        <div className="flex justify-between pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              Submit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}`;
}

