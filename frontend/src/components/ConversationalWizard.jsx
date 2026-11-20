"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { wizardMorphVariant } from "../animation/variants.js";

/**
 * ConversationalWizard:
 * The simplified assistant generated when friction threshold is crossed.
 *
 * Features:
 * - Shared layout transition via Framer Motion layoutId
 * - Preserves previously entered values from the original form
 * - Step-by-step assistance focused on user's friction area
 * - "Back to original form" restoration button
 * - Zero page refresh
 */
export default function ConversationalWizard({
  activeField = "annualIncome",
  initialValues = {},
  onUpdateValues,
  onRestoreOriginal,
  onSubmitWizard,
  score = 75
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardValues, setWizardValues] = useState({
    ...initialValues,
    annualIncome: initialValues.annualIncome || "",
    monthlyNetIncome: initialValues.monthlyNetIncome || "",
    incomeVerificationType: initialValues.incomeVerificationType || "W2",
    employmentStatus: initialValues.employmentStatus || "Employed",
    employerName: initialValues.employerName || ""
  });
  const [submitted, setSubmitted] = useState(false);

  const formattedField = activeField
    ? activeField.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "Income Details";

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...wizardValues, [name]: value };
    setWizardValues(next);
    onUpdateValues?.(next);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (currentStep < 2) {
      setCurrentStep(2);
    } else {
      setSubmitted(true);
      onSubmitWizard?.(wizardValues);
    }
  };

  const handlePrev = (e) => {
    e.preventDefault();
    if (currentStep > 1) {
      setCurrentStep(1);
    }
  };

  return (
    <motion.div
      layoutId="auragen-form-card"
      variants={wizardMorphVariant}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-white border border-indigo-200/80 rounded-3xl shadow-xl overflow-hidden"
    >
      {/* Wizard Header with Shared Layout elements */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              layoutId="auragen-badge"
              className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/40"
            >
              AuraGen Guided Assistant
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Friction Resolved ({score} pts)
            </span>
          </div>

          <h2
            layoutId="auragen-title"
            className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2"
          >
            Guided Assistance: {formattedField}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            We simplified the 21-field form into 2 quick steps. All previously entered data was preserved.
          </p>
        </div>

        {/* Back to Original Form Button */}
        <button
          type="button"
          onClick={onRestoreOriginal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all hover:border-slate-500 shadow-sm"
          title="Return to the complete 21-field financial application"
        >
          <span>← Back to full form</span>
        </button>
      </div>

      {/* Step Progress Tracker */}
      <div className="px-6 sm:px-8 py-3 bg-indigo-50/70 border-b border-indigo-100/80 flex items-center justify-between text-xs font-semibold text-indigo-950">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              currentStep === 1
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-emerald-600 text-white"
            }`}
          >
            {currentStep > 1 ? "✓" : "1"}
          </span>
          <span>Income & Verification</span>
        </div>

        <div className="w-12 sm:w-24 h-1 bg-indigo-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-indigo-600 transition-all duration-300 ${
              currentStep === 1 ? "w-1/2" : "w-full"
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              currentStep === 2
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            2
          </span>
          <span>Employment Context</span>
        </div>
      </div>

      {/* Wizard Form Body */}
      <div className="p-6 sm:p-8">
        {submitted ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Assistance Completed Successfully!
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your simplified answers have been merged into your main application.
            </p>
            <button
              type="button"
              onClick={onRestoreOriginal}
              className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20"
            >
              Review Full Application
            </button>
          </div>
        ) : (
          <form onSubmit={handleNext} className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                  <span className="text-base">💡</span>
                  <span>
                    Let's quickly clarify your gross annual earnings. If you receive bonuses or variable commissions, enter your baseline W-2 or contract rate.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Gross Annual Income ($) *
                    </label>
                    <input
                      type="number"
                      name="annualIncome"
                      value={wizardValues.annualIncome}
                      onChange={handleChange}
                      placeholder="e.g. 120000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Monthly Take-Home Pay ($) *
                    </label>
                    <input
                      type="number"
                      name="monthlyNetIncome"
                      value={wizardValues.monthlyNetIncome}
                      onChange={handleChange}
                      placeholder="e.g. 7500"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Income Verification Method
                  </label>
                  <select
                    name="incomeVerificationType"
                    value={wizardValues.incomeVerificationType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium transition-all"
                  >
                    <option value="W2">W-2 Form (Standard Employee)</option>
                    <option value="1099">1099 / Independent Contractor</option>
                    <option value="TaxReturns">Federal Tax Returns (2 Years)</option>
                    <option value="BankStatements">12-Month Bank Statements</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                  <span className="text-base">💼</span>
                  <span>
                    Confirming your current work status ensures optimal debt-to-income approval calculation.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Employment Status
                    </label>
                    <select
                      name="employmentStatus"
                      value={wizardValues.employmentStatus}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium transition-all"
                    >
                      <option value="Employed">Employed (Full-Time)</option>
                      <option value="SelfEmployed">Self-Employed / Business Owner</option>
                      <option value="Contract">Contract / Freelance</option>
                      <option value="Retired">Retired / Pension</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Employer / Business Name
                    </label>
                    <input
                      type="text"
                      name="employerName"
                      value={wizardValues.employerName}
                      onChange={handleChange}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                >
                  ← Back to Step 1
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {currentStep === 1 ? "Continue to Step 2 →" : "Save & Complete Guided Help ✓"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
