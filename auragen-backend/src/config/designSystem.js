// ============================================================
// DESIGN SYSTEM CONFIGURATION
// ============================================================

export const DESIGN_SYSTEM = {
  framework: "React with Next.js 14",
  styling: "Tailwind CSS v3",

  // Color tokens the LLM must use
  colors: {
    primary: "blue-600",
    primaryHover: "blue-700",
    secondary: "slate-600",
    success: "green-500",
    error: "red-500",
    warning: "amber-500",
    background: "gray-50",
    surface: "white",
    border: "gray-200",
    textPrimary: "gray-900",
    textSecondary: "gray-500",
  },

  // Reusable class patterns the LLM must follow
  componentPatterns: {
    card: "bg-white rounded-xl shadow-sm border border-gray-200 p-6",
    button: {
      primary: "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200",
      secondary: "bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-200 transition-colors duration-200",
      ghost: "text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors duration-200",
    },
    input: "w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    label: "block text-sm font-medium text-gray-700 mb-1",
    errorText: "text-red-500 text-xs mt-1",
    stepIndicator: "flex items-center justify-between mb-8",
  },

  // Rules the LLM must obey — injected as hard constraints
  rules: [
    "NEVER use inline styles. Only use Tailwind CSS classes.",
    "NEVER import external libraries. Only use React hooks (useState, useEffect).",
    "ALWAYS export the component as a default export named 'GeneratedComponent'.",
    "ALWAYS accept a single prop object: { formData, onUpdate, onComplete }.",
    "NEVER use 'eval', 'Function()', 'dangerouslySetInnerHTML', or 'fetch'.",
    "ALWAYS wrap the component in a single root div.",
    "Use only standard HTML elements: div, input, button, label, p, h1-h4, span, select, textarea.",
    "Make forms conversational and step-by-step when converting from complex layouts.",
    "Add smooth transitions using Tailwind's transition and animation utilities.",
  ],
};
