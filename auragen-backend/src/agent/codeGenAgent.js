// ============================================================
// CODE-GEN AGENT — GEMINI VERSION
// pipeline, same logic — just swapped OpenAI for Gemini//
// ============================================================

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildSystemPrompt } from "./prompts/systemPrompt.js";
import { buildUserPrompt } from "./prompts/userPromptBuilder.js";
import { CodeGenOutputParser } from "./outputParser.js";

export class CodeGenAgent {
    constructor() {

        // ── Initialize Gemini Model ───────────────────────────────
        this.llm = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-pro",      // Most capable Gemini model
            temperature: 0.2,              // Low = consistent, predictable code
            maxOutputTokens: 4096,         // Allow large component generation
            googleApiKey: process.env.GEMINI_API_KEY,
        });

        this.parser = new CodeGenOutputParser();
        this.systemPrompt = buildSystemPrompt();

        console.log("[CodeGenAgent] ✅ Initialized with Gemini 1.5 Pro");
    }

    /**
     * Main pipeline: friction context → validated React component code
     * @param {Object} frictionContext - Data from the Friction Processor
     * @returns {Object} { componentName, reasoning, code, generationTimeMs }
     */
    async generateComponent(frictionContext) {
        const startTime = Date.now();

        console.log(
            `[CodeGenAgent] 🧠 Generating component for friction point: "${frictionContext.frictionPoint?.fieldId}"`
        );

        // ── Build messages ────────────────────────────────────────
        // NOTE: Gemini via LangChain uses the SAME message format
        // as OpenAI — SystemMessage + HumanMessage. No changes here.
        const messages = [
            new SystemMessage(this.systemPrompt),
            new HumanMessage(buildUserPrompt(frictionContext)),
        ];

        // ── Call Gemini ───────────────────────────────────────────
        let llmResponse;
        try {
            const response = await this.llm.invoke(messages);
            llmResponse = response.content;

            console.log(`[CodeGenAgent] 📥 Gemini responded (${llmResponse.length} chars)`);
        } catch (error) {
            console.error("[CodeGenAgent] ❌ Gemini invocation failed:", error.message);
            throw new Error(`Gemini call failed: ${error.message}`);
        }

        // ── Parse structured output ───────────────────────────────
        let parsed;
        try {
            parsed = this.parser.parse(llmResponse);
            console.log(`[CodeGenAgent] ✅ Parsed — Reasoning: "${parsed.reasoning}"`);
        } catch (error) {
            console.error("[CodeGenAgent] ❌ Output parsing failed:", error.message);
            throw new Error(`Output parsing failed: ${error.message}`);
        }

        const generationTimeMs = Date.now() - startTime;
        console.log(`[CodeGenAgent] ⏱️ Total generation time: ${generationTimeMs}ms`);

        return {
            ...parsed,
            generationTimeMs,
        };
    }
}