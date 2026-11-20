"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FINANCIAL_FORM_SECTIONS,
  ALL_FORM_FIELDS,
  createInitialFormValues,
  validateField,
  validateAllFields
} from "../data/financialFormSchema";

/**
 * Actively serializes the user's current form inputs and DOM context into a formStateSnapshot object.
 * Complies strictly with the backend Zod FormStateSnapshotSchema for Contextual Awareness.
 */
export function serializeFormStateSnapshot(values = {}, meta = {}) {
  const cleanValues = {};

  for (const field of ALL_FORM_FIELDS) {
    const rawVal = values[field.name];
    cleanValues[field.name] = rawVal !== undefined && rawVal !== null ? rawVal : "";
  }

  for (const [key, val] of Object.entries(values)) {
    if (!(key in cleanValues) && val !== undefined) {
      cleanValues[key] = val !== null ? val : "";
    }
  }

  const completedFields = Object.keys(cleanValues).filter(
    (k) => cleanValues[k] !== "" && cleanValues[k] !== null && cleanValues[k] !== undefined
  );

  return {
    capturedAt: Date.now(),
    values: cleanValues,
    completedFields,
    completedCount: completedFields.length,
    totalFieldsCount: ALL_FORM_FIELDS.length,
    domContext: {
      activeFieldId: meta.activeFieldId || meta.activeField || "",
      activeFieldLabel: meta.activeFieldLabel || meta.activeField || "",
      activeSectionId: meta.activeSectionId || "",
      focusedFieldId: meta.focusedFieldId || null,
      hoveredFieldId: meta.hoveredFieldId || null,
      completedFieldsCount: completedFields.length,
      totalFieldsCount: ALL_FORM_FIELDS.length,
      validationErrors: meta.errors ? { ...meta.errors } : {},
      scrollY: typeof window !== "undefined" ? Math.round(window.scrollY || 0) : 0
    }
  };
}

export default function FinancialForm({
  activeField,
  onActiveFieldChange,
  onFormContextChange,
  initialValues = {}
}) {
  const [values, setValues] = useState(() => ({
    ...createInitialFormValues(),
    ...(initialValues || {})
  }));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submittedData, setSubmittedData] = useState(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusedFieldId, setFocusedFieldId] = useState(null);
  const [hoveredFieldId, setHoveredFieldId] = useState(null);

  const hoverThrottleRef = useRef(0);

  const completedCount = useMemo(() => {
    return ALL_FORM_FIELDS.filter((f) => {
      const v = values[f.name];
      return v !== "" && v !== null && v !== undefined;
    }).length;
  }, [values]);

  const progressPercentage = Math.round((completedCount / ALL_FORM_FIELDS.length) * 100);
  const errorCount = Object.keys(errors).length;

  const activeFieldMeta = useMemo(() => {
    const field = ALL_FORM_FIELDS.find((f) => f.name === activeField);
    return field
      ? {
          activeFieldId: field.name,
          activeFieldLabel: field.label,
          activeSectionId: field.section
        }
      : {
          activeFieldId: activeField || "",
          activeFieldLabel: activeField || "",
          activeSectionId: ""
        };
  }, [activeField]);

  // Synchronize telemetry hook with serialized form snapshot + active errors
  useEffect(() => {
    const snapshot = serializeFormStateSnapshot(values, {
      ...activeFieldMeta,
      focusedFieldId,
      hoveredFieldId,
      errors
    });

    onFormContextChange?.({
      values,
      errors,
      totalFieldsCount: ALL_FORM_FIELDS.length,
      completedFieldsCount: completedCount,
      hoveredFieldId,
      focusedFieldId,
      formStateSnapshot: snapshot,
      ...activeFieldMeta
    });
  }, [
    values,
    errors,
    completedCount,
    hoveredFieldId,
    focusedFieldId,
    activeFieldMeta,
    onFormContextChange
  ]);

  const handleFieldFocus = (fieldName) => {
    setFocusedFieldId(fieldName);
    onActiveFieldChange?.(fieldName);
  };

  const handleFieldMouseMove = (fieldName) => {
    const now = Date.now();
    if (now - hoverThrottleRef.current < 250) return;
    hoverThrottleRef.current = now;

    if (hoveredFieldId !== fieldName) {
      setHoveredFieldId(fieldName);
    }
    if (!focusedFieldId && activeField !== fieldName) {
      onActiveFieldChange?.(fieldName);
    }
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);

    // Instant validation on keystroke so errors feed into telemetry immediately
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
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    setFocusedFieldId((prev) => (prev === name ? null : prev));
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
  };

  const handleReset = () => {
    const empty = createInitialFormValues();
    setValues(empty);
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setSubmittedData(null);
  };

  return (
    <div className="w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Commercial Solvency Application
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Schedule v2.4
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Disclosure & Solvency Application
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Please complete the verification schedule below. The application continuously adapts
            if cognitive difficulty or validation friction is sustained.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Completed Disclosures</div>
            <div className="text-sm font-bold text-slate-800">
              {completedCount} / {ALL_FORM_FIELDS.length}{" "}
              <span className="text-xs text-emerald-600 font-normal">({progressPercentage}%)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillSample}
            className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
          >
            Prefill Sample Data
          </button>
        </div>
      </div>

      {/* Validation Errors Notice */}
      {errorCount > 0 && (
        <div className="mt-5 p-4 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>
              <strong>{errorCount} field{errorCount > 1 ? "s" : ""} require attention:</strong> Please correct the highlighted entries below.
            </span>
          </div>
        </div>
      )}

      {/* Submission Success Notice */}
      {submittedData && (
        <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div>
            <strong>Application Validated Successfully.</strong> All 21 disclosures verified against solvency criteria.
          </div>
        </div>
      )}

      {/* Form Sections */}
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-7">
        {FINANCIAL_FORM_SECTIONS.map((section) => {
          const sectionErrors = section.fields.filter((f) => errors[f.name]).length;

          return (
            <section
              key={section.id}
              className="bg-slate-50/60 rounded-xl p-6 border border-slate-200/80 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800">
                    {section.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
                </div>
                {sectionErrors > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                    {sectionErrors} error{sectionErrors > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field) => {
                  const err = errors[field.name];
                  const isFocused = activeField === field.name;

                  return (
                    <div
                      key={field.name}
                      onMouseMove={() => handleFieldMouseMove(field.name)}
                      className="space-y-1.5"
                    >
                      <label
                        htmlFor={field.name}
                        className={`flex items-center justify-between text-xs font-medium ${
                          err ? "text-rose-600" : isFocused ? "text-emerald-700" : "text-slate-700"
                        }`}
                      >
                        <span>
                          {field.label}
                          {field.required && <span className="text-emerald-600 ml-1">*</span>}
                        </span>
                        {err ? (
                          <span className="text-[11px] font-semibold text-rose-600">Invalid</span>
                        ) : isFocused ? (
                          <span className="text-[11px] font-medium text-emerald-600">Active</span>
                        ) : null}
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
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-normal bg-white border text-slate-800 transition-colors ${
                            err
                              ? "border-rose-300 ring-2 ring-rose-500/10"
                              : isFocused
                              ? "border-emerald-500 ring-2 ring-emerald-500/15"
                              : "border-slate-300 hover:border-slate-400"
                          }`}
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
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-normal bg-white border text-slate-800 placeholder:text-slate-400 transition-colors ${
                            err
                              ? "border-rose-300 ring-2 ring-rose-500/10"
                              : isFocused
                              ? "border-emerald-500 ring-2 ring-emerald-500/15"
                              : "border-slate-300 hover:border-slate-400"
                          }`}
                        />
                      )}

                      {err ? (
                        <p className="text-[11px] text-rose-600 font-medium">{err}</p>
                      ) : (
                        field.helpText && (
                          <p className="text-[11px] text-slate-400">{field.helpText}</p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Form Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 text-xs font-medium rounded-xl bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Clear Application
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
          >
            Validate & Submit Disclosures
          </button>
        </div>
      </form>
    </div>
  );
}
