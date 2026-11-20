"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTelemetry } from "../hooks/useTelemetry";
import TelemetryHUD from "../components/TelemetryHUD";
import FinancialForm from "../components/FinancialForm";
import GeneratedCodeDrawer from "../components/GeneratedCodeDrawer";
import DynamicUIRenderer from "../components/DynamicUIRenderer";

const THRESHOLD = Number(process.env.NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD || 60);
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

/**
 * 120fps silky smooth transition:
 * Fade out original form (opacity: 0, y: -10)
 * Fade in generated wizard (opacity: 1, y: 0) using gentle spring physics (stiffness: 250, damping: 30).
 */
const smoothMorphVariants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.99
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 250,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export default function AuraGenDemoPage() {
  const [activeField, setActiveField] = useState("annualIncome");
  const [formContext, setFormContext] = useState({});
  const [receivedComponents, setReceivedComponents] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [serverThreshold, setServerThreshold] = useState(THRESHOLD);
  const [isDynamicMode, setIsDynamicMode] = useState(false);

  const sessionId = useMemo(() => {
    return `sess_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const {
    status: wsStatus,
    isConnected,
    reconnectAttempt,
    nextReconnectDelayMs,
    sendTelemetry,
    onMessage,
    reconnect
  } = useWebSocket(WS_URL);

  const {
    telemetrySnapshot,
    subscribeTrajectory,
    triggerSimulatedFriction,
    resetTelemetry
  } = useTelemetry({
    sessionId,
    activeField,
    formContext,
    threshold: serverThreshold,
    streamIntervalMs: 750,
    isConnected,
    sendTelemetry,
    onThreshold: (snapshot) => {
      console.log(
        `[Telemetry] 🎯 Rolling Cognitive Load Threshold Reached (${snapshot.cognitiveLoadScore} >= ${serverThreshold}) at "${snapshot.activeField}".`
      );
    }
  });

  // Listen for WebSocket replies ({ type: "component", code }, "connected", "error")
  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "connected" && typeof msg.threshold === "number") {
        setServerThreshold(msg.threshold);
      }

      if (msg.type === "component" && typeof msg.code === "string") {
        console.log(
          `[AuraGen] ⚡ Received component from server (${msg.code.length} chars). Smoothly morphing UI!`
        );
        setReceivedComponents((prev) => [
          {
            code: msg.code,
            receivedAt: Date.now()
          },
          ...prev
        ]);
        setIsDynamicMode(true);
      }
    });

    return unsubscribe;
  }, [onMessage]);

  const latestComponent = receivedComponents[0] || null;

  // Memoized initial values snapshot for the wizard so parent re-renders don't reset inputs
  const initialWizardValues = useMemo(() => {
    return formContext?.values || formContext || {};
  }, [latestComponent?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWizardSubmit = useCallback((data) => {
    console.log("[AuraGen] Dynamic Form Submitted successfully:", data);
    setFormContext((prev) => ({
      ...prev,
      values: { ...(prev?.values || {}), ...data }
    }));
    alert("Application submitted successfully via AuraGen Simplified Wizard!");
    setIsDynamicMode(false);
  }, []);

  const handleWizardChange = useCallback((updatedValues) => {
    setFormContext((prev) => ({
      ...prev,
      values: { ...(prev?.values || {}), ...updatedValues }
    }));
  }, []);

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* 1. Top Minimalist Dashboard */}
      <TelemetryHUD
        sessionId={sessionId}
        wsStatus={wsStatus}
        reconnectAttempt={reconnectAttempt}
        nextReconnectDelayMs={nextReconnectDelayMs}
        onReconnect={reconnect}
        telemetrySnapshot={telemetrySnapshot}
        subscribeTrajectory={subscribeTrajectory}
        threshold={serverThreshold}
        onSimulateSpike={() => triggerSimulatedFriction(activeField || "annualIncome", 82, true)}
        onResetTelemetry={resetTelemetry}
        receivedComponentCount={receivedComponents.length}
        onOpenCodeDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Morph Active Notice */}
      <AnimatePresence>
        {latestComponent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-emerald-200/90 shadow-sm"
          >
            <div className="flex items-center space-x-3 text-sm text-slate-800">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </span>
              <div>
                <strong className="font-semibold text-emerald-950 text-xs sm:text-sm">
                  Adaptive Wizard Active:
                </strong>{" "}
                <span className="text-slate-600 text-xs sm:text-sm">
                  The form smoothly simplified in response to sustained session friction.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDynamicMode((prev) => !prev)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                {isDynamicMode ? "View Standard Form" : "Switch to Wizard"}
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Inspect Code
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Form Area: Smooth container height animation preventing abrupt layout snaps */}
      <motion.div layout className="relative w-full">
        <AnimatePresence mode="wait" initial={false}>
          {isDynamicMode && latestComponent ? (
            <motion.div
              key={`dynamic-wizard-${latestComponent.receivedAt || "active"}`}
              variants={smoothMorphVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
              className="w-full"
            >
              <DynamicUIRenderer
                code={latestComponent.code}
                initialValues={initialWizardValues}
                onSubmit={handleWizardSubmit}
                onChange={handleWizardChange}
                onCancel={() => setIsDynamicMode(false)}
                onViewCode={() => setIsDrawerOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="static-financial-form"
              variants={smoothMorphVariants}
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
                initialValues={formContext?.values}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <GeneratedCodeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        componentData={latestComponent}
      />
    </main>
  );
}
