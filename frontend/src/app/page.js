"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTelemetry } from "../hooks/useTelemetry";
import TelemetryHUD from "../components/TelemetryHUD";
import FinancialForm from "../components/FinancialForm";
import ConversationalWizard from "../components/ConversationalWizard";
import SimplifyingOverlay from "../components/SimplifyingOverlay";
import GeneratedCodeDrawer from "../components/GeneratedCodeDrawer";
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

export default function AuraGenDemoPage() {
  const [activeField, setActiveField] = useState("annualIncome");
  const [receivedComponents, setReceivedComponents] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState(DEFAULT_THRESHOLD);

  // UI Morphing & Loading State: "form" | "loading" | "wizard" | "fallback-template"
  const [viewMode, setViewMode] = useState("form");
  const [showSimplifyingOverlay, setShowSimplifyingOverlay] = useState(false);
  const [sharedFormValues, setSharedFormValues] = useState(() => createInitialFormValues());
  const [wizardKey, setWizardKey] = useState(0);

  // Fallback states & pre-built template storage
  const [activeFallbackTemplate, setActiveFallbackTemplate] = useState(null);
  const [fallbackNotification, setFallbackNotification] = useState(null);

  const overlayTimerRef = useRef(null);
  const loadingTimerRef = useRef(null);

  const sessionId = useMemo(() => {
    return `sess_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const {
    status: wsStatus,
    isConnected,
    reconnectAttempt,
    sendTelemetry,
    sendRevert,
    onMessage,
    reconnect
  } = useWebSocket(WS_URL);

  /**
   * Revert back to original form with zero data loss.
   * Requirements met:
   * 1. Reverts without page refresh.
   * 2. Preserves all previously entered and modified values.
   * 3. Dispatches WebSocket revert message per shared protocol.
   * 4. Animates back with Framer Motion.
   */
  const handleRevertToOriginalForm = useCallback(() => {
    // Requirement 8: Notify backend of revert via WebSocket protocol
    sendRevert(sessionId, sharedFormValues);

    // Cancel in-flight timers
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    setShowSimplifyingOverlay(false);
    setActiveFallbackTemplate(null);

    // Requirement 2: Switch to original form without page reload
    setViewMode("form");

    // Requirement 7: User-friendly notification confirming data preservation
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
    handleMessage: handleFallbackMessage,
    handleConnectionFailure
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

    // Requirement 2: Display short "Simplifying this for you..." overlay before morphing
    setShowSimplifyingOverlay(true);

    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    // Requirement 3: Start 4-second generation timeout
    startGeneration({ activeField: snapshot.activeField });

    // Keep overlay visible for 1.2s then transition to graceful loading skeleton
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
    simulationMode,
    startConfusionSimulation,
    startCalmSimulation,
    stopSimulation,
    exportTelemetryCSV,
    triggerSimulatedFriction,
    resetTelemetry
  } = useTelemetry({
    sessionId,
    activeField,
    threshold: currentThreshold,
    streamIntervalMs: 1000,
    cooldownMs: 60000,
    minInteractions: 2,
    isConnected,
    sendTelemetry,
    onThreshold: handleTelemetryTrigger
  });

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  // Listen for WebSocket replies ({ type: "component", code }, validation_failed, fallback, error)
  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "connected" && typeof msg.threshold === "number") {
        setCurrentThreshold(msg.threshold);
      }

      // Route message to fallback coordinator
      handleFallbackMessage(msg);

      if (msg.type === "component" && typeof msg.code === "string") {
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

  const latestComponent = receivedComponents[0] || null;

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Telemetry HUD Cockpit */}
      <TelemetryHUD
        wsStatus={wsStatus}
        reconnectAttempt={reconnectAttempt}
        onReconnect={reconnect}
        telemetrySnapshot={telemetrySnapshot}
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
      />

      {/* Requirement 1: Visible Persistent "Back to Original Form" Button when simplified mode is active */}
      <AnimatePresence>
        {viewMode !== "form" && (
          <motion.div
            key="persistent-back-bar"
            variants={slideInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="sticky top-4 z-40 mb-4 flex items-center justify-between bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-200">Simplified Assistance Active</span>
              <span className="hidden sm:inline text-slate-400">• Form state synchronized</span>
            </div>
            <button
              type="button"
              onClick={handleRevertToOriginalForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
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
            className={`mb-6 p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-sm ${
              fallbackNotification.type === "template"
                ? "bg-amber-50 border-amber-200 text-amber-950"
                : "bg-slate-100 border-slate-300 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-lg">
                {fallbackNotification.type === "template" ? "⚡" : "🛡️"}
              </span>
              <div>
                <strong className="font-semibold block sm:inline mr-1">
                  {fallbackNotification.title}:
                </strong>
                <span className="text-slate-600">{fallbackNotification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFallbackNotification(null)}
              className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requirement 2: Short "Simplifying this for you..." overlay */}
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
            className="mb-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm"
          >
            <div className="text-sm text-indigo-950">
              <strong className="font-semibold">
                AuraGen Self-Healing Payload Received!
              </strong>{" "}
              <span className="text-indigo-800">
                Backend code-gen generated a conversational assistant for{" "}
                <code className="font-mono text-xs bg-indigo-100 px-1.5 py-0.5 rounded font-bold">
                  {activeField}
                </code>
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors"
            >
              Inspect Generated Code ({latestComponent.code.length} chars)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        Requirements 1-8:
        - Reserved min-height container (min-h-[620px]) to prevent layout jumps
        - AnimatePresence mode="wait" for non-overlapping transitions
        - Original form fades in and animates back using revertMorphVariant
        - Preserves all entered values bidirectionally (sharedFormValues passed to FinancialForm)
        - Clean restoration without page refresh
      */}
      <div className="relative min-h-[620px]">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GeneratedCodeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        componentData={latestComponent}
      />
    </main>
  );
}
