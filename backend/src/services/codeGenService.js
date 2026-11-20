import { DEFAULT_FORM_FIELDS, MAX_STEP_FIELDS, USE_TEAMMATE_CODEGEN } from "../config/constants.js";
import { componentForType } from "../config/designSystem.js";
import { isIdentifier, isScore, validateFormFields } from "../validators/formValidator.js";
import { parseWizardLayout, validateWizardLayout } from "../validators/wizardValidator.js";
import { GenerationError } from "./generationErrors.js";
import { invokeOpenAIWizard, requestWizardLayout } from "./openAIWizard.js";
import { renderWizardSource } from "./renderWizard.js";
import { makeWizardMessages } from "./wizardPrompt.js";

const demoFields = validateFormFields(DEFAULT_FORM_FIELDS);
const demoNames = new Set(demoFields.map(({ name }) => name));

function groupBySection(fields) {
  const bySection = new Map();
  for (const field of fields) {
    if (!bySection.has(field.section)) bySection.set(field.section, []);
    bySection.get(field.section).push({ name: field.name, component: componentForType(field.type) });
  }
  const steps = [];
  for (const group of bySection.values()) {
    for (let index = 0; index < group.length; index += MAX_STEP_FIELDS) {
      steps.push({ id: `step-${steps.length + 1}`, fields: group.slice(index, index + MAX_STEP_FIELDS) });
    }
  }
  return { steps };
}

function checkedResponse(response) {
  const finish = response?.response_metadata?.finish_reason;
  if (finish === "length") throw new GenerationError("OPENAI_TOKEN_LIMIT");
  if (finish !== "stop" || response.additional_kwargs?.refusal ||
      response.tool_calls?.length || response.invalid_tool_calls?.length) {
    throw new GenerationError("INVALID_OUTPUT");
  }
  return parseWizardLayout(response.content);
}

export function createWizardGenerator({
  invoke = USE_TEAMMATE_CODEGEN ? invokeOpenAIWizard : null,
  concurrency = 4,
  timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 24_000),
  attemptTimeoutMs = 8_000,
  maxAttempts = 3,
  retryBaseMs = 250,
  demoCacheMs = 60_000
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new GenerationError("OPENAI_CONFIGURATION");
  }
  let active = 0;
  const pendingDemo = new Map();
  const demoCache = new Map();

  async function buildWizard(formFields, activeField, useDemoRules, signal) {
    const layout = invoke
      ? checkedResponse(await requestWizardLayout(invoke, makeWizardMessages(formFields, activeField), {
        timeoutMs, attemptTimeoutMs, maxAttempts, retryBaseMs, signal
      }))
      : groupBySection(formFields);
    return validateWizardLayout(layout, formFields, { activeField, useDemoRules });
  }

  async function generateWizard({ activeField = "", formFields, score, signal }) {
    if (!isScore(score) || (activeField !== "" && !isIdentifier(activeField))) {
      throw new GenerationError("INVALID_FORM", [{
        path: "telemetry", message: "Invalid cognitive load score or field identifier."
      }]);
    }
    if (signal?.aborted) throw new GenerationError("GENERATION_CANCELLED");
    const useDemoRules = formFields === undefined;
    const fields = useDemoRules ? demoFields : validateFormFields(formFields);
    if (activeField && !(useDemoRules ? demoNames.has(activeField) : fields.some(({ name }) => name === activeField))) {
      throw new GenerationError("INVALID_FORM", [{
        path: "activeField", message: "The field must belong to the form schema."
      }]);
    }

    // Only the bundled schema can be shared across connections and only its known fields are cache keys.
    if (useDemoRules) {
      const existing = demoCache.get(activeField);
      if (existing?.expiresAt > Date.now()) return existing.wizard;
      if (pendingDemo.has(activeField)) return pendingDemo.get(activeField);
    }
    if (active >= concurrency) throw new GenerationError("GENERATION_BUSY");

    active++;
    const job = buildWizard(fields, activeField, useDemoRules, useDemoRules ? undefined : signal);
    if (useDemoRules) pendingDemo.set(activeField, job);
    try {
<<<<<<< HEAD
      // Dynamic import attempts backend/src/codegen/agent.js or root src/agent.js
      let teammateModule;
      try {
        teammateModule = await import("../codegen/agent.js");
      } catch {
        teammateModule = await import("../../../src/agent.js");
      }

      if (typeof teammateModule.generateComponent === "function") {
        console.log("[CodeGenService] Using teammate's LangChain generateComponent() pipeline.");
        return await teammateModule.generateComponent({
          activeField,
          formFields: resolvedFormFields,
          userInput,
          score
        });
=======
      const wizard = await job;
      if (useDemoRules && demoCacheMs > 0) {
        demoCache.set(activeField, { wizard, expiresAt: Date.now() + demoCacheMs });
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
      }
      return wizard;
    } finally {
      active--;
      if (useDemoRules) pendingDemo.delete(activeField);
    }
  }

  return {
    generateWizard,
    async generateComponent(params) {
      const wizard = await generateWizard(params);
      return renderWizardSource(wizard, params.formFields === undefined);
    }
  };
}

export const { generateWizard, generateComponent } = createWizardGenerator();
