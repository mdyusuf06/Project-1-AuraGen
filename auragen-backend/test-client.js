// ============================================================
// FULL PIPELINE TEST CLIENT
// Simulates a frustrated user and tests the complete backend.
// Usage: node test-client.js  (run after: npm run dev)
// ============================================================

import WebSocket from "ws";

const WS_URL = "ws://localhost:8080/ws";
const ws = new WebSocket(WS_URL);

console.log(`\n🧪 AuraGen Backend Full Test\n${"═".repeat(50)}`);
console.log(`Connecting to ${WS_URL}...\n`);

ws.on("open", () => {
    console.log("✅ Connected to AuraGen Backend\n");

    // ── STEP 1: Send a DOM context snapshot (Week 3) ───────────
    setTimeout(() => {
        console.log("📸 Sending DOM context snapshot...");
        ws.send(JSON.stringify({
            type: "DOM_CONTEXT_UPDATE",
            payload: {
                formData: {
                    legal_entity_name: "Acme Corporation LLC",
                    business_address: "123 Main Street, Austin TX",
                },
                fieldErrors: {
                    tax_identification_number: "Format must be XX-XXXXXXX (e.g. 12-3456789)",
                },
                formSchema: [
                    { id: "legal_entity_name", label: "Legal Entity Name", type: "text", required: true },
                    { id: "tax_identification_number", label: "Tax Identification Number (TIN/EIN)", type: "text", required: true },
                    { id: "fiscal_year_end", label: "Fiscal Year End Date", type: "date", required: true },
                    { id: "primary_naics_code", label: "Primary NAICS Industry Code", type: "select", required: true },
                    { id: "annual_revenue_usd", label: "Annual Revenue (USD)", type: "number", required: true },
                ],
                activeFieldId: "tax_identification_number",
                touchedFields: ["legal_entity_name", "tax_identification_number"],
                scrollPosition: 120,
                viewportHeight: 768,
                cognitiveLoadScore: 0,
            },
        }));
    }, 500);

    // ── STEP 2: Send high-friction telemetry (triggers pipeline) ─
    setTimeout(() => {
        console.log("🚨 Sending high-friction telemetry...\n");
        ws.send(JSON.stringify({
            type: "FRICTION_TELEMETRY",
            payload: {
                telemetry: {
                    rageClicks: 4,            // 40 pts
                    hesitationMs: 12000,      // ~22 pts
                    cursorErraticness: 75,    // ~22 pts
                    // Total ≈ 84/100 → TRIGGERS
                },
                frictionContext: {
                    frictionPoint: {
                        fieldId: "tax_identification_number",
                        fieldLabel: "Tax Identification Number (TIN/EIN)",
                        fieldType: "text",
                    },
                    userBehavior: {
                        rageClicks: 4,
                        hesitationMs: 12000,
                        cursorErraticness: 75,
                    },
                    currentFormSchema: [
                        { id: "legal_entity_name", label: "Legal Entity Name", type: "text", required: true },
                        { id: "tax_identification_number", label: "Tax Identification Number", type: "text", required: true },
                        { id: "fiscal_year_end", label: "Fiscal Year End", type: "date", required: true },
                        { id: "primary_naics_code", label: "NAICS Industry Code", type: "select", required: true },
                        { id: "annual_revenue_usd", label: "Annual Revenue (USD)", type: "number", required: true },
                    ],
                    sessionContext: {
                        taskGoal: "Complete business loan application",
                        completedFields: ["legal_entity_name", "business_address"],
                        remainingFields: [
                            "tax_identification_number",
                            "fiscal_year_end",
                            "primary_naics_code",
                            "annual_revenue_usd",
                        ],
                    },
                },
            },
        }));
    }, 1500);

    // ── STEP 3: Request cache stats (Week 4) ──────────────────
    setTimeout(() => {
        console.log("📊 Requesting cache stats...");
        ws.send(JSON.stringify({ type: "CACHE_STATS_REQUEST" }));
    }, 60000); // After 60s — component should be cached by then
});

// ── Handle all responses ─────────────────────────────────────
ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());

    console.log(`\n${"─".repeat(50)}`);
    console.log(`📨 EVENT: ${msg.type}`);
    console.log(`${"─".repeat(50)}`);

    switch (msg.type) {
        case "CONNECTION_ESTABLISHED":
            console.log(`Session ID: ${msg.sessionId}`);
            console.log(`Features: ${msg.features?.join(", ")}`);
            break;

        case "CONTEXT_UPDATED":
            console.log(`✅ Context saved — ${msg.savedFieldCount} fields`);
            console.log(`Active field: ${msg.activeField}`);
            break;

        case "COGNITIVE_LOAD_SCORE":
            console.log(`Score: ${msg.cognitiveLoadScore}/100`);
            console.log(`Breakdown:`, msg.breakdown);
            console.log(`Should trigger: ${msg.shouldTrigger ? "YES 🚨" : "NO ✅"}`);
            break;

        case "GENERATION_STARTED":
            console.log(`Message: ${msg.message}`);
            console.log(`From cache: ${msg.fromCache ? "YES ⚡" : "NO"}`);
            console.log(`Streaming: ${msg.streaming ? "YES" : "NO"}`);
            break;

        case "STREAM_CHUNK":
            // Show streaming progress without flooding the console
            if (msg.chunkIndex % 20 === 0) {
                process.stdout.write(
                    `\r🌊 Streaming... ${msg.totalCharsReceived} chars received`
                );
            }
            break;

        case "COMPONENT_UPDATE":
            console.log(`\n✅ COMPONENT DELIVERED!`);
            console.log(`Name: ${msg.componentName}`);
            console.log(`Reasoning: ${msg.reasoning}`);
            console.log(`Code size: ${msg.metadata.codeSizeBytes} bytes`);
            console.log(`Generation time: ${msg.metadata.generationTimeMs}ms`);
            console.log(`From cache: ${msg.metadata.fromCache}`);
            console.log(`\nCode preview:\n${msg.code.substring(0, 400)}...`);
            break;

        case "GENERATION_FAILED":
            console.log(`❌ Generation failed: ${msg.reason}`);
            console.log(`Fallback strategy: ${msg.fallbackStrategy}`);
            if (msg.violations?.length) {
                console.log(`Violations:`, msg.violations);
            }
            break;

        case "CACHE_STATS":
            console.log(`Cache stats:`, msg.stats);
            break;

        case "ERROR":
            console.log(`❌ Error [${msg.code}]: ${msg.detail}`);
            break;

        default:
            console.log(JSON.stringify(msg, null, 2));
    }
});

ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
    console.error("Is the server running? Run: npm run dev");
});

ws.on("close", () => {
    console.log("\n🔌 Connection closed");
});