"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  INFOSYS_FORM_SECTIONS,
  ALL_INFOSYS_FIELDS,
  createInitialInfosysValues,
  validateInfosysField,
  validateAllInfosysFields
} from "../data/infosysFormSchema";
import { serializeFormStateSnapshot } from "./FinancialForm";

export default function EnterpriseJobForm({
  activeField,
  onActiveFieldChange,
  onFormContextChange,
  onFormValuesChange,
  initialValues = null,
  formValues = null
}) {
  const [values, setValues] = useState(() => {
    const base = createInitialInfosysValues();
    const incoming = formValues || initialValues;
    return incoming ? { ...base, ...incoming } : base;
  });

  useEffect(() => {
    const incoming = formValues || initialValues;
    if (!incoming) return;
    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [k, v] of Object.entries(incoming)) {
        const normalized = v !== undefined && v !== null ? v : "";
        if (next[k] !== normalized) {
          next[k] = normalized;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [formValues, initialValues]);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submittedData, setSubmittedData] = useState(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusedFieldId, setFocusedFieldId] = useState(null);
  const [hoveredFieldId, setHoveredFieldId] = useState(null);
  const hoverThrottleRef = useRef(0);

  const completedCount = useMemo(() => {
    return ALL_INFOSYS_FIELDS.filter((f) => {
      const v = values[f.name];
      return v !== "" && v !== null && v !== undefined;
    }).length;
  }, [values]);

  const errorCount = Object.keys(errors).length;

  const activeFieldMeta = useMemo(() => {
    const field = ALL_INFOSYS_FIELDS.find((f) => f.name === activeField);
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

  const onFormValuesChangeRef = useRef(onFormValuesChange);
  onFormValuesChangeRef.current = onFormValuesChange;

  const onFormContextChangeRef = useRef(onFormContextChange);
  onFormContextChangeRef.current = onFormContextChange;

  useEffect(() => {
    const snapshot = serializeFormStateSnapshot(values, {
      ...activeFieldMeta,
      focusedFieldId,
      hoveredFieldId,
      errors
    });
    snapshot.totalFieldsCount = ALL_INFOSYS_FIELDS.length;
    snapshot.domContext.totalFieldsCount = ALL_INFOSYS_FIELDS.length;

    onFormValuesChangeRef.current?.(values);
    onFormContextChangeRef.current?.({
      formId: "infosys-career-v1",
      values,
      errors,
      totalFieldsCount: ALL_INFOSYS_FIELDS.length,
      completedFieldsCount: completedCount,
      hoveredFieldId,
      focusedFieldId,
      formStateSnapshot: snapshot,
      ...activeFieldMeta
    });
  }, [values, errors, completedCount, hoveredFieldId, focusedFieldId, activeFieldMeta]);

  const handleFieldFocus = (fieldName) => {
    setFocusedFieldId(fieldName);
    onActiveFieldChange?.(fieldName);
  };

  const handleFieldMouseMove = (fieldName) => {
    const now = Date.now();
    if (now - hoverThrottleRef.current < 250) return;
    hoverThrottleRef.current = now;

    if (hoveredFieldId !== fieldName) setHoveredFieldId(fieldName);
    if (!focusedFieldId && activeField !== fieldName) onActiveFieldChange?.(fieldName);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);

    if (touched[name] || submitAttempted) {
      const err = validateInfosysField(name, value, nextValues);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];
        return next;
      });
    }
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    setFocusedFieldId((prev) => (prev === name ? null : prev));
    setTouched((prev) => ({ ...prev, [name]: true }));

    const err = validateInfosysField(name, value, values);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const allTouched = {};
    for (const f of ALL_INFOSYS_FIELDS) allTouched[f.name] = true;
    setTouched(allTouched);

    const result = validateAllInfosysFields(values);
    setErrors(result.errors);
    if (!result.isValid) {
      setSubmittedData(null);
      const firstErrorField = Object.keys(result.errors)[0];
      if (firstErrorField) onActiveFieldChange?.(firstErrorField);
      return;
    }
    setSubmittedData(values);
  };

  const handleFillSample = () => {
    setValues({
      ...createInitialInfosysValues(),
      fullName: "Aarav Vikram Sharma",
      email: "aarav.sharma@enterprise.dev",
      phone: "9876543210",
      uanEpfoId: "100987654321",
      highestDegree: "btech_be",
      cgpaRaw: "8.45",
      cgpaConversionFormula: "ugc_minus_half",
      graduationYear: "2021"
    });
    setErrors({});
  };

  const handleReset = () => {
    setValues(createInitialInfosysValues());
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setSubmittedData(null);
  };

  return (
    <div
      data-auragen-form="infosys-career-v1"
      className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden"
    >
      {/* Portal Header */}
      <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
            Infosys Enterprise Career Portal • Senior AI / Full-Stack Engineer
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Corporate Candidate & BGV Onboarding Form
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete all {ALL_INFOSYS_FIELDS.length} compliance fields across {INFOSYS_FORM_SECTIONS.length} legacy sections. Autonomous DOM extraction syncs every input.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Completion</div>
            <div className="text-sm font-bold text-emerald-600">
              {completedCount} / {ALL_INFOSYS_FIELDS.length} fields
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillSample}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-xs font-semibold text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition-colors shadow-sm"
          >
            Prefill Candidate Data
          </button>
        </div>
      </div>

      {submitAttempted && errorCount > 0 && (
        <div className="mx-6 mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <strong className="font-semibold">
            Submission blocked: {errorCount} field{errorCount > 1 ? "s" : ""} require correction.
          </strong>{" "}
          Please review the highlighted sections below.
        </div>
      )}

      {submittedData && (
        <div className="mx-6 mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
          <strong className="font-semibold block">
            Candidate profile validated for Infosys Launchpad BGV!
          </strong>
          <span className="text-xs text-emerald-700">
            All {ALL_INFOSYS_FIELDS.length} corporate compliance fields passed verification.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-8">
        {INFOSYS_FORM_SECTIONS.map((section) => {
          const sectionErrors = section.fields.filter((f) => errors[f.name]).length;
          return (
            <section
              key={section.id}
              data-section-id={section.id}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {section.fields.map((field) => {
                  const err = errors[field.name];
                  const isFocused = activeField === field.name;
                  const baseInputClass = `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    err
                      ? "border-rose-400 focus:ring-rose-500/40"
                      : isFocused
                      ? "border-emerald-500 focus:ring-emerald-500/40"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/30"
                  }`;

                  return (
                    <div
                      key={field.name}
                      data-field-wrapper={field.name}
                      onMouseMove={() => handleFieldMouseMove(field.name)}
                      className="space-y-1.5 p-2 -m-2 rounded-xl transition-colors hover:bg-emerald-50/30"
                    >
                      <label
                        htmlFor={field.name}
                        className="flex items-center justify-between text-xs font-semibold text-slate-700"
                      >
                        <span>
                          {field.label}
                          {field.required && <span className="text-rose-500 ml-1">*</span>}
                        </span>
                        {isFocused && (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            Active focus
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
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            Validate & Submit Infosys Application
          </button>
        </div>
      </form>
    </div>
  );
}
