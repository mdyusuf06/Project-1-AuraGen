import React, { useState } from "react";

/**
 * AuraGen Self-Healing Step-by-Step Wizard
 * Dynamically generated to alleviate cognitive friction on: annualIncome
 * Preserves initial user values while breaking the form into 3 manageable steps.
 */
export default function DynamicFormWizard({
  initialValues = {},
  onSubmit = () => {},
  onStepChange = () => {},
  onCancel = () => {}
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessLegalName: initialValues.businessLegalName || "Apex Meridian Logistics LLC",
    entityStructure: initialValues.entityStructure || "LLC",
    taxIdentificationNumber: initialValues.taxIdentificationNumber || "84-2910482",
    yearsInOperation: initialValues.yearsInOperation || 6,
    annualRevenue: initialValues.annualRevenue || "",
    annualIncome: initialValues.annualIncome || "",
    monthlyCommercialDebtObligations: initialValues.monthlyCommercialDebtObligations || "",
    liquidCashReserves: initialValues.liquidCashReserves || "",
    requestedFacilityAmount: initialValues.requestedFacilityAmount || 350000,
    collateralAssetType: initialValues.collateralAssetType || "Commercial Real Estate",
    bankruptcyDeclaration: initialValues.bankruptcyDeclaration || false
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleNext = () => {
    if (step === 2 && !formData.annualIncome) {
      setErrors({ annualIncome: "Please enter your estimated net annual income." });
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    onStepChange(nextStep);
  };

  const handleBack = () => {
    const prevStep = step - 1;
    setStep(prevStep);
    onStepChange(prevStep);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const progressPercent = (step / 3) * 100;

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8 transition-all">
      {/* Header & Cognitive Friction Assist Banner */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
          <span>Infotact Simplified Assistant</span>
          <span>Step {step} of 3</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Business Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Business Verification</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Confirm your company details below.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Business Legal Name
              </label>
              <input
                type="text"
                name="businessLegalName"
                value={formData.businessLegalName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Entity Type
                </label>
                <select
                  name="entityStructure"
                  value={formData.entityStructure}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LLC">LLC</option>
                  <option value="C-Corp">C-Corp</option>
                  <option value="S-Corp">S-Corp</option>
                  <option value="Partnership">Partnership</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tax EIN
                </label>
                <input
                  type="text"
                  name="taxIdentificationNumber"
                  value={formData.taxIdentificationNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Income & Financials (Friction Remediation Step) */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Annual Income & Revenue</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Let's break down your earnings into simple numbers.
              </p>
            </div>

            {/* AuraGen Spotlight Guidance Card */}
            <div className="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start space-x-3">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <strong className="font-semibold block mb-0.5">Need help calculating Net Annual Income?</strong>
                Enter your total personal compensation (draws, salary, and distributions) taken from the business over the last 12 months. An approximation is fine!
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Net Owner Annual Income ($) *
              </label>
              <input
                type="number"
                name="annualIncome"
                placeholder="e.g. 150000"
                value={formData.annualIncome}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.annualIncome && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.annualIncome}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Gross Business Annual Revenue ($)
              </label>
              <input
                type="number"
                name="annualRevenue"
                placeholder="e.g. 1200000"
                value={formData.annualRevenue}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Facility Terms & Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Facility Request</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Finalize your credit facility request.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Requested Facility Amount ($)
              </label>
              <input
                type="number"
                name="requestedFacilityAmount"
                value={formData.requestedFacilityAmount}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              ✓ All previously entered business information has been preserved.
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-medium transition-all"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 text-sm font-medium transition-all"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all flex items-center space-x-1"
            >
              <span>Continue</span>
              <span>→</span>
            </button>
          ) : (
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition-all flex items-center space-x-1"
            >
              <span>Submit Application</span>
              <span>✓</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}