"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  wizardMorphVariant,
  stepSlideVariant,
  springTransition,
  reviewCardVariant
} from "../animation/variants.js";

/**
 * ConversationalWizard:
 * The simplified AI assistant generated when cognitive friction threshold is crossed.
 *
 * Week 3 Features:
 * - 3-Step Guided Navigation: Step 1 (Income), Step 2 (Employment), Step 3 (Review & Confirm)
 * - Direction-aware horizontal slide transitions (forward/backward)
 * - AnimatePresence mode="wait" to prevent layout collisions
 * - Smooth animated StepProgress bar and glowing Stepper badges
 * - Full prefers-reduced-motion accessibility support
 * - Anti-flicker reserved layout height
 * - Strict input value preservation across all step transitions
 * - Accessible keyboard navigation (Escape to return, Enter to proceed)
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

  // Tuple state: [currentStep, direction] (1: Income, 2: Employment, 3: Review; direction: 1=forward, -1=backward)
  const [[currentStep, direction], setStepState] = useState([1, 0]);
  const [validationError, setValidationError] = useState("");

  // Accessibility: detect OS reduced-motion preference
  const shouldReduceMotion = useReducedMotion();

  // Support keyboard shortcuts (Escape key reverts to original form)
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
    employerName: initialValues.employerName || "",
    jobTitle: initialValues.jobTitle || ""
  });
  const [submitted, setSubmitted] = useState(false);

  const formattedField = activeField
    ? activeField.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "Income Details";

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...wizardValues, [name]: value };
    setWizardValues(next);
    setValidationError("");
    onUpdateValues?.(next);
  };

  const handleNext = (e) => {
    if (e) e.preventDefault();

    if (currentStep === 1) {
      if (!wizardValues.annualIncome) {
        setValidationError("Please enter your estimated annual gross income to continue.");
        return;
      }
      setValidationError("");
      setStepState([2, 1]);
    } else if (currentStep === 2) {
      setValidationError("");
      setStepState([3, 1]);
    } else {
      // Step 3 (Review): Final submission
      setSubmitted(true);
      onSubmitWizard?.(wizardValues);
    }
  };

  const handlePrev = (e) => {
    if (e) e.preventDefault();
    setValidationError("");
    if (currentStep > 1) {
      setStepState([currentStep - 1, -1]);
    }
  };

  const jumpToStep = (targetStep) => {
    setValidationError("");
    const dir = targetStep > currentStep ? 1 : -1;
    setStepState([targetStep, dir]);
  };

  const customTransitionProps = {
    direction,
    reduceMotion: shouldReduceMotion
  };

  // Stepper metadata
  const stepsMeta = [
    { num: 1, title: "Income & Compensation" },
    { num: 2, title: "Employment Context" },
    { num: 3, title: "Review & Confirm" }
  ];

  const progressPercentage = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <motion.div
      variants={wizardMorphVariant}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#11172A] border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 backdrop-blur-xl"
    >
      {/* Wizard Header with Shared Layout elements */}
      <div className="bg-gradient-to-r from-[#0D1220] via-[#11172A] to-[#171E33] border-b border-indigo-500/20 p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <motion.span
              layoutId="auragen-badge"
              className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30"
            >
              AuraGen Guided Assistant
            </motion.span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Friction Resolved ({score} pts)
            </span>
          </div>

          <motion.h2
            layoutId="auragen-title"
            className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2"
          >
            Guided Assistance: {formattedField}
          </motion.h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Simplified 21-field complexity into 3 conversational steps. All previous data preserved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={() => setInternalSimulateCrash(true)}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-[11px] font-bold text-rose-300 border border-rose-800/80 transition-colors shadow-sm"
              title="Dev Only: Trigger runtime error to test Error Boundary"
            >
              <span>Simulate Error</span>
            </button>
          )}

          {/* Back to Original Form Button */}
          <button
            type="button"
            onClick={onRestoreOriginal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all hover:border-indigo-500/40 shadow-sm"
            title="Return to the complete 21-field application"
          >
            <span>← Back to full form</span>
          </button>
        </div>
      </div>

      {/* 3-Step Animated Stepper Progress Bar */}
      <div className="px-6 sm:px-8 py-3.5 bg-[#0D1220]/80 border-b border-indigo-500/15 flex items-center justify-between text-xs font-semibold">
        {stepsMeta.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={() => isDone && jumpToStep(s.num)}
                  disabled={!isDone}
                  animate={{
                    scale: isActive ? (shouldReduceMotion ? 1 : 1.1) : 1,
                    backgroundColor: isDone ? "#38D9A9" : isActive ? "#8057FF" : "#1e293b",
                    color: isDone || isActive ? "#ffffff" : "#64748b"
                  }}
                  transition={springTransition}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${isDone ? "cursor-pointer hover:opacity-80" : ""
                    }`}
                >
                  {isDone ? "✓" : s.num}
                </motion.button>
                <span className={`hidden sm:inline ${isActive ? "font-bold text-white" : isDone ? "text-slate-300" : "text-slate-500"}`}>
                  {s.title}
                </span>
              </div>

              {idx < stepsMeta.length - 1 && (
                <div className="flex-1 mx-3 sm:mx-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    animate={{
                      width: currentStep > s.num ? "100%" : currentStep === s.num ? "50%" : "0%"
                    }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#8057FF] to-[#25D9E8] rounded-full"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Wizard Form Body with AnimatePresence & layout anti-flicker protection */}
      <div className="p-6 sm:p-8 min-h-[340px] overflow-hidden flex flex-col justify-between">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-[#38D9A9] border border-emerald-500/40 flex items-center justify-center text-3xl font-bold shadow-[0_0_20px_rgba(56,217,169,0.3)]">
              ✓
            </div>
            <h3 className="text-xl font-bold text-white">
              Assistance Completed Successfully!
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your simplified answers have been merged into the underwriting application. All remaining fields were preserved without data loss.
            </p>
            <button
              type="button"
              onClick={onRestoreOriginal}
              className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8057FF] to-[#25D9E8] hover:opacity-90 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/30"
            >
              Review Full Application
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleNext} className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="relative min-h-[220px] overflow-hidden" aria-live="polite">
              <AnimatePresence mode="wait" custom={customTransitionProps}>
                {/* STEP 1: Income & Verification */}
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
                    <div className="p-4 rounded-2xl bg-[#0D1220] border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                      <span className="text-base">💡</span>
                      <span>
                        What is your estimated annual earnings? Include salary, bonus, and steady commissions.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Gross Annual Income ($) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            name="annualIncome"
                            value={wizardValues.annualIncome}
                            onChange={handleChange}
                            placeholder="e.g. 120000"
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-[#8057FF] focus:ring-2 focus:ring-[#8057FF]/20 text-sm font-medium text-white transition-all"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Monthly Take-Home Pay ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            name="monthlyNetIncome"
                            value={wizardValues.monthlyNetIncome}
                            onChange={handleChange}
                            placeholder="e.g. 7500"
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-[#8057FF] focus:ring-2 focus:ring-[#8057FF]/20 text-sm font-medium text-white transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Income Verification Method
                      </label>
                      <select
                        name="incomeVerificationType"
                        value={wizardValues.incomeVerificationType}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-[#8057FF] focus:ring-2 focus:ring-[#8057FF]/20 text-sm font-medium text-white transition-all"
                      >
                        <option value="W2">W-2 Form (Standard Employee)</option>
                        <option value="1099">1099 / Independent Contractor</option>
                        <option value="TaxReturns">Federal Tax Returns (2 Years)</option>
                        <option value="BankStatements">12-Month Bank Statements</option>
                      </select>
                    </div>

                    {validationError && (
                      <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                        <span>⚠</span> {validationError}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: Employment Context */}
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
                    <div className="p-4 rounded-2xl bg-[#0D1220] border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                      <span className="text-base">💼</span>
                      <span>
                        Confirming your employment structure ensures accurate debt-to-income approval calculations.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Employment Status
                        </label>
                        <select
                          name="employmentStatus"
                          value={wizardValues.employmentStatus}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-[#8057FF] focus:ring-2 focus:ring-[#8057FF]/20 text-sm font-medium text-white transition-all"
                          autoFocus
                        >
                          <option value="Employed">Employed (Full-Time)</option>
                          <option value="SelfEmployed">Self-Employed / Business Owner</option>
                          <option value="Contract">Contract / Freelance</option>
                          <option value="Retired">Retired / Pension</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Employer / Business Name
                        </label>
                        <input
                          type="text"
                          name="employerName"
                          value={wizardValues.employerName}
                          onChange={handleChange}
                          placeholder="e.g. Infotact Corp"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-[#8057FF] focus:ring-2 focus:ring-[#8057FF]/20 text-sm font-medium text-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Job Title / Position
                      </label>
                      <input
                        type="text"
                        name="jobTitle"
                        value={wizardValues.jobTitle}
                        onChange={handleChange}
                        placeholder="e.g. Operations Lead"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-[#8057FF] focus:ring-2 focus:ring-[#8057FF]/20 text-sm font-medium text-white transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Final Review Step */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3-review"
                    custom={customTransitionProps}
                    variants={reviewCardVariant}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-2xl bg-[#0D1220] border border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2.5">
                      <span className="text-base">📋</span>
                      <span>
                        Final Review: Verify your guided entries below. Clicking Complete will merge these directly into your 21-field underwriting application.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Annual Income</span>
                          <span className="text-white font-extrabold text-sm">
                            ${Number(wizardValues.annualIncome || 0).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => jumpToStep(1)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly Take-Home</span>
                          <span className="text-white font-extrabold text-sm">
                            ${Number(wizardValues.monthlyNetIncome || 0).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => jumpToStep(1)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Employment Status</span>
                          <span className="text-white font-bold">{wizardValues.employmentStatus}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => jumpToStep(2)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Employer Name</span>
                          <span className="text-white font-bold">{wizardValues.employerName || "Not specified"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => jumpToStep(2)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wizard Navigation Footer */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
                >
                  ← Back to Step {currentStep - 1}
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8057FF] to-[#25D9E8] hover:opacity-90 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {currentStep === 1
                    ? "Continue to Step 2 →"
                    : currentStep === 2
                      ? "Proceed to Review →"
                      : "Confirm & Merge into Application ✓"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
