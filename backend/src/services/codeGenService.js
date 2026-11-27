import { DEFAULT_FORM_FIELDS, USE_TEAMMATE_CODEGEN } from "../config/constants.js";
import { getSystemPrompt } from "../config/designSystem.js";
import { generateComponentStub } from "./codeGenStub.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

/**
 * Attempts local Ollama generation when Enterprise Privacy Mode === "ollama".
 * Uses a strict 2500ms timeout so offline/uninstalled Ollama gracefully falls back
 * without degrading sub-2s UI responsiveness.
 */
async function tryLocalOllamaGeneration({ activeField, formFields, userInput, score }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const prompt = `${getSystemPrompt()}\n\nActive friction field: ${activeField} (score ${score}/100)\nFields: ${JSON.stringify(formFields.slice(0, 12))}\nInitial values: ${JSON.stringify(userInput)}`;
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.response || "";
    const match = raw.match(/```(?:jsx|javascript|tsx)?\s*([\s\S]*?)```/);
    const code = (match ? match[1] : raw).trim();
    return code.includes("export default") ? code : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Context-Aware Dual-Engine Code-Gen Service
 * Supports:
 * - Cloud LLM pipeline (when USE_TEAMMATE_CODEGEN=true)
 * - Local Ollama Privacy Mode (when privacyMode === "ollama")
 * - Form-agnostic adaptive wizard generator fallback (white/slate + emerald DS)
 */
export async function generateComponent({
  activeField,
  formFields,
  userInput = {},
  domContext = {},
  formId = "infotact-finance-v1",
  privacyMode = "cloud",
  score
}) {
  const resolvedFormFields =
    Array.isArray(formFields) && formFields.length > 0
      ? formFields
      : DEFAULT_FORM_FIELDS;

  // 1. Enterprise Privacy Mode: Route to Local Ollama endpoint first
  if (privacyMode === "ollama") {
    const ollamaCode = await tryLocalOllamaGeneration({
      activeField,
      formFields: resolvedFormFields,
      userInput,
      score
    });
    if (ollamaCode) {
      console.log("[CodeGenService] Generated component via Local Ollama Privacy Engine.");
      return ollamaCode;
    }
    console.log("[CodeGenService] Ollama unavailable locally; using privacy-safe adaptive wizard.");
  }

  // 2. Cloud LLM pipeline (LangChain) if explicitly enabled
  if (privacyMode !== "ollama" && USE_TEAMMATE_CODEGEN) {
    try {
      let teammateModule;
      try {
        teammateModule = await import("../codegen/agent.js");
      } catch {
        teammateModule = await import("../../../src/agent.js");
      }

      if (typeof teammateModule.generateComponent === "function") {
        console.log("[CodeGenService] Using LangChain generateComponent() pipeline.");
        return await teammateModule.generateComponent({
          activeField,
          formFields: resolvedFormFields,
          userInput,
          score
        });
      }
    } catch (err) {
      console.warn(
        `[CodeGenService] Cloud LangChain module unavailable (${err.message}). Using adaptive wizard.`
      );
    }
  }

  // 3. Adaptive white/emerald wizard fallback
  return await generateComponentStub({
    activeField,
    formFields: resolvedFormFields,
    userInput,
    formId,
    domContext,
    score
  });
}
