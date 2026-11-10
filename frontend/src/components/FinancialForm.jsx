"use client";

import React, { useState, useMemo } from "react";
import {
  FINANCIAL_FORM_SECTIONS,
  ALL_FORM_FIELDS,
  createInitialFormValues,
  validateField,
  validateAllFields
} from "../data/financialFormSchema";

export default function FinancialForm({
  activeField,
  onActiveFieldChange,
  onFormValuesChange
}) {
  const [values, setValues] = useState(() => createInitialFormValues());
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submittedData, setSubmittedData] = useState(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const completedCount = useMemo(() => {
    return ALL_FORM_FIELDS.filter((f) => {
      const v = values[f.name];
      return v !== "" && v !== null && v !== undefined;
    }).length;
  }, [values]);

  const errorCount = Object.keys(errors).length;

  const handleFieldFocus = (fieldName) => {
    onActiveFieldChange?.(fieldName);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    onFormValuesChange?.(nextValues);

    if (touched[name] || submitAttempted) {
      const err = validateField(name, value, nextValues);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) {
          next[name] = err;
        } else {
          delete next[name];
        }
        return next;
      });
    }
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value, values);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) {
        next[name] = err;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const allTouched = {};
    for (const f of ALL_FORM_FIELDS) {
      allTouched[f.name] = true;
    }
    setTouched(allTouched);

    const result = validateAllFields(values);
    setErrors(result.errors);

    if (!result.isValid) {
      setSubmittedData(null);
      const firstErrorField = Object.keys(result.errors)[0];
      if (firstErrorField) {
        onActiveFieldChange?.(firstErrorField);
      }
      return;
    }

    setSubmittedData(values);
  };

  const handleFillSample = () => {
    const sample = {
      ...createInitialFormValues(),
      fullName: "Jordan Alexander Mercer",
      email: "jordan.mercer@infotact.com",
      phone: "5552348910",
      dateOfBirth: "1991-06-15",
      taxId: "123-45-6789",
      employmentStatus: "full_time",
      employerName: "Infotact Financial Holdings",
      jobTitle: "Operations Lead",
      yearsAtEmployer: "4"
    };
    setValues(sample);
    setErrors({});
    onFormValuesChange?.(sample);
  };

  const handleReset = () => {
    const empty = createInitialFormValues();
    setValues(empty);
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setSubmittedData(null);
    onFormValuesChange?.(empty);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Form Header */}
      <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 mb-1.5">
            Infotact Financial Portal • Comprehensive Underwriting Form
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Commercial Credit & Wealth Disclosure
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete all {ALL_FORM_FIELDS.length} fields across {FINANCIAL_FORM_SECTIONS.length} sections. Rapid clicks or hesitation will trigger AuraGen telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Completion</div>
            <div className="text-sm font-bold text-slate-900">
              {completedCount} / {ALL_FORM_FIELDS.length} fields
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillSample}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-300 transition-colors"
          >
            Prefill Partial Data
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {submitAttempted && errorCount > 0 && (
        <div className="mx-6 mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <strong className="font-semibold">
            Submission blocked: {errorCount} field{errorCount > 1 ? "s" : ""} require correction.
          </strong>{" "}
          Please review the highlighted sections below.
        </div>
      )}

      {/* Submission Success Banner */}
      {submittedData && (
        <div className="mx-6 mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
          <strong className="font-semibold block">
            Application validated and ready for underwriting!
          </strong>
          <span className="text-xs text-emerald-700">
            All {ALL_FORM_FIELDS.length} disclosures passed client-side financial validation.
          </span>
        </div>
      )}

      {/* Dense Multi-Section Form */}
      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-8">
        {FINANCIAL_FORM_SECTIONS.map((section) => {
          const sectionErrors = section.fields.filter((f) => errors[f.name]).length;

          return (
            <section
              key={section.id}
              className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
                </div>
                {sectionErrors > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                    {sectionErrors} error{sectionErrors > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field) => {
                  const err = errors[field.name];
                  const isFocused = activeField === field.name;
                  const baseInputClass = `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    err
                      ? "border-rose-400 focus:ring-rose-500"
                      : isFocused
                      ? "border-indigo-500 focus:ring-indigo-500"
                      : "border-slate-300 focus:ring-indigo-500"
                  }`;

                  return (
                    <div key={field.name} className="space-y-1">
                      <label
                        htmlFor={field.name}
                        className="flex items-center justify-between text-xs font-semibold text-slate-700"
                      >
                        <span>
                          {field.label}
                          {field.required && <span className="text-rose-500 ml-1">*</span>}
                        </span>
                        {isFocused && (
                          <span className="text-[10px] font-medium text-indigo-600">
                            Tracking focus
                          </span>
                        )}
                      </label>

                      {field.type === "select" ? (
                        <select
                          id={field.name}
                          name={field.name}
                          value={values[field.name]}
                          onFocus={() => handleFieldFocus(field.name)}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}
                          aria-invalid={Boolean(err)}
                          className={baseInputClass}
                        >
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={field.name}
                          name={field.name}
                          type={field.type}
                          placeholder={field.placeholder || ""}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={values[field.name]}
                          onFocus={() => handleFieldFocus(field.name)}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}
                          aria-invalid={Boolean(err)}
                          className={baseInputClass}
                        />
                      )}

                      {err ? (
                        <p className="text-xs text-rose-600 font-medium">{err}</p>
                      ) : (
                        field.helpText && (
                          <p className="text-[11px] text-slate-500">{field.helpText}</p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Form Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors"
          >
            Clear All Fields
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            Validate & Submit Application
          </button>
        </div>
      </form>
    </div>
  );
}

