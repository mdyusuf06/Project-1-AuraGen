"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTelemetry } from "../hooks/useTelemetry";
import TelemetryHUD from "../components/TelemetryHUD";
import FinancialForm from "../components/FinancialForm";
import ConversationalWizard from "../components/ConversationalWizard";
import SimplifyingOverlay from "../components/SimplifyingOverlay";
import GeneratedCodeDrawer from "../components/GeneratedCodeDrawer";
import {
  AnimatePresence,
  motion,
  slideInUp,
  originalFormMorphVariant,
  wizardMorphVariant
} from "../animation";
import { createInitialFormValues } from "../data/financialFormSchema";

const DEFAULT_THRESHOLD = Number(process.env.NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD || 70);
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

export default function AuraGenDemoPage() {
  const [activeField, setActiveField] = useState("annualIncome");
  const [receivedComponents, setReceivedComponents] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState(DEFAULT_THRESHOLD);

  // UI Morphing State: "form" (original 21-field form) vs "wizard" (generated simplified assistant)
  const [viewMode, setViewMode] = useState("form");
  const [showSimplifyingOverlay, setShowSimplifyingOverlay] = useState(false);
  const [sharedFormValues, setSharedFormValues] = useState(() => createInitialFormValues());

  const overlayTimerRef = useRef(null);

  const sessionId = useMemo(() => {
    return `sess_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const {
    status: wsStatus,
    isConnected,
    reconnectAttempt,
    sendTelemetry,
    onMessage,
    reconnect
  } = useWebSocket(WS_URL);

  const handleTelemetryTrigger = (snapshot) => {
    console.log(
      `[Telemetry] 🚨 Cognitive Load Threshold Exceeded (${snapshot.cognitiveLoadScore} >= ${currentThreshold}) at "${snapshot.activeField}". Morphing UI...`
    );

    // Requirement 2: Display short "Simplifying this for you..." overlay before morphing
    setShowSimplifyingOverlay(true);

    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
    }

    // Keep overlay visible for 1.3s then smoothly morph into conversational wizard
    overlayTimerRef.current = setTimeout(() => {
      setViewMode("wizard");
      setShowSimplifyingOverlay(false);
    }, 1300);
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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
      }
    };
  }, []);

  // Listen for WebSocket replies ({ type: "component", code }, "connected", "error")
  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "connected" && typeof msg.threshold === "number") {
        setCurrentThreshold(msg.threshold);
      }

      if (msg.type === "component" && typeof msg.code === "string") {
        setReceivedComponents((prev) => [
          {
            code: msg.code,
            receivedAt: Date.now()
          },
          ...prev
        ]);
      }
    });

    return unsubscribe;
  }, [onMessage]);

  const handleManualReset = () => {
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
    }
    setShowSimplifyingOverlay(false);
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

      {/* Requirement 2: Short "Simplifying this for you..." overlay */}
      <AnimatePresence>
        {showSimplifyingOverlay && (
          <SimplifyingOverlay
            activeField={activeField}
            onDismiss={() => {
              setShowSimplifyingOverlay(false);
              setViewMode("wizard");
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
                Backend code-gen generated a conversational assistant for <code className="font-mono text-xs bg-indigo-100 px-1.5 py-0.5 rounded font-bold">{activeField}</code>.
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
        Requirements 3, 4, 5, 6, 7, 8, 9:
        - Reserved min-height container (min-h-[620px]) to prevent layout jumps
        - AnimatePresence mode="wait" for non-overlapping transitions
        - Original form fades out and scales down (350ms, within 300-400ms)
        - Wizard fades in and slides into view with a fluid spring animation
        - Shared layout transition via layoutId="auragen-form-card"
        - Zero page refresh
      */}
      <div className="relative min-h-[620px]">
        <AnimatePresence mode="wait">
          {viewMode === "form" ? (
            <motion.div
              key="original-complex-form"
              layoutId="auragen-form-card"
              variants={originalFormMorphVariant}
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
              />
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
              <ConversationalWizard
                activeField={activeField}
                initialValues={sharedFormValues}
                onUpdateValues={(vals) => setSharedFormValues((prev) => ({ ...prev, ...vals }))}
                onRestoreOriginal={() => setViewMode("form")}
                score={score}
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
    </main>
  );
}