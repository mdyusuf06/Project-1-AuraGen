// ============================================================
// TEST GEMINI — Testing Gemini LangChain CodeGenAgent
// Run with: node test-gemini.js
// ============================================================

import "dotenv/config";
import { CodeGenAgent } from "./src/agent/codeGenAgent.js";

async function runGeminiTest() {
    console.log("=================================================");
    console.log("🧪 Testing Gemini 1.5 Pro Component Code-Gen Agent");
    console.log("=================================================");

    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️  WARNING: GEMINI_API_KEY is not set in environment or .env!");
        console.warn("Please set GEMINI_API_KEY=your_key to execute real LLM calls.\n");
    }

    try {
        const agent = new CodeGenAgent();

        const mockFrictionContext = {
            cognitiveLoadScore: 84,
            frictionPoint: {
                fieldId: "annualIncome",
                fieldLabel: "Net Owner Annual Income",
                fieldType: "number",
            },
            userBehavior: {
                rageClicks: 4,
                hesitationMs: 9500,
                cursorErraticness: 42,
            },
            currentFormSchema: {
                title: "Commercial Loan Application",
                fields: [
                    { id: "businessLegalName", label: "Business Legal Name", type: "text" },
                    { id: "annualIncome", label: "Net Owner Annual Income", type: "number" },
                    { id: "requestedAmount", label: "Loan Amount ($)", type: "number" },
                ],
            },
            sessionContext: {
                taskGoal: "Complete Loan Application",
                completedFields: { businessLegalName: "Acme Corp" },
                remainingFields: ["annualIncome", "requestedAmount"],
            },
        };

        console.log("🚀 Invoking CodeGenAgent.generateComponent()...");
        const result = await agent.generateComponent(mockFrictionContext);

        console.log("\n================ GENERATION RESULT ================");
        console.log("Component Name:", result.componentName);
        console.log("Reasoning:     ", result.reasoning);
        console.log("Generation Time:", `${result.generationTimeMs}ms`);
        console.log("Code Preview (first 250 chars):\n", result.code.slice(0, 250), "...");
        console.log("===================================================\n");
        console.log("✅ Gemini CodeGen test completed successfully!");
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

runGeminiTest();
