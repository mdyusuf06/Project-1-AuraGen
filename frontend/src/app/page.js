"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTelemetry } from "../hooks/useTelemetry";
import TelemetryHUD from "../components/TelemetryHUD";
import FinancialForm from "../components/FinancialForm";
import EnterpriseJobForm from "../components/EnterpriseJobForm";
import PortalScenarioSwitcher from "../components/PortalScenarioSwitcher";
import ConversationalWizard from "../components/ConversationalWizard";
import SimplifyingOverlay from "../components/SimplifyingOverlay";
import SimulatedCursorOverlay from "../components/SimulatedCursorOverlay";
import GeneratedCodeDrawer from "../components/GeneratedCodeDrawer";
import DynamicRenderer from "../components/DynamicRenderer";
import TelemetryDebugPanel from "../components/TelemetryDebugPanel";
import {
  ErrorBoundary,
  WizardLoadingSkeleton,
  useGenerationFallback,
  getFallbackTemplate
} from "../fallback";
import {
  AnimatePresence,
  motion,
  slideInUp,
  originalFormMorphVariant,
  wizardMorphVariant,
  revertMorphVariant
} from "../animation";
import { createInitialFormValues } from "../data/financialFormSchema";
import { createInitialInfosysValues } from "../data/infosysFormSchema";
import {
  extractFormSchemaFromDOM,
  maskSensitivePII,
  unmaskSensitivePII
} from "../utils/domExtractor";

const DEFAULT_THRESHOLD = Number(process.env.NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD || 60);
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

/**
 * High-fidelity fallback dynamic wizard component code string.
 * Styled in clean white/slate with emerald accents for instant morphing.
 */
export const DEMO_DEFAULT_CODE = `
import React, { useState } from "react";
import { Card, Button, Input, Select, Badge, StepProgress } from "DS";

export default function DynamicAuraGenWizard({ initialValues = {}, onChange, onSubmit, onCancel }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: initialValues.fullName || "",
    email: initialValues.email || "",
    dateOfBirth: initialValues.dateOfBirth || "",
    employmentStatus: initialValues.employmentStatus || "full_time",
    annualIncome: initialValues.annualIncome || "",
    monthlyNetIncome: initialValues.monthlyNetIncome || "",
    incomeVerificationType: initialValues.incomeVerificationType || "w2",
    ...initialValues
  });

  const steps = [
    { id: 0, title: "Personal Verification" },
    { id: 1, title: "Employment & Income" },
    { id: 2, title: "Review & Submit" }
  ];

  const handleFieldChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    if (typeof onChange === "function") {
      onChange(updated);
    }
  };

  const isDone = (v) => v !== undefined && v !== null && String(v).trim() !== "";

  return (
    <Card className="w-full max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-900 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="emerald">AuraGen Simplified Wizard</Badge>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              State Synced
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Step {step + 1} of {steps.length} • {steps[step].title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Focused multi-step flow preserving all 21 application fields seamlessly.
          </p>
        </div>
        {typeof onCancel === "function" && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            ← View Full Form
          </Button>
        )}
      </div>

      <StepProgress steps={steps} currentStep={step} />

      <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 text-xs sm:text-sm text-slate-700 flex items-start gap-3">
        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
          ✓
        </span>
        <div>
          <strong className="font-semibold text-slate-900 block mb-0.5">
            Guided Assistance Active
          </strong>
          <span>
            Each section is broken into clean, focused fields. Any changes here sync immediately back to your full application.
          </span>
        </div>
      </div>

      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Full Legal Name</span>
              {isDone(formData.fullName) && <span className="text-xs font-bold text-emerald-600">✓</span>}
            </div>
            <Input
              id="wiz_fullName"
              name="fullName"
              value={formData.fullName}
              onChange={(e) => handleFieldChange("fullName", e.target.value)}
              placeholder="e.g. Jordan Alexander Mercer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Email Address</span>
              {isDone(formData.email) && <span className="text-xs font-bold text-emerald-600">✓</span>}
            </div>
            <Input
              id="wiz_email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Date of Birth</span>
              {isDone(formData.dateOfBirth) && <span className="text-xs font-bold text-emerald-600">✓</span>}
            </div>
            <Input
              id="wiz_dob"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="wiz_employmentStatus"
            name="employmentStatus"
            label="Employment Status"
            value={formData.employmentStatus}
            onChange={(e) => handleFieldChange("employmentStatus", e.target.value)}
            options={[
              { value: "full_time", label: "Full-Time Employed" },
              { value: "self_employed", label: "Self-Employed / Business Owner" },
              { value: "contract", label: "Contract / Freelance" },
              { value: "retired", label: "Retired / Pension" }
            ]}
          />

          <Select
            id="wiz_incomeVerification"
            name="incomeVerificationType"
            label="Income Verification Method"
            value={formData.incomeVerificationType}
            onChange={(e) => handleFieldChange("incomeVerificationType", e.target.value)}
            options={[
              { value: "w2", label: "W-2 Form (Standard Employee)" },
              { value: "tax_return", label: "Federal Tax Returns (2 Years)" },
              { value: "bank_statements", label: "12-Month Bank Statements" },
              { value: "paystubs", label: "Recent Pay Stubs" }
            ]}
          />

          <Input
            id="wiz_annualIncome"
            name="annualIncome"
            type="number"
            label="Gross Annual Income ($)"
            value={formData.annualIncome}
            onChange={(e) => handleFieldChange("annualIncome", e.target.value)}
            placeholder="e.g. 145000"
          />

          <Input
            id="wiz_monthlyNetIncome"
            name="monthlyNetIncome"
            type="number"
            label="Monthly Net Take-Home Pay ($)"
            value={formData.monthlyNetIncome}
            onChange={(e) => handleFieldChange("monthlyNetIncome", e.target.value)}
            placeholder="e.g. 8200"
          />
        </div>
      )}

      {step === 2 && (
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 text-xs">
          <div className="font-bold uppercase tracking-wider text-emerald-700 border-b border-slate-200/70 pb-2">
            Application Summary • Ready to Submit
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Applicant</span>
              <span className="font-semibold text-slate-900">{formData.fullName || "Not provided"}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employment Status</span>
              <span className="font-semibold text-slate-900">{formData.employmentStatus}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gross Annual Income</span>
              <span className="font-semibold text-emerald-700">
                {formData.annualIncome ? "$" + Number(formData.annualIncome).toLocaleString() : "Not provided"}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Monthly Take-Home</span>
              <span className="font-semibold text-slate-900">
                {formData.monthlyNetIncome ? "$" + Number(formData.monthlyNetIncome).toLocaleString() : "Not provided"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ← Back
          </Button>
        ) : (
          <div />
        )}

        {step < steps.length - 1 ? (
          <Button variant="success" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
            Continue →
          </Button>
        ) : (
          <Button variant="success" onClick={() => (onSubmit ? onSubmit(formData) : null)}>
            Complete & Submit ✓
          </Button>
        )}
      </div>
    </Card>
  );
}
`;

