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

  const handleTelemetryTrigger = (snapshot) => {
    console.log(
      `[Telemetry] 🚨 Cognitive Load Threshold Exceeded (${snapshot.cognitiveLoadScore} >= ${currentThreshold}) at "${snapshot.activeField}". Morphing UI...`
    );

    generationStartTimeRef.current = Date.now();
    setGenerationTiming(null);

    setShowSimplifyingOverlay(true);

    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    startGeneration({ activeField: snapshot.activeField });

    overlayTimerRef.current = setTimeout(() => {
      setShowSimplifyingOverlay(false);
      setViewMode("loading");
    }, 1200);
  };

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
              {latestComponent?.code ? (
                <DynamicRenderer
                  code={latestComponent.code}
                  initialValues={sharedFormValues}
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
              ) : (
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
              )}
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
