"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  wizardMorphVariant,
  stepSlideVariant,
  springTransition
} from "../animation/variants.js";

/**
 * ConversationalWizard:
 * The simplified assistant generated when friction threshold is crossed.
 *
 * Enhanced Animation Features:
 * - Direction-aware horizontal slide transitions (forward/backward)
 * - AnimatePresence mode="wait" to prevent layout collisions
 * - Smooth animated StepProgress bar and Stepper badges
 * - Full prefers-reduced-motion accessibility support
 * - Anti-flicker reserved layout height
 * - Strict input value preservation across step navigation
 * - Accessible keyboard navigation
 */
export default function ConversationalWizard({
  activeField = "annualIncome",
  initialValues = {},
  onUpdateValues,
  onRestoreOriginal,
  onSubmitWizard,
  score = 75,
  simulateCrash = false
}) {
  const [internalSimulateCrash, setInternalSimulateCrash] = useState(false);

  if (simulateCrash || internalSimulateCrash) {
    throw new Error("Simulated rendering exception inside ConversationalWizard");
  }

  // Tuple state: [currentStep, direction] (direction: 1 for forward, -1 for backward)
  const [[currentStep, direction], setStepState] = useState([1, 0]);

  // Accessibility: detect OS reduced-motion preference
  const shouldReduceMotion = useReducedMotion();

  // Requirement 3: Support keyboard shortcuts (Escape key reverts to original form)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onRestoreOriginal?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRestoreOriginal]);

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
      // Forward transition
      setStepState([2, 1]);
    } else {
      setSubmitted(true);
      onSubmitWizard?.(wizardValues);
    }
  };

  const handlePrev = (e) => {
    e.preventDefault();
    if (currentStep > 1) {
      // Backward transition
      setStepState([1, -1]);
    }
  };

  const customTransitionProps = {
    direction,
    reduceMotion: shouldReduceMotion
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

        <div className="flex items-center gap-2">
          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={() => setInternalSimulateCrash(true)}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-[11px] font-bold text-rose-300 border border-rose-800/80 transition-colors shadow-sm"
              title="Dev Only: Trigger runtime rendering error to test Error Boundary"
            >
              <span>Simulate Error</span>
            </button>
          )}

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
      </div>

      {/* Requirement 4: Smooth Stepper and StepProgress Animations */}
      <div className="px-6 sm:px-8 py-3.5 bg-indigo-50/70 border-b border-indigo-100/80 flex items-center justify-between text-xs font-semibold text-indigo-950">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{
              scale: currentStep === 1 ? (shouldReduceMotion ? 1 : 1.08) : 1,
              backgroundColor: currentStep > 1 ? "#059669" : "#4f46e5"
            }}
            transition={springTransition}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shadow-sm font-bold"
          >
            {currentStep > 1 ? "✓" : "1"}
          </motion.span>
          <span className={currentStep === 1 ? "font-bold text-indigo-900" : "text-slate-600"}>
            Income & Verification
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-16 sm:w-28 h-1.5 bg-indigo-200 rounded-full overflow-hidden p-0.5">
          <motion.div
            animate={{ width: currentStep === 1 ? "50%" : "100%" }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.35,
              ease: "easeOut"
            }}
            className="h-full bg-indigo-600 rounded-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <motion.span
            animate={{
              scale: currentStep === 2 ? (shouldReduceMotion ? 1 : 1.08) : 1,
              backgroundColor: currentStep === 2 ? "#4f46e5" : "#e2e8f0",
              color: currentStep === 2 ? "#ffffff" : "#475569"
            }}
            transition={springTransition}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm font-bold"
          >
            2
          </motion.span>
          <span className={currentStep === 2 ? "font-bold text-indigo-900" : "text-slate-500"}>
            Employment Context
          </span>
        </div>
      </div>

      {/* Wizard Form Body with AnimatePresence & layout anti-flicker protection */}
      <div className="p-6 sm:p-8 min-h-[300px] overflow-hidden flex flex-col justify-between">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 space-y-3"
          >
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
          </motion.div>
        ) : (
          <form onSubmit={handleNext} className="space-y-6 flex-1 flex flex-col justify-between">
            {/*
              Requirements 1, 2, 3, 5, 6, 7:
              - AnimatePresence mode="wait"
              - Custom direction parameter for horizontal slides (forward / backward)
              - Reduced motion fallback
            */}
            <div className="relative min-h-[190px] overflow-hidden" aria-live="polite">
              <AnimatePresence mode="wait" custom={customTransitionProps}>
                {currentStep === 1 && (
                  <motion.div
                    key="step-1-income"
                    custom={customTransitionProps}
                    variants={stepSlideVariant}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-5"
                  >
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
                          autoFocus
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
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step-2-employment"
                    custom={customTransitionProps}
                    variants={stepSlideVariant}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-5"
                  >
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
                          autoFocus
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wizard Navigation Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors focus:ring-2 focus:ring-indigo-500/20"
                >
                  ← Back to Step 1
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-indigo-500/40"
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