export const INFOSYS_DEMO_CODE = `
import React, { useState } from "react";
import { Card, Button, Input, Select, Badge, StepProgress } from "DS";

export default function DynamicInfosysCareerWizard({ initialValues = {}, onChange, onSubmit, onCancel }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: initialValues.fullName || "",
    email: initialValues.email || "",
    panNumber: initialValues.panNumber || "",
    totalExperienceYears: initialValues.totalExperienceYears || "",
    noticePeriodDays: initialValues.noticePeriodDays || "90",
    buyoutEligible: initialValues.buyoutEligible || "negotiable",
    uanNumber: initialValues.uanNumber || "",
    cgpaScore: initialValues.cgpaScore || "",
    preferredLocation: initialValues.preferredLocation || "bengaluru_ec",
    ...initialValues
  });

  const steps = [
    { id: 0, title: "Candidate Profile" },
    { id: 1, title: "Notice & Compliance" },
    { id: 2, title: "Review & Submit" }
  ];

  const handleFieldChange = (field, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      if (onChange) onChange(updated);
      return updated;
    });
  };

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Infosys Career Assistant</Badge>
            <span className="text-xs text-emerald-700 font-medium">HR & BGV Simplified</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
            Guided Enterprise Onboarding Wizard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Simplified from the 18-field Infosys Career Portal with PII shield & lossless sync.
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            ← View Full 18-Field Portal
          </Button>
        )}
      </div>

      <StepProgress steps={steps} currentStep={step} />

      {step === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="inf_fullName"
            name="fullName"
            label="Candidate Full Name"
            value={formData.fullName}
            onChange={(e) => handleFieldChange("fullName", e.target.value)}
            placeholder="e.g. Aarav Sharma"
          />
          <Input
            id="inf_email"
            name="email"
            type="email"
            label="Primary Email Address"
            value={formData.email}
            onChange={(e) => handleFieldChange("email", e.target.value)}
            placeholder="e.g. aarav@example.com"
          />
          <Input
            id="inf_exp"
            name="totalExperienceYears"
            type="number"
            label="Total IT Experience (Years)"
            value={formData.totalExperienceYears}
            onChange={(e) => handleFieldChange("totalExperienceYears", e.target.value)}
            placeholder="e.g. 5.5"
          />
          <Select
            id="inf_loc"
            name="preferredLocation"
            label="Preferred Development Center"
            value={formData.preferredLocation}
            onChange={(e) => handleFieldChange("preferredLocation", e.target.value)}
            options={[
              { value: "bengaluru_ec", label: "Bengaluru Electronic City SEZ" },
              { value: "hyderabad_sez", label: "Hyderabad Pocharam SEZ" },
              { value: "pune_hinjewadi", label: "Pune Hinjewadi Phase II" },
              { value: "chennai_sholinganallur", label: "Chennai Mahindra City" }
            ]}
          />
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="inf_notice"
            name="noticePeriodDays"
            label="Official Notice Period"
            value={formData.noticePeriodDays}
            onChange={(e) => handleFieldChange("noticePeriodDays", e.target.value)}
            options={[
              { value: "0", label: "Immediate Joiner" },
              { value: "30", label: "30 Days" },
              { value: "60", label: "60 Days" },
              { value: "90", label: "90 Days (Standard Enterprise)" }
            ]}
          />
          <Select
            id="inf_buyout"
            name="buyoutEligible"
            label="Notice Period Buyout Status"
            value={formData.buyoutEligible}
            onChange={(e) => handleFieldChange("buyoutEligible", e.target.value)}
            options={[
              { value: "negotiable", label: "Negotiable with Current Employer" },
              { value: "yes_employer", label: "Yes — Buyout Allowed" },
              { value: "no_mandatory", label: "No — Full Notice Mandatory" }
            ]}
          />
          <Input
            id="inf_uan"
            name="uanNumber"
            label="12-Digit EPFO UAN ID"
            value={formData.uanNumber}
            onChange={(e) => handleFieldChange("uanNumber", e.target.value)}
            placeholder="100987654321"
          />
          <Input
            id="inf_cgpa"
            name="cgpaScore"
            type="number"
            label="Final CGPA (0 - 10 Scale)"
            value={formData.cgpaScore}
            onChange={(e) => handleFieldChange("cgpaScore", e.target.value)}
            placeholder="e.g. 8.6"
          />
        </div>
      )}

      {step === 2 && (
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 text-xs">
          <div className="font-bold uppercase tracking-wider text-emerald-700 border-b border-slate-200/70 pb-2">
            Infosys Career Application Summary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Candidate</span>
              <span className="font-semibold text-slate-900">{formData.fullName || "Not provided"}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Notice & Buyout</span>
              <span className="font-semibold text-emerald-700">{formData.noticePeriodDays} days ({formData.buyoutEligible})</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ← Back
          </Button>
        ) : (
          <div />
        )}

        {step < steps.length - 1 ? (
          <Button variant="success" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
            Continue →
          </Button>
        ) : (
          <Button variant="success" onClick={() => (onSubmit ? onSubmit(formData) : null)}>
            Submit Application ✓
          </Button>
        )}
      </div>
    </Card>
  );
}
`;

