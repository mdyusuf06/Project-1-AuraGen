"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTelemetry } from "../hooks/useTelemetry";
import TelemetryHUD from "../components/TelemetryHUD";
import FinancialForm from "../components/FinancialForm";
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

const DEFAULT_THRESHOLD = Number(process.env.NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD || 70);
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

/**
 * High-fidelity fallback dynamic wizard component code string.
 * Used for instant judge demo toggling or offline demonstration.
 */
export const DEMO_DEFAULT_CODE = `
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Select, Badge } from "DS";

export default function DynamicAuraGenWizard({ initialValues = {}, onChange, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    annualIncome: initialValues.annualIncome || "145000",
    loanAmount: initialValues.loanAmount || "350000",
    businessType: initialValues.businessType || "llc",
    loanPurpose: initialValues.loanPurpose || "expansion"
  });

  const handleChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    if (typeof onChange === "function") {
      onChange(updated);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto p-6 md:p-8 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl text-white space-y-6">
      <CardHeader className="border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="indigo">Dynamic UI Injected</Badge>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                safeCompiler • In-Browser Babel Transpile
              </span>
            </div>
            <CardTitle className="text-xl font-bold text-white">
              AI-Generated Credit Streamlining Wizard
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Form dynamically converted from static 21-field grid into high-conversion guided workflow.
            </CardDescription>
          </div>
          <span className="text-3xl">✨</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="dyn_annualIncome"
            name="annualIncome"
            label="Annual Business Revenue ($)"
            value={formData.annualIncome}
            onChange={(e) => handleChange("annualIncome", e.target.value)}
            placeholder="e.g. 150000"
            className="text-white"
          />

          <Input
            id="dyn_loanAmount"
            name="loanAmount"
            label="Requested Loan Amount ($)"
            value={formData.loanAmount}
            onChange={(e) => handleChange("loanAmount", e.target.value)}
            placeholder="e.g. 350000"
            className="text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="dyn_businessType"
            name="businessType"
            label="Entity Structure"
            value={formData.businessType}
            onChange={(e) => handleChange("businessType", e.target.value)}
            options={[
              { value: "llc", label: "Limited Liability Company (LLC)" },
              { value: "c_corp", label: "C-Corporation" },
              { value: "s_corp", label: "S-Corporation" },
              { value: "sole_prop", label: "Sole Proprietorship" }
            ]}
          />

          <Select
            id="dyn_loanPurpose"
            name="loanPurpose"
            label="Intended Capital Allocation"
            value={formData.loanPurpose}
            onChange={(e) => handleChange("loanPurpose", e.target.value)}
            options={[
              { value: "expansion", label: "Business Expansion" },
              { value: "working_capital", label: "Working Capital" },
              { value: "equipment", label: "Equipment Purchase" },
              { value: "refinancing", label: "Debt Refinancing" }
            ]}
          />
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="text-slate-300 hover:text-white border-slate-700 bg-slate-800 text-xs"
        >
          ← Restore Original Form
        </Button>

        <Button
          variant="primary"
          onClick={() => (onSubmit ? onSubmit(formData) : alert("Application Submitted!"))}
          className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 px-5 py-2.5"
        >
          Submit Commercial Application →
        </Button>
      </CardFooter>
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
  const [activeField, setActiveField] = useState("annualIncome");
  const [formContext, setFormContext] = useState({});
  const [receivedComponents, setReceivedComponents] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState(DEFAULT_THRESHOLD);

  // UI Morphing & Loading State: "form" | "loading" | "wizard" | "fallback-template"
  const [viewMode, setViewMode] = useState("form");
  const [showSimplifyingOverlay, setShowSimplifyingOverlay] = useState(false);
  const [sharedFormValues, setSharedFormValues] = useState(() => createInitialFormValues());
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

  const sessionId = useMemo(() => {
    return `sess_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

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
    setViewMode("form");

    setFallbackNotification({
      type: "restored",
      title: "Original Form Restored",
      message: "Returned to the full 21-field application. All your previously entered and updated details have been preserved."
    });
  }, [sendRevert, sessionId, sharedFormValues]);

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

  const handleTelemetryTrigger = useCallback(
    (snapshot) => {
      const targetField = snapshot?.activeField || activeField || "annualIncome";
      const triggerScore =
        typeof snapshot?.cognitiveLoadScore === "number"
          ? snapshot.cognitiveLoadScore
          : 88;

      console.log(
        `[Telemetry] 🚨 Cognitive Load Threshold Exceeded (${triggerScore} >= ${currentThreshold}) at "${targetField}". Morphing UI and triggering generate_request...`
      );

      generationStartTimeRef.current = Date.now();
      setGenerationTiming(null);

      setShowSimplifyingOverlay(true);

      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

      startGeneration({ activeField: targetField });

      // Trigger WebSocket generate_request payload to backend LLM pipeline
      sendGenerateRequest({
        sessionId,
        activeField: targetField,
        userInput: sharedFormValues,
        formStateSnapshot: snapshot?.formStateSnapshot || {
          formValues: sharedFormValues,
          activeField: targetField,
          timestamp: Date.now()
        },
        score: triggerScore,
        domContext: { activeField: targetField },
        formFields: Object.keys(sharedFormValues)
      });

      overlayTimerRef.current = setTimeout(() => {
        setShowSimplifyingOverlay(false);
        setViewMode("loading");
      }, 1200);
    },
    [activeField, currentThreshold, sendGenerateRequest, sessionId, sharedFormValues, startGeneration]
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

  // Trigger WebSocket generate_request when useTelemetry score crosses threshold (>= 70)
  const previousScoreRef = useRef(score);
  useEffect(() => {
    const prev = previousScoreRef.current;
    previousScoreRef.current = score;

    if (score >= currentThreshold && prev < currentThreshold && viewMode === "form" && !isGenerating) {
      console.log(`[Integration] Telemetry score crossed threshold (${score} >= ${currentThreshold}). Dispatching generate_request.`);
      handleTelemetryTrigger({
        cognitiveLoadScore: score,
        activeField: activeField || "annualIncome",
        formStateSnapshot: {
          formValues: sharedFormValues,
          activeField: activeField || "annualIncome",
          timestamp: Date.now()
        }
      });
    }
  }, [score, currentThreshold, viewMode, isGenerating, activeField, sharedFormValues, handleTelemetryTrigger]);

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

  // Listen for WebSocket replies ({ type: "component", code }, validation_failed, fallback, error)
  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "connected" && typeof msg.threshold === "number") {
        setCurrentThreshold(msg.threshold);
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

        setReceivedComponents((prev) => [
          {
            code: msg.code,
            receivedAt: Date.now()
          },
          ...prev
        ]);
        setViewMode("wizard");
      }
    });

    return unsubscribe;
  }, [onMessage, handleFallbackMessage]);

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

  const latestComponent = receivedComponents[0] || null;

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
        onSimulateSpike={() => triggerSimulatedFriction(activeField || "annualIncome", 88)}
        onResetTelemetry={handleManualReset}
        receivedComponentCount={receivedComponents.length}
        onOpenCodeDrawer={() => setIsDrawerOpen(true)}
        analyticsSummary={analyticsSummary}
      />

      {/* Persistent "Back to Original Form" Bar when simplified mode is active */}
      <AnimatePresence>
        {viewMode !== "form" && (
          <motion.div
            key="persistent-back-bar"
            variants={slideInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="sticky top-4 z-40 mb-4 flex items-center justify-between bg-[#11172A]/95 text-white px-5 py-3 rounded-2xl border border-indigo-500/30 shadow-[0_0_30px_rgba(128,87,255,0.2)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#38D9A9] shadow-[0_0_8px_#38D9A9] animate-pulse" />
              <span className="font-extrabold text-white">Simplified Assistance Active</span>
              <span className="hidden sm:inline text-indigo-300">• State fully synchronized</span>
            </div>
            <button
              type="button"
              onClick={handleRevertToOriginalForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8057FF] to-[#25D9E8] hover:opacity-95 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              title="Return to the complete 21-field financial form (preserves all data)"
            >
              <span>← Back to Original Form</span>
            </button>
          </motion.div>
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
            className={`mb-6 p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-xl ${
              fallbackNotification.type === "template"
                ? "bg-[#11172A]/90 border-amber-500/40 text-amber-200"
                : "bg-[#11172A]/90 border-slate-700 text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-lg">
                {fallbackNotification.type === "template" ? "⚡" : "🛡️"}
              </span>
              <div>
                <strong className="font-semibold block sm:inline mr-1 text-white">
                  {fallbackNotification.title}:
                </strong>
                <span className="text-slate-300">{fallbackNotification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFallbackNotification(null)}
              className="px-3 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400"
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

      {/* Self-Healing Banner */}
      <AnimatePresence>
        {latestComponent && (
          <motion.div
            key="self-healing-banner"
            variants={slideInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mb-6 bg-[#11172A]/90 border border-indigo-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_25px_rgba(128,87,255,0.15)] backdrop-blur-xl"
          >
            <div className="text-sm text-slate-200">
              <strong className="font-bold text-white">
                AuraGen Self-Healing Payload Received!
              </strong>{" "}
              <span className="text-indigo-300">
                Backend code-gen generated a conversational assistant for{" "}
                <code className="font-mono text-xs bg-indigo-950 px-1.5 py-0.5 rounded font-bold text-cyan-300 border border-indigo-500/30">
                  {activeField}
                </code>{" "}
                ({latestComponent.code.length} chars) with preserved form state.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === "form" ? "wizard" : "form"))}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-sm"
              >
                {viewMode === "form" ? "Switch to Dynamic Wizard" : "View Standard 21-Field Form"}
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all shadow-md focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Inspect Code
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mid-Project Judge Demo Toolbar */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-[#11172A]/95 to-slate-900/95 border border-indigo-500/30 shadow-[0_0_25px_rgba(128,87,255,0.15)] backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-600/30">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Judge Demo Controls
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 font-mono">
                {viewMode === "form" ? "Static 21-Field Form" : "DynamicRenderer (Evaluated UI)"}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Mid-project demo: Manually switch between the static FinancialForm and dynamically evaluated DynamicRenderer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleViewMode}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md focus-visible:ring-2 focus-visible:ring-cyan-400 flex items-center gap-2 ${
              viewMode === "form"
                ? "bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/30 scale-[1.02]"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
            title="Toggle between static form and dynamic generated UI"
          >
            <span>{viewMode === "form" ? "✨ Switch to Generated UI" : "📋 Switch to Static Form"}</span>
          </button>

          {viewMode === "form" && (
            <button
              type="button"
              onClick={handleManualGenerateRequest}
              className="px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-cyan-300 border border-indigo-500/40 text-xs font-semibold transition-all hover:scale-[1.01]"
              title="Simulate friction breach (>= 70) and trigger WebSocket generate_request"
            >
              ⚡ Trigger LLM Generate
            </button>
          )}
        </div>
      </div>

      {/* Main Card Area with reserved min-height to prevent CLS */}
      <div
        ref={cardRegionRef}
        tabIndex={-1}
        className="relative min-h-[620px] focus:outline-none"
      >
        <AnimatePresence mode="wait">
          {viewMode === "form" ? (
            <motion.div
              key="original-complex-form"
              layoutId="auragen-form-card"
              variants={revertMorphVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
              className="w-full"
            >
              <FinancialForm
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                onFormContextChange={setFormContext}
                onFormValuesChange={setSharedFormValues}
                initialValues={sharedFormValues}
                formValues={sharedFormValues}
              />
            </motion.div>
          ) : viewMode === "loading" ? (
            <motion.div
              key="wizard-loading-skeleton"
              layoutId="auragen-form-card"
              variants={wizardMorphVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
              className="w-full"
            >
              <WizardLoadingSkeleton
                activeField={activeField}
                loadingMessage="Preparing your simplified form..."
                onCancel={handleRevertToOriginalForm}
              />
            </motion.div>
          ) : viewMode === "fallback-template" && activeFallbackTemplate ? (
            <motion.div
              key="fallback-template-wizard"
              layoutId="auragen-form-card"
              variants={wizardMorphVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
              className="w-full"
            >
              {React.createElement(activeFallbackTemplate, {
                activeField,
                initialValues: sharedFormValues,
                onUpdateValues: (vals) => setSharedFormValues((prev) => ({ ...prev, ...vals })),
                onRestoreOriginal: handleRevertToOriginalForm,
                onSubmitWizard: (vals) => {
                  setSharedFormValues((prev) => ({ ...prev, ...vals }));
                  handleRevertToOriginalForm();
                }
              })}
            </motion.div>
          ) : (
            <motion.div
              key="simplified-conversational-wizard"
              layoutId="auragen-form-card"
              variants={wizardMorphVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
              className="w-full"
            >
              <DynamicRenderer
                code={latestComponent?.code || DEMO_DEFAULT_CODE}
                initialValues={sharedFormValues}
                onChange={(vals) => setSharedFormValues((prev) => ({ ...prev, ...vals }))}
                onSubmit={(data) => {
                  console.log("[AuraGen] Dynamic Form Submitted successfully:", data);
                  setSharedFormValues((prev) => ({ ...prev, ...data }));
                  alert("Application submitted successfully via AuraGen Generative Wizard!");
                  handleRevertToOriginalForm();
                }}
                onCancel={handleRevertToOriginalForm}
                fallback={
                  <ErrorBoundary
                    key={wizardKey}
                    onRestoreOriginal={handleRevertToOriginalForm}
                    onRetry={() => {
                      setWizardKey((prev) => prev + 1);
                      startGeneration({ activeField });
                      setViewMode("loading");
                    }}
                  >
                    <ConversationalWizard
                      activeField={activeField}
                      initialValues={sharedFormValues}
                      onUpdateValues={(vals) => setSharedFormValues((prev) => ({ ...prev, ...vals }))}
                      onRestoreOriginal={handleRevertToOriginalForm}
                      score={score}
                    />
                  </ErrorBoundary>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GeneratedCodeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        componentData={latestComponent}
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
