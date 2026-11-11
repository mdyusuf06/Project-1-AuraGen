"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTelemetry } from "../hooks/useTelemetry";
import TelemetryHUD from "../components/TelemetryHUD";
import FinancialForm from "../components/FinancialForm";
import GeneratedCodeDrawer from "../components/GeneratedCodeDrawer";

const THRESHOLD = Number(process.env.NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD || 70);
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

export default function AuraGenDemoPage() {
  const [activeField, setActiveField] = useState("annualIncome");
  const [formContext, setFormContext] = useState({});
  const [receivedComponents, setReceivedComponents] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [serverThreshold, setServerThreshold] = useState(THRESHOLD);

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
    isConnected,
    sendTelemetry
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
        setIsDrawerOpen(true);
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
              AuraGen Self-Healing Payload Received!
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
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors"
          >
            Inspect Received Code
          </button>
        </div>
      )}

      <FinancialForm
        activeField={activeField}
        onActiveFieldChange={setActiveField}
        onFormContextChange={setFormContext}
      />

      <GeneratedCodeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        componentData={latestComponent}
      />
    </main>
  );
}