/**
 * Fluid, non-jarring morph transitions for AuraGen self-healing UI.
 */
const bannerVariants = {
  initial: { opacity: 0, y: -16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.97,
    transition: { duration: 0.25, ease: "easeIn" }
  }
};

export default function AuraGenDemoPage() {
  const [activePortal, setActivePortal] = useState("infotact-finance-v1");
  const [activeField, setActiveField] = useState("annualIncome");
  const [formContext, setFormContext] = useState({});
  const [receivedComponents, setReceivedComponents] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState(DEFAULT_THRESHOLD);

  // Dual-Engine Privacy Mode ("cloud" | "ollama") & AST Audit diagnostics
  const [privacyMode, setPrivacyMode] = useState("cloud");
  const [maskedPiiCount, setMaskedPiiCount] = useState(0);
  const [streamProgress, setStreamProgress] = useState(0);
  const [astAudit, setAstAudit] = useState(null);
  const [extractedFieldCount, setExtractedFieldCount] = useState(21);
  const piiVaultRef = useRef({});

  // UI Morphing & Loading State: "form" | "loading" | "wizard" | "fallback-template"
  const [viewMode, setViewMode] = useState("form");
  const [showSimplifyingOverlay, setShowSimplifyingOverlay] = useState(false);
  const [portalValuesMap, setPortalValuesMap] = useState(() => ({
    "infotact-finance-v1": createInitialFormValues(),
    "infosys-career-v1": createInitialInfosysValues()
  }));
  const sharedFormValues = portalValuesMap[activePortal] || {};
  const setSharedFormValues = useCallback(
    (updater) => {
      setPortalValuesMap((prev) => {
        const current = prev[activePortal] || {};
        const nextValues = typeof updater === "function" ? updater(current) : updater;
        return {
          ...prev,
          [activePortal]: nextValues
        };
      });
    },
    [activePortal]
  );
  const [wizardKey, setWizardKey] = useState(0);

  // Accessibility & Diagnostics States
  const [ariaAnnouncement, setAriaAnnouncement] = useState("Commercial Credit application initialized.");
  const [generationTiming, setGenerationTiming] = useState(null);
  const [cachedStatus, setCachedStatus] = useState(null);

  // Fallback states & pre-built template storage
  const [activeFallbackTemplate, setActiveFallbackTemplate] = useState(null);
  const [fallbackNotification, setFallbackNotification] = useState(null);

  const overlayTimerRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const generationStartTimeRef = useRef(null);
  const cardRegionRef = useRef(null);

  const [sessionId, setSessionId] = useState("sess_initializing");

  useEffect(() => {
    setSessionId(`sess_${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  // Re-scan live DOM schema whenever portal scenario or active field changes
  useEffect(() => {
    if (viewMode !== "form" || typeof document === "undefined") return;
    const formEl = document.querySelector(`[data-auragen-form="${activePortal}"]`);
    const snapshot = extractFormSchemaFromDOM(
      formEl,
      sharedFormValues,
      formContext?.errors || {},
      activeField,
      activePortal
    );
    if (snapshot.extractedCount > 0) {
      setExtractedFieldCount(snapshot.extractedCount);
    }
  }, [activePortal, activeField, viewMode, sharedFormValues, formContext]);

  const {
    status: wsStatus,
    isConnected,
    reconnectAttempt,
    nextReconnectDelayMs,
    sendTelemetry,
    sendGenerateRequest,
    sendRevert,
    onMessage,
    reconnect
  } = useWebSocket(WS_URL);

  /**
   * Revert back to original form with zero data loss.
   */
  const handleRevertToOriginalForm = useCallback(() => {
    sendRevert(sessionId, sharedFormValues);

    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    setShowSimplifyingOverlay(false);
    setActiveFallbackTemplate(null);
    setStreamProgress(0);
    setViewMode("form");

    const countLabel = activePortal === "infosys-career-v1" ? "18-field Infosys Career" : "21-field financial";
    setFallbackNotification({
      type: "restored",
      title: "Original Form Restored",
      message: `Returned to the full ${countLabel} application. All your previously entered and updated details have been preserved.`
    });
  }, [sendRevert, sessionId, sharedFormValues, activePortal]);

  // Generation fallback manager with 4-second timeout & validation failure recovery
  const {
    isGenerating,
    startGeneration,
    cancelGeneration,
    resetFallback,
    handleMessage: handleFallbackMessage
  } = useGenerationFallback({
    timeoutMs: 4000,
    wsStatus,
    isConnected,
    onFallback: (state) => {
      console.log("[Fallback] Pre-built template fallback activated:", state);
      setActiveFallbackTemplate(() => state.templateComponent);
      setViewMode("fallback-template");
      setFallbackNotification({
        type: "template",
        title:
          state.reason === "timeout"
            ? "4-Second Generation Timeout"
            : state.reason === "validation_failed"
            ? "Validation Security Filter"
            : "Fallback Activated",
        message: state.message
      });
    },
    onRestoreOriginal: (state) => {
      console.log("[Fallback] Restoring original form (template unavailable):", state);
      handleRevertToOriginalForm();
    },
    onSuccess: () => {
      console.log("[Fallback] Generation succeeded, timeout cancelled.");
      setActiveFallbackTemplate(null);
      setViewMode("wizard");
    }
  });

  const handlePortalScenarioChange = useCallback((nextPortal) => {
    setActivePortal(nextPortal);
    setViewMode("form");
    setActiveFallbackTemplate(null);
    setFallbackNotification(null);
    setStreamProgress(0);
    setActiveField(
      nextPortal === "infosys-career-v1" ? "noticePeriodDays" : "annualIncome"
    );
    setAriaAnnouncement(
      nextPortal === "infosys-career-v1"
        ? "Switched to Infosys Enterprise Career Portal (18-field form)."
        : "Switched to Infotact Financial Underwriting Portal (21-field form)."
    );
  }, []);

  const handleTelemetryTrigger = useCallback(
    (snapshot) => {
      const defaultField = activePortal === "infosys-career-v1" ? "noticePeriodDays" : "annualIncome";
      const targetField = snapshot?.activeField || activeField || defaultField;
      const triggerScore =
        typeof snapshot?.cognitiveLoadScore === "number"
          ? snapshot.cognitiveLoadScore
          : 88;

      console.log(
        `[Telemetry] 🚨 Cognitive Load Threshold Exceeded (${triggerScore} >= ${currentThreshold}) at "${targetField}" [${activePortal}]. Morphing UI and triggering generate_request...`
      );

      generationStartTimeRef.current = Date.now();
      setGenerationTiming(null);
      setStreamProgress(8);
      setShowSimplifyingOverlay(true);

      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

      const formEl =
        typeof document !== "undefined"
          ? document.querySelector(`[data-auragen-form="${activePortal}"]`)
          : null;
      const domSchema = extractFormSchemaFromDOM(
        formEl,
        sharedFormValues,
        formContext?.errors || {},
        targetField,
        activePortal
      );
      if (domSchema.extractedCount > 0) {
        setExtractedFieldCount(domSchema.extractedCount);
      }

      const { maskedValues, piiVault, maskedCount } = maskSensitivePII(sharedFormValues);
      piiVaultRef.current = { ...piiVaultRef.current, ...piiVault };
      setMaskedPiiCount(maskedCount);

      startGeneration({ activeField: targetField });

      // Trigger WebSocket generate_request payload to backend LLM pipeline (with masked PII + extracted DOM schema)
      sendGenerateRequest({
        sessionId,
        activeField: targetField,
        formId: activePortal,
        privacyMode,
        userInput: maskedValues,
        formStateSnapshot: snapshot?.formStateSnapshot
          ? {
              ...snapshot.formStateSnapshot,
              values: maskSensitivePII(snapshot.formStateSnapshot.values || sharedFormValues).maskedValues
            }
          : {
              formValues: maskedValues,
              activeField: targetField,
              timestamp: Date.now()
            },
        score: triggerScore,
        domContext: {
          activeField: targetField,
          activeFieldId: targetField,
          completedFieldsCount: Object.values(sharedFormValues).filter(Boolean).length,
          totalFieldsCount: domSchema.extractedCount || (activePortal === "infosys-career-v1" ? 18 : 21),
          validationErrors: domSchema.validationErrors || formContext?.errors || {}
        },
        formFields:
          domSchema.fields.length > 0 ? domSchema.fields : Object.keys(maskedValues)
      });

      overlayTimerRef.current = setTimeout(() => {
        setShowSimplifyingOverlay(false);
        setViewMode("loading");
      }, 950);
    },
    [
      activeField,
      activePortal,
      currentThreshold,
      formContext,
      privacyMode,
      sendGenerateRequest,
      sessionId,
      sharedFormValues,
      startGeneration
    ]
  );

  const {
    metrics,
    normalizedMetrics,
    score,
    rawScore,
    threshold,
    isFrustrated,
    isTriggered,
    isCooldownActive,
    cooldownRemaining,
    hasMinimumActivity,
    telemetrySnapshot,
    telemetryHistory,
    analyticsSummary,
    simulationMode,
    subscribeTrajectory,
    startConfusionSimulation,
    startCalmSimulation,
    stopSimulation,
    exportTelemetryCSV,
    triggerSimulatedFriction,
    resetTelemetry
  } = useTelemetry({
    sessionId,
    activeField,
    formContext,
    threshold: currentThreshold,
    streamIntervalMs: 1000,
    cooldownMs: 60000,
    minInteractions: 2,
    isConnected,
    sendTelemetry,
    onThreshold: handleTelemetryTrigger
  });

  // Mid-Project Demo Helpers: Manual trigger & Judge toggle
  const handleManualGenerateRequest = useCallback(() => {
    handleTelemetryTrigger({
      cognitiveLoadScore: Math.max(score, 88),
      activeField: activeField || "annualIncome",
      formStateSnapshot: {
        formValues: sharedFormValues,
        activeField: activeField || "annualIncome",
        timestamp: Date.now()
      }
    });
  }, [activeField, handleTelemetryTrigger, score, sharedFormValues]);

  const handleToggleViewMode = useCallback(() => {
    if (viewMode === "form") {
      setViewMode("wizard");
      setAriaAnnouncement("Switched to dynamic AI-generated UI wizard.");
    } else {
      handleRevertToOriginalForm();
    }
  }, [viewMode, handleRevertToOriginalForm]);

  // Memoized DynamicRenderer handlers to prevent keystroke lag & parent re-render loops
  const handleDynamicChange = useCallback(
    (vals) => {
      const restored = unmaskSensitivePII(vals, piiVaultRef.current);
      setSharedFormValues((prev) => ({ ...prev, ...restored }));
    },
    [setSharedFormValues]
  );

  const handleDynamicSubmit = useCallback(
    (data) => {
      const restored = unmaskSensitivePII(data, piiVaultRef.current);
      console.log("[AuraGen] Dynamic Form Submitted successfully:", restored);
      setSharedFormValues((prev) => ({ ...prev, ...restored }));
      alert("Application submitted successfully via AuraGen Generative Wizard!");
      handleRevertToOriginalForm();
    },
    [handleRevertToOriginalForm, setSharedFormValues]
  );

  const handleDynamicRetry = useCallback(() => {
    setWizardKey((prev) => prev + 1);
    startGeneration({ activeField });
    setViewMode("loading");
  }, [activeField, startGeneration]);

  const dynamicFallbackElement = useMemo(
    () => (
      <ErrorBoundary
        key={wizardKey}
        onRestoreOriginal={handleRevertToOriginalForm}
        onRetry={handleDynamicRetry}
      >
        <ConversationalWizard
          activeField={activeField}
          initialValues={sharedFormValues}
          onUpdateValues={handleDynamicChange}
          onRestoreOriginal={handleRevertToOriginalForm}
          score={score}
        />
      </ErrorBoundary>
    ),
    [wizardKey, activeField, sharedFormValues, score, handleRevertToOriginalForm, handleDynamicRetry, handleDynamicChange]
  );

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (viewMode === "form") {
      setAriaAnnouncement("Returned to standard 21-field financial application. All entered values have been preserved.");
    } else if (viewMode === "loading") {
      setAriaAnnouncement("Preparing your simplified conversational assistant. Please wait.");
    } else if (viewMode === "wizard") {
      setAriaAnnouncement(`Form simplified into a guided 2-step assistant for ${activeField}. Focus moved to assistant.`);
    } else if (viewMode === "fallback-template") {
      setAriaAnnouncement("Pre-built verified assistance template activated. Focus moved to assistant.");
    }

    const focusTimer = setTimeout(() => {
      if (cardRegionRef.current) {
        cardRegionRef.current.focus({ preventScroll: true });
      }
    }, 80);

    return () => clearTimeout(focusTimer);
  }, [viewMode, activeField]);

  // Listen for WebSocket replies ({ type: "component", code }, component_chunk, validation_failed, fallback, error)
  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "connected" && typeof msg.threshold === "number") {
        setCurrentThreshold(msg.threshold);
      }

      if (msg.type === "component_chunk") {
        const pct =
          typeof msg.totalChunks === "number" && msg.totalChunks > 0
            ? Math.round((msg.chunkIndex / msg.totalChunks) * 100)
            : 50;
        setStreamProgress((prev) => Math.max(prev, pct));
        return;
      }

      handleFallbackMessage(msg);

      if (msg.type === "component" && typeof msg.code === "string") {
        if (generationStartTimeRef.current) {
          const durationMs = Date.now() - generationStartTimeRef.current;
          setGenerationTiming({
            durationMs,
            requestedAt: generationStartTimeRef.current,
            completedAt: Date.now()
          });
        }
        if (typeof msg.cached === "boolean") {
          setCachedStatus(msg.cached);
        }
        if (msg.astAudit && typeof msg.astAudit === "object") {
          setAstAudit(msg.astAudit);
        }
        setStreamProgress(100);

        setReceivedComponents((prev) => [
          {
            code: msg.code,
            formId: msg.formId || activePortal,
            privacyMode: msg.privacyMode || privacyMode,
            astAudit: msg.astAudit || null,
            cached: Boolean(msg.cached),
            generationMs: typeof msg.generationMs === "number" ? msg.generationMs : null,
            receivedAt: Date.now()
          },
          ...prev
        ]);
        setViewMode("wizard");
      }
    });

    return unsubscribe;
  }, [onMessage, handleFallbackMessage, activePortal, privacyMode]);

  const handleManualReset = () => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    cancelGeneration();
    resetFallback();
    setShowSimplifyingOverlay(false);
    setFallbackNotification(null);
    setActiveFallbackTemplate(null);
    setViewMode("form");
    resetTelemetry();
  };

  const handleSimulateValidationFailed = () => {
    startGeneration({ activeField });
    setViewMode("loading");
    setTimeout(() => {
      handleFallbackMessage({
        type: "validation_failed",
        errors: [{ rule: "no-eval", message: "Banned syntax eval() detected by security validator." }]
      });
    }, 400);
  };

  const handleSimulateTimeout = () => {
    startGeneration({ activeField });
    setViewMode("loading");
  };

  const latestComponent =
    receivedComponents.find((c) => !c.formId || c.formId === activePortal) || null;
  const fallbackDemoCode =
    activePortal === "infosys-career-v1" ? INFOSYS_DEMO_CODE : DEMO_DEFAULT_CODE;

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Screen Reader ARIA Live Region for UI Transitions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaAnnouncement}
      </div>

      {/* Telemetry HUD Cockpit */}
      <TelemetryHUD
        sessionId={sessionId}
        wsStatus={wsStatus}
        reconnectAttempt={reconnectAttempt}
        nextReconnectDelayMs={nextReconnectDelayMs}
        onReconnect={reconnect}
        telemetrySnapshot={telemetrySnapshot}
        subscribeTrajectory={subscribeTrajectory}
        telemetryHistory={telemetryHistory}
        simulationMode={simulationMode}
        onSimulateConfused={startConfusionSimulation}
        onSimulateCalm={startCalmSimulation}
        onStopSimulation={stopSimulation}
        onExportCSV={exportTelemetryCSV}
        threshold={currentThreshold}
        onThresholdChange={setCurrentThreshold}
        onSimulateSpike={() =>
          triggerSimulatedFriction(
            activeField || (activePortal === "infosys-career-v1" ? "noticePeriodDays" : "annualIncome"),
            88
          )
        }
        onResetTelemetry={handleManualReset}
        receivedComponentCount={receivedComponents.length}
        onOpenCodeDrawer={() => setIsDrawerOpen(true)}
        analyticsSummary={analyticsSummary}
        privacyMode={privacyMode}
        onPrivacyModeChange={setPrivacyMode}
        maskedPiiCount={maskedPiiCount}
        astAudit={astAudit}
      />

      {/* Universal Enterprise Portal Scenario Switcher */}
      <PortalScenarioSwitcher
        activeScenario={activePortal}
        onSelectScenario={handlePortalScenarioChange}
        extractedFieldCount={extractedFieldCount}
        disabled={viewMode !== "form"}
      />

      {/* Unified Status Bar when simplified assistance is active */}
      <AnimatePresence>
        {viewMode !== "form" ? (
          <motion.div
            key="unified-wizard-bar"
            variants={slideInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="sticky top-4 z-40 mb-6 flex flex-wrap items-center justify-between gap-3 bg-white/95 text-slate-900 px-5 py-3.5 rounded-2xl border border-emerald-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-900">Simplified Assistance Active</span>
              <span className="text-emerald-700 font-medium">• State synchronized</span>
              {latestComponent && (
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activeField} • {latestComponent.code.length} chars
                  {latestComponent.cached ? " • CACHE HIT" : ""}
                </span>
              )}
              {astAudit && astAudit.passed && (
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-50 text-emerald-700 border border-slate-200">
                  AST {astAudit.parseTimeMs}ms • {astAudit.nodesInspected} nodes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRevertToOriginalForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:outline-none"
                title="Return to the full enterprise form (preserves all data)"
              >
                <span>← View Full Form</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
              >
                Inspect Code
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-lg">
                {activePortal === "infosys-career-v1" ? "💼" : "⚖️"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Interactive Controls
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                    {activePortal === "infosys-career-v1"
                      ? `DOM Extracted: ${extractedFieldCount}-Field Infosys HR Form`
                      : `DOM Extracted: ${extractedFieldCount}-Field Financial Form`}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Preview the live morph between the {activePortal === "infosys-career-v1" ? "Infosys Career Portal" : "FinancialForm"} and the AST-verified DynamicRenderer wizard.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleViewMode}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Toggle between static form and dynamic generated UI"
              >
                <span>✨ Preview Wizard</span>
              </button>
              <button
                type="button"
                onClick={handleManualGenerateRequest}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
                title="Trigger WebSocket generate_request"
              >
                ⚡ Trigger AI Morph
              </button>
              {latestComponent && (
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                >
                  Inspect Code
                </button>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Fallback Notification Banner */}
      <AnimatePresence>
        {fallbackNotification && (
          <motion.div
            key="fallback-notification-banner"
            variants={slideInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`mb-6 p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-sm bg-white ${
              fallbackNotification.type === "template"
                ? "border-amber-200 text-amber-900"
                : "border-emerald-200 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="text-lg">
                {fallbackNotification.type === "template" ? "⚡" : "🛡️"}
              </span>
              <div>
                <strong className="font-semibold block sm:inline mr-1 text-slate-900">
                  {fallbackNotification.title}:
                </strong>
                <span className="text-slate-600">{fallbackNotification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFallbackNotification(null)}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Short "Simplifying this for you..." overlay */}
      <AnimatePresence>
        {showSimplifyingOverlay && (
          <SimplifyingOverlay
            activeField={activeField}
            onDismiss={() => {
              setShowSimplifyingOverlay(false);
              setViewMode("loading");
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Card Area with smooth Framer Motion layout height & fade morph */}
      <motion.div
        ref={cardRegionRef}
        tabIndex={-1}
        layout
        transition={{ type: "spring", stiffness: 250, damping: 30 }}
        className="relative min-h-[540px] focus:outline-none"
      >
        <AnimatePresence mode="wait">
          {viewMode === "form" ? (
            <motion.div
              key="original-complex-form"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 250, damping: 30 }}
              layout
              className="w-full"
            >
              {activePortal === "infosys-career-v1" ? (
                <EnterpriseJobForm
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  onFormContextChange={setFormContext}
                  onFormValuesChange={setSharedFormValues}
                  initialValues={sharedFormValues}
                  formValues={sharedFormValues}
                />
              ) : (
                <FinancialForm
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  onFormContextChange={setFormContext}
                  onFormValuesChange={setSharedFormValues}
                  initialValues={sharedFormValues}
                  formValues={sharedFormValues}
                />
              )}
            </motion.div>
          ) : viewMode === "loading" ? (
            <motion.div
              key="wizard-loading-skeleton"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 250, damping: 30 }}
              layout
              className="w-full"
            >
              <WizardLoadingSkeleton
                activeField={activeField}
                loadingMessage="Preparing your simplified form..."
                streamProgress={streamProgress}
                onCancel={handleRevertToOriginalForm}
              />
            </motion.div>
          ) : viewMode === "fallback-template" && activeFallbackTemplate ? (
            <motion.div
              key="fallback-template-wizard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 250, damping: 30 }}
              layout
              className="w-full"
            >
              {React.createElement(activeFallbackTemplate, {
                activeField,
                initialValues: sharedFormValues,
                onUpdateValues: handleDynamicChange,
                onRestoreOriginal: handleRevertToOriginalForm,
                onSubmitWizard: handleDynamicSubmit
              })}
            </motion.div>
          ) : (
            <motion.div
              key="simplified-conversational-wizard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 250, damping: 30 }}
              layout
              className="w-full"
            >
              <DynamicRenderer
                code={latestComponent?.code || fallbackDemoCode}
                initialValues={unmaskSensitivePII(sharedFormValues, piiVaultRef.current)}
                onChange={handleDynamicChange}
                onSubmit={handleDynamicSubmit}
                onCancel={handleRevertToOriginalForm}
                fallback={dynamicFallbackElement}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <GeneratedCodeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        componentData={latestComponent || { code: fallbackDemoCode, receivedAt: null }}
      />

      {/* Live Simulation Floating Feedback HUD */}
      <SimulatedCursorOverlay
        simulationMode={simulationMode}
        score={score}
        threshold={currentThreshold}
        onStopSimulation={stopSimulation}
      />

      {/* Development Telemetry Debug Cockpit (Collapsible floating panel) */}
      <TelemetryDebugPanel
        score={score}
        rawScore={rawScore}
        threshold={currentThreshold}
        uiMode={viewMode}
        generationTiming={generationTiming}
        cachedStatus={cachedStatus}
        fallbackStatus={fallbackNotification}
        activeField={activeField}
        metrics={metrics}
        isGenerating={isGenerating}
        onResetTelemetry={handleManualReset}
        onSimulateTimeout={handleSimulateTimeout}
        onSimulateValidationFailure={handleSimulateValidationFailed}
      />
    </main>
  );
}
