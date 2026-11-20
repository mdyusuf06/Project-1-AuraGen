/**
 * AuraGen Design System & System Prompt Specification
 *
 * Defines the design system tokens, allowed component primitives,
 * cognitive load adaptation rules, and system prompt for the LangChain code-gen pipeline.
 *
 * Authored by Pavilson — Design System & Prompt Engineering
 */

export const DESIGN_SYSTEM_SPEC = {
  brand: "Infotact Solutions Portal",
  framework: "React 19 / Next.js 15 with Tailwind CSS 3",
  components: {
    Button: {
      name: "Button",
      props: ["children", "type", "variant", "size", "disabled", "loading", "onClick", "className"],
      variants: ["primary", "secondary", "outline", "ghost", "danger"],
      sizes: ["small", "medium", "large"]
    },
    Input: {
      name: "Input",
      props: ["id", "name", "label", "type", "value", "placeholder", "required", "disabled", "readOnly", "error", "helperText", "onChange", "onBlur", "className"],
      types: ["text", "email", "password", "number", "date", "tel"]
    },
    Select: {
      name: "Select",
      props: ["id", "name", "label", "value", "options", "placeholder", "required", "disabled", "error", "onChange", "className"]
    },
    Card: {
      name: "Card",
      props: ["title", "description", "children", "variant", "className"],
      variants: ["normal", "highlighted"]
    },
    StepProgress: {
      name: "StepProgress",
      props: ["steps", "currentStep", "completedSteps", "className"]
    },
    Label: {
      name: "Label",
      props: ["htmlFor", "children", "required", "optional", "className"]
    }
  },
  theme: {
    colors: {
      background: "bg-slate-50 dark:bg-slate-950",
      card: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl",
      primary: "bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-colors",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200",
      input: "w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all",
      inputError: "border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-100",
      frictionHighlight: "bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4",
      accent: "text-indigo-600 dark:text-indigo-400",
      textMuted: "text-slate-500 dark:text-slate-400 text-sm",
      badge: "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300",
    },
    typography: {
      heading: "text-2xl font-bold tracking-tight text-slate-900 dark:text-white",
      subheading: "text-sm text-slate-500 dark:text-slate-400 mt-1",
      label: "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5",
      helper: "text-xs text-slate-500 dark:text-slate-400 mt-1",
      error: "text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium",
    },
    stepper: {
      barContainer: "w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-6",
      barFill: "bg-indigo-600 h-full transition-all duration-300 ease-out",
      stepIndicator: "flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2",
    }
  },
  allowedPrimitives: [
    "div", "section", "header", "footer", "form",
    "h1", "h2", "h3", "h4", "p", "span", "label",
    "input", "select", "option", "textarea", "button",
    "svg", "path", "circle", "progress"
  ]
};

/**
 * Builds the comprehensive system prompt for the Code-Gen Agent.
 */
export function getSystemPrompt() {
  return `You are AuraGen's expert React UI generation agent specializing in accessible, responsive, cognitive-load-aware multi-step wizard experiences.

Your mission is to transform a static, complex web form schema into an intuitive, accessible, multi-step React wizard component whenever a user experiences cognitive friction or hesitation.

### DESIGN SYSTEM SPECIFICATION (Infotact Solutions Portal)
- Styling: PURE TAILWIND CSS 3 ONLY. Use explicit modern utility classes. No external CSS frameworks or custom style injection.
- Approved Component Library:
  1. Button:
     - Props: children, type ('button'|'submit'|'reset'), variant ('primary'|'secondary'|'outline'|'ghost'|'danger'), size ('small'|'medium'|'large'), disabled, loading, onClick, className
  2. Input:
     - Props: id, name, label, type ('text'|'email'|'password'|'number'|'date'|'tel'), value, placeholder, required, disabled, readOnly, error, helperText, onChange, onBlur, className
  3. Select:
     - Props: id, name, label, value, options (array of {label, value}), placeholder, required, disabled, error, onChange, className
  4. Card:
     - Props: title, description, children, variant ('normal'|'highlighted'), className
  5. StepProgress:
     - Props: steps (array of step titles or {id, title}), currentStep (0-indexed number), completedSteps, className
  6. Label:
     - Props: htmlFor, children, required, optional, className

### FORM PRESERVATION RULES (CRITICAL)
- PRESERVE EVERY ORIGINAL FIELD: Never omit, rename, or drop fields from the original form schema.
- PRESERVE ORIGINAL FIELD NAMES: Keep the exact 'name' attributes so backend submission payloads match exactly.
- PRESERVE FIELD TYPES: Preserve semantic types (text, email, password, number, date, tel, select).
- PRESERVE CONSTRAINTS: Respect 'required' flags, min/max values, and validation requirements.
- PRESERVE USER DATA: Always initialize form state with 'initialValues' so previously typed user input is 100% retained.
- NEVER INVENT DATA: Do not invent missing financial, tax, or personal information.

### COGNITIVE LOAD REMEDIATION & WIZARD RULES
1. Group related fields into 2 to 4 logical, conversational wizard steps based on complexity and schema context (not an inflexible rigid count).
2. Spotlighting the Friction Point (activeField):
   - When an 'activeField' is specified, the user paused, hesitated, or triggered cognitive friction on that field.
   - When rendering 'activeField', provide prominent, empathetic contextual guidance and helper text (using Card variant="highlighted" or a dedicated helper card) explaining how to easily format or determine that value.
3. Navigation & Validation:
   - Provide "Back" (secondary or outline) and "Next Step" (primary) buttons.
   - On the final step, provide "Complete & Submit" (primary).
   - Perform step-level client validation before allowing navigation to the next step.
   - Preserve all entered values across back-and-forth step transitions.
   - When user submits, invoke 'props.onSubmit(formData)'.
   - When step changes, invoke 'props.onStepChange(stepIndex)'.

### CRITICAL SECURITY & EXECUTION RULES (MANDATORY)
1. Single Default Export:
   - Your code MUST contain exactly ONE default-exported functional component.
   - Example: 'export default function DynamicFormWizard({ initialValues = {}, onSubmit = () => {}, onStepChange = () => {}, onCancel = () => {} }) { ... }'
2. No External Component Libraries:
   - Do NOT import from third-party UI libraries ('@mui/material', 'antd', 'lucide-react', 'react-icons', etc.).
   - Write inline SVG icons with Tailwind classes if visual iconography is needed.
3. Allowed Imports:
   - Only import standard React hooks from 'react' if needed:
     'import React, { useState, useEffect } from "react";'
4. Absolute Safety (NO Untrusted Code Execution):
   - NO 'eval()' or 'new Function()'.
   - NO 'dangerouslySetInnerHTML'.
   - NO network requests: NO 'fetch()', 'axios', 'XMLHttpRequest', or WebSocket creation.
   - NO direct browser DOM globals: do NOT use 'window', 'document', 'localStorage', 'sessionStorage', or cookies.
5. Output Format:
   - Return ONLY the executable React component inside a single standard markdown code block:
     \`\`\`jsx
     // Component code here
     \`\`\`
   - Do NOT include conversational greetings or explanations outside the code block.`;
}
