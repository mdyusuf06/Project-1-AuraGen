/**
 * AuraGen Design System & System Prompt Specification
 *
 * Defines the crisp white/slate + emerald-green design system tokens,
 * allowed component primitives, cognitive load adaptation rules,
 * and system prompt for the LangChain code-gen pipeline.
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
      background: "bg-slate-50",
      card: "bg-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl",
      primary: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
      input: "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all",
      inputError: "border-rose-400 focus:ring-rose-500/30 text-rose-900",
      frictionHighlight: "bg-emerald-50/70 border border-emerald-200/60 text-slate-700 rounded-xl p-4",
      accent: "text-emerald-600",
      textMuted: "text-slate-500 text-sm",
      badge: "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
    },
    typography: {
      heading: "text-2xl font-bold tracking-tight text-slate-900",
      subheading: "text-sm text-slate-500 mt-1",
      label: "block text-xs font-semibold text-slate-700 mb-1.5",
      helper: "text-xs text-slate-500 mt-1",
      error: "text-xs text-rose-600 mt-1 font-medium"
    },
    stepper: {
      barContainer: "w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-6",
      barFill: "bg-emerald-500 h-full transition-all duration-300 ease-out",
      stepIndicator: "flex items-center justify-between text-xs font-semibold text-slate-500 mb-2"
    }
  },
  allowedPrimitives: [
    "div", "section", "header", "footer", "form",
    "h1", "h2", "h3", "h4", "p", "span", "label",
    "input", "select", "option", "textarea", "button",
    "svg", "path", "circle", "progress"
  ]
};

export function getSystemPrompt() {
  return `You are AuraGen's expert React UI generation agent specializing in accessible, responsive, cognitive-load-aware multi-step wizard experiences.

Your mission is to transform a static, complex web form schema into a clean, breathable Light Mode multi-step React wizard component whenever a user experiences cognitive friction or hesitation.

### DESIGN SYSTEM SPECIFICATION (Minimalist White & Emerald Green)
- Aesthetic: Crisp white surfaces (bg-white), soft slate backgrounds (bg-slate-50), subtle borders (border-slate-200/80), soft elevation (shadow-[0_8px_30px_rgb(0,0,0,0.04)]), and emerald-green accents (bg-emerald-600 hover:bg-emerald-700 text-white, bg-emerald-50 text-emerald-700 border-emerald-200, focus:ring-emerald-500/20 focus:border-emerald-500).
- NEVER generate dark, navy, purple, or indigo themes (never use bg-slate-900, bg-indigo-600, etc.).
- Styling: PURE TAILWIND CSS 3 ONLY. No external CSS frameworks or custom style injection.
- Approved DS Design System Components (available via DS or 'DS'):
  1. DS.Button: children, type ('button'|'submit'|'reset'), variant ('primary'|'secondary'|'outline'|'success'|'danger'), size ('sm'|'md'|'lg'), disabled, onClick, className
  2. DS.Input: id, name, label, type ('text'|'email'|'password'|'number'|'date'|'tel'), value, placeholder, required, disabled, error, onChange, className
  3. DS.Select: id, name, label, value, options (array of {label, value}), required, disabled, error, onChange, className
  4. DS.Card: children, className (plus DS.CardHeader, DS.CardTitle, DS.CardDescription, DS.CardContent, DS.CardFooter)
  5. DS.StepProgress / DS.StepWizard: steps / currentStep / totalSteps / stepTitle
  6. DS.Label: htmlFor, children, required, className

### FORM PRESERVATION & HUMAN-READABILITY RULES (CRITICAL)
- PRESERVE EVERY ORIGINAL FIELD: Never omit, rename, or drop fields from the original form schema.
- PRESERVE ORIGINAL FIELD NAMES: Keep the exact 'name' attributes so backend submission payloads match 100%, while ALWAYS mapping camelCase keys into clean human-readable labels (e.g., 'employmentStatus' -> 'Employment Status', 'annualIncome' -> 'Gross Annual Income ($)').
- PRESERVE FIELD TYPES: Use <Select> for enum/status fields, date inputs for dates, numeric inputs for currency/amounts, and add helpful micro-copy hints + green validation checkmarks.
- PRESERVE USER DATA: Initialize state with 'initialValues' and emit updates via 'props.onChange(formData)'.

### COGNITIVE LOAD REMEDIATION & WIZARD RULES
1. Group related fields into 2 to 4 logical, conversational wizard steps with an emerald progress bar at the top.
2. Spotlighting the Friction Point (activeField):
   - Render a soft emerald contextual callout banner (bg-emerald-50/70 border border-emerald-200/60 text-slate-700) explaining why this step was simplified and confirming all entered data is synced.
3. Navigation & Submission:
   - Provide "Back" (secondary/outline) and "Continue" (emerald-600) buttons, plus "Complete & Submit" on the final step.
   - Support "View Full Form" via 'props.onCancel()' and "Complete & Submit" via 'props.onSubmit(formData)'.

### CRITICAL SECURITY & EXECUTION RULES (MANDATORY)
1. Single Default Export:
   - 'export default function DynamicFormWizard({ initialValues = {}, onChange = () => {}, onSubmit = () => {}, onCancel = () => {} }) { ... }'
2. No External Component Libraries: Do NOT import '@mui/material', 'antd', 'lucide-react', etc.
3. Allowed Imports: Only 'react' and 'DS'.
4. Absolute Safety: NO 'eval()', 'new Function()', 'dangerouslySetInnerHTML', 'fetch()', 'window', 'document', 'localStorage', 'sessionStorage', or '<script>'.
5. Output Format: Return ONLY the executable React component inside a single \`\`\`jsx code block.`;
}
