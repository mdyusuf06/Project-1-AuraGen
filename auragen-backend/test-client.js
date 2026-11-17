// ============================================================
// TEST CLIENT — Simulates Frontend Telemetry WebSocket Client
// Run with: node test-client.js
// ============================================================

import { WebSocket } from "ws";

const WS_PORT = process.env.WS_PORT || 8080;
const WS_URL = process.env.WS_URL || `ws://localhost:${WS_PORT}`;

console.log("=================================================");
console.log(`📡 AuraGen Test Client connecting to ${WS_URL}`);
console.log("=================================================");

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
    console.log("✅ Connected to AuraGen Backend Gateway");

    const sessionId = `test_sess_${Date.now()}`;

    // 1. Send normal telemetry (low cognitive load)
    console.log("\n[1] Sending low cognitive load telemetry (score: 25)...");
    ws.send(
        JSON.stringify({
            type: "telemetry",
            sessionId,
            timestamp: Date.now(),
            metrics: {
                mouseVelocity: 150,
                hesitationMs: 800,
                rageClicks: 0,
                clickErrorRate: 0.0,
            },
            cognitiveLoadScore: 25,
            activeField: "businessLegalName",
        })
    );

    // 2. Send high friction spike telemetry (score >= 70) after 1.5 seconds
    setTimeout(() => {
        console.log("\n[2] 🚨 Sending HIGH cognitive friction telemetry spike (score: 88)...");
        ws.send(
            JSON.stringify({
                type: "telemetry",
                sessionId,
                timestamp: Date.now(),
                metrics: {
                    mouseVelocity: 520,
                    hesitationMs: 12000,
                    rageClicks: 6,
                    clickErrorRate: 0.45,
                },
                cognitiveLoadScore: 88,
                activeField: "annualIncome",
                formStateSnapshot: {
                    values: {
                        businessLegalName: "Apex Meridian Logistics LLC",
                        taxIdentificationNumber: "84-2910482",
                    },
                    fieldMetadata: [
                        { id: "businessLegalName", label: "Business Legal Name", type: "text" },
                        { id: "annualIncome", label: "Net Owner Annual Income", type: "number" },
                        { id: "requestedFacilityAmount", label: "Requested Credit Facility ($)", type: "number" },
                    ],
                },
            })
        );
    }, 1500);
});

ws.on("message", (data) => {
    try {
        const payload = JSON.parse(data.toString());
        console.log("\n📥 Received message from server:", payload.type);

        if (payload.type === "component") {
            console.log("✨ GENERATIVE UI COMPONENT RECEIVED!");
            console.log("Component Name:", payload.componentName || "GeneratedComponent");
            console.log("Reasoning:     ", payload.reasoning || "N/A");
            console.log("Code Length:   ", payload.code ? payload.code.length : 0, "characters");
            console.log("\nTest completed successfully!");
            ws.close();
        } else {
            console.log("Payload:", payload);
        }
    } catch {
        console.log("Raw message received:", data.toString());
    }
});

ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
});

ws.on("close", (code, reason) => {
    console.log(`🔌 WebSocket connection closed (${code}): ${reason || "Normal closure"}`);
});
