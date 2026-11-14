import { DEFAULT_FORM_FIELDS, USE_TEAMMATE_CODEGEN } from "../config/constants.js";
import { generateComponentStub } from "./codeGenStub.js";

/**
 * Teammate Code-Gen Integration Adapter
 *
 * When teammate's LangChain pipeline module (`../codegen/agent.js`) is ready,
 * set USE_TEAMMATE_CODEGEN=true in `.env` (or replace the dynamic import below
 * with a direct import). Until then, this safely delegates to `generateComponentStub`.
 *
 * @param {object} params
 * @param {string} params.activeField - Field experiencing user friction
 * @param {Array} [params.formFields] - Schema of original form fields
 * @param {object} [params.userInput] - Previously entered field values
 * @param {number} params.score - Real-time Cognitive Load Score (0-100)
 * @returns {Promise<string>} Raw React component code string
 */
export async function generateComponent({
  activeField,
  formFields,
  userInput = {},
  score
}) {
  const resolvedFormFields =
    Array.isArray(formFields) && formFields.length > 0
      ? formFields
      : DEFAULT_FORM_FIELDS;

  if (USE_TEAMMATE_CODEGEN) {
    try {
      // Dynamic import avoids startup crash before teammate's module is merged into /backend/src/codegen/
      const teammateModule = await import("../codegen/agent.js");
      if (typeof teammateModule.generateComponent === "function") {
        console.log("[CodeGenService] Using teammate's LangChain generateComponent() pipeline.");
        return await teammateModule.generateComponent({
          activeField,
          formFields: resolvedFormFields,
          userInput,
          score
        });
      }
    } catch (err) {
      console.warn(
        `[CodeGenService] Teammate module unavailable (${err.message}). Falling back to Week 1 stub.`
      );
    }
  }

  console.log("[CodeGenService] Generating component via Week 1 stub.");
  return await generateComponentStub({
    activeField,
    formFields: resolvedFormFields,
    userInput,
    score
  });
}

