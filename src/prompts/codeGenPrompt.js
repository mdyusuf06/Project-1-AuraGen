import { SystemMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate
} from "@langchain/core/prompts";
import { getSystemPrompt } from "../config/designSystem.js";

/**
 * Creates the ChatPromptTemplate for the Code-Gen Agent.
 * Integrates the Infotact Design System system prompt with dynamic friction context.
 *
 * @returns {ChatPromptTemplate}
 */
export function createCodeGenPrompt() {
  const systemPrompt = getSystemPrompt();

  const humanTemplate = `User is experiencing high cognitive friction on a complex form. AuraGen is triggering an on-the-fly UI transformation.

### RUNTIME FRICTION TELEMETRY:
- Cognitive Load Score: {score} / 100 (Threshold exceeded!)
- Active Friction Field: "{activeField}"
- Telemetry Insight: User paused, hesitated, or triggered rage-clicks at "{activeField}".

### ORIGINAL FORM SCHEMA & FIELDS:
{formFieldsJson}

### CURRENT USER INPUT (PRESERVE THIS DATA):
{userInputJson}

### GENERATION DIRECTIVES:
1. Transform this complex form into an intuitive, multi-step conversational React wizard (2-4 steps).
2. For the friction field ("{activeField}"), provide prominent contextual guidance and helper text so the user feels supported and can easily complete it.
3. Pre-populate all fields with the existing data from 'userInput' / 'props.initialValues' so the user loses zero progress.
4. Component MUST be exported as a single default export:
   export default function DynamicFormWizard(props) {{ ... }}
   It MUST accept props: initialValues, onSubmit, onStepChange, onCancel.
5. Pure Tailwind CSS classes only. Responsive and accessible.
6. NO external UI imports (no lucide, no mui, etc.). Inline SVG icons only.
7. NO eval, NO fetch/network calls, NO window/document globals.
{retryFeedback}

Output ONLY the clean React component inside \`\`\`jsx ... \`\`\` code block.`;

  return ChatPromptTemplate.fromMessages([
    new SystemMessage(systemPrompt),
    HumanMessagePromptTemplate.fromTemplate(humanTemplate)
  ]);
}
