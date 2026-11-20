const control =
  "w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all";
const controlVariants = {
  default: control + " border-slate-300 focus:ring-indigo-500",
  focused: control + " border-indigo-500 focus:ring-indigo-500",
  invalid: control + " border-rose-400 focus:ring-rose-500"
};

function defineComponent(name, element, props, required, defaults, variants, accessibility) {
  return Object.freeze({
    name,
    element,
    props: Object.freeze(props),
    required: Object.freeze(required),
    defaults: Object.freeze(defaults),
    variants: Object.freeze(variants),
    allowedTailwindClasses: Object.freeze([...new Set(Object.values(variants).join(" ").split(" "))]),
    accessibility: Object.freeze(accessibility)
  });
}

// The contracts bind the native elements and styles used by the checked-in financial form.
// Event handlers, live values, IDs and styling are assigned by the trusted JSX renderer.
export const INPUT_TYPES = Object.freeze(["text", "email", "tel", "date", "number", "checkbox"]);
export const DESIGN_SYSTEM = Object.freeze({
  Button: defineComponent("Button", "button", {
    type: "button | submit", children: "string"
  }, ["children"], { type: "button" }, {
    primary: "px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm transition-colors",
    secondary: "px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors"
  }, ["Use an action label.", "Only the final step submits the form."]),
  Input: defineComponent("Input", "input", {
    id: "string", name: "string", type: INPUT_TYPES, value: "string | number",
    checked: "boolean", required: "boolean", placeholder: "string", min: "number | date string",
    max: "number | date string", step: "positive number | numeric string | any",
    minLength: "nonnegative integer", maxLength: "nonnegative integer",
    "aria-invalid": "boolean", "aria-describedby": "string"
  }, ["id", "name", "type"], { required: false, value: "", checked: false }, controlVariants, [
    "Associate a visible Label by ID.", "Link help and validation errors with aria-describedby."
  ]),
  Select: defineComponent("Select", "select", {
    id: "string", name: "string", value: "string", required: "boolean",
    options: "array of { value: string, label: string }",
    "aria-invalid": "boolean", "aria-describedby": "string"
  }, ["id", "name", "options"], { value: "", required: false }, controlVariants, [
    "Associate a visible Label by ID.", "Provide descriptive option labels and an empty choice."
  ]),
  Card: defineComponent("Card", "section", {
    "aria-labelledby": "string", children: "renderer-owned content"
  }, ["aria-labelledby", "children"], {}, {
    default: "bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
  }, ["Name the section with its visible step heading."]),
  StepProgress: defineComponent("StepProgress", "progress", {
    value: "positive integer", max: "positive integer", "aria-label": "string"
  }, ["value", "max"], { "aria-label": "Wizard progress" }, {
    default: "w-full"
  }, ["Expose the current and total step counts in text.", "Give the progress element an accessible name."]),
  Label: defineComponent("Label", "label", {
    htmlFor: "string", children: "string"
  }, ["htmlFor", "children"], {}, {
    default: "flex items-center justify-between text-xs font-semibold text-slate-700"
  }, ["Match htmlFor to the control ID.", "Indicate required fields in text."])
});

export const FIELD_COMPONENTS = Object.freeze(["Input", "Select"]);

export function componentForType(type) {
  return type === "select" ? "Select" : "Input";
}
