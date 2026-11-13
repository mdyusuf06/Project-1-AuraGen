"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTelemetry } from "../hooks/useTelemetry";
import TelemetryHUD from "../components/TelemetryHUD";
import FinancialForm from "../components/FinancialForm";
import GeneratedCodeDrawer from "../components/GeneratedCodeDrawer";
import DynamicUIRenderer from "../components/DynamicUIRenderer";

const THRESHOLD = Number(process.env.NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD || 70);
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

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
    streamIntervalMs: 1000,
    isConnected,
    sendTelemetry,
    onThreshold: (snapshot) => {
      console.log(
        `[Telemetry] 🚨 Cognitive Load Threshold Exceeded (${snapshot.cognitiveLoadScore} >= ${serverThreshold}) at "${snapshot.activeField}". Telemetry snapshot streamed.`
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

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <TelemetryHUD
        sessionId={sessionId}
        wsStatus={wsStatus}
        reconnectAttempt={reconnectAttempt}
        nextReconnectDelayMs={nextReconnectDelayMs}
        onReconnect={reconnect}
        telemetrySnapshot={telemetrySnapshot}
        subscribeTrajectory={subscribeTrajectory}
        threshold={serverThreshold}
        onSimulateSpike={() => triggerSimulatedFriction(activeField || "annualIncome", 88)}
        onResetTelemetry={resetTelemetry}
        receivedComponentCount={receivedComponents.length}
        onOpenCodeDrawer={() => setIsDrawerOpen(true)}
      />

      {latestComponent && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-indigo-950">
            <strong className="font-semibold">
              AuraGen Self-Healing Payload Active!
            </strong>{" "}
            <span className="text-indigo-800">
              Backend returned{" "}
              <code className="font-mono text-xs bg-indigo-100 px-1.5 py-0.5 rounded">
                {`{ type: "component", code }`}
              </code>{" "}
              ({latestComponent.code.length} chars) with preserved{" "}
              <code className="font-mono text-xs bg-indigo-100 px-1.5 py-0.5 rounded">
                formStateSnapshot
              </code>
              .
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDynamicMode((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors"
            >
              {isDynamicMode ? "View Standard 21-Field Form" : "Switch to Dynamic Wizard"}
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Inspect Code
            </button>
          </div>
        </div>
      )}

      {isDynamicMode && latestComponent ? (
        <DynamicUIRenderer
          code={latestComponent.code}
          initialValues={formContext}
          onSubmit={(data) => {
            console.log("[AuraGen] Dynamic Form Submitted successfully:", data);
            setFormContext((prev) => ({ ...prev, ...data }));
            alert("Application submitted successfully via AuraGen Generative Wizard!");
            setIsDynamicMode(false);
          }}
          onCancel={() => setIsDynamicMode(false)}
          onViewCode={() => setIsDrawerOpen(true)}
        />
      ) : (
        <FinancialForm
          activeField={activeField}
          onActiveFieldChange={setActiveField}
          onFormContextChange={setFormContext}
        />
      )}

      <GeneratedCodeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        componentData={latestComponent}
      />
    </main>
  );
}
