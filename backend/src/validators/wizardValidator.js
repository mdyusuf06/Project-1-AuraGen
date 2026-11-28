import { DEFAULT_SECTION_TITLES, MAX_MESSAGE_BYTES, MAX_STEP_FIELDS } from "../config/constants.js";
import { componentForType } from "../config/designSystem.js";
import { GenerationError } from "../services/generationErrors.js";
import { isRecord } from "./formValidator.js";

const stepId = /^[a-z][a-z0-9_-]{0,63}$/;

function hasKeys(record, keys) {
  return isRecord(record) && Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key));
}

function invalidLayout(code, message, path = "steps") {
  return new GenerationError("INVALID_OUTPUT", [{
    code, message, line: null, column: null, rule: "wizard-layout", path
  }]);
}

export function parseWizardLayout(content) {
  if (typeof content !== "string" || Buffer.byteLength(content) > MAX_MESSAGE_BYTES) {
    throw invalidLayout("LAYOUT_SIZE", "Return a JSON layout within the message size limit.", "layout");
  }
  try {
    return JSON.parse(content);
  } catch {
    throw invalidLayout("LAYOUT_JSON", "Return a valid JSON layout.", "layout");
  }
}

export function validateWizardLayout(layout, fields, { activeField = "", useDemoRules = false } = {}) {
  if (!hasKeys(layout, ["steps"]) || !Array.isArray(layout.steps) ||
      layout.steps.length === 0 || layout.steps.length > fields.length) {
    throw invalidLayout("LAYOUT_SHAPE", "Return a nonempty steps array with no extra properties.");
  }

  const original = new Map(fields.map((field) => [field.name, field]));
  const stepIds = new Set();
  const steps = [];
  for (const [stepIndex, step] of layout.steps.entries()) {
    const stepPath = `steps[${stepIndex}]`;
    if (!hasKeys(step, ["id", "fields"]) || typeof step.id !== "string" || !stepId.test(step.id) ||
        stepIds.has(step.id) || !Array.isArray(step.fields) ||
        step.fields.length === 0 || step.fields.length > MAX_STEP_FIELDS) {
      throw invalidLayout("LAYOUT_STEP", `Use a unique step ID and 1 to ${MAX_STEP_FIELDS} fields.`, stepPath);
    }

    stepIds.add(step.id);
    const sections = new Set();
    const mapped = [];
    for (const [fieldIndex, field] of step.fields.entries()) {
      const fieldPath = `${stepPath}.fields[${fieldIndex}]`;
      if (!hasKeys(field, ["name", "component"]) || typeof field.name !== "string") {
        throw invalidLayout("LAYOUT_FIELD", "Use only the field name and component keys.", fieldPath);
      }
      const source = original.get(field.name);
      if (!source) throw invalidLayout("LAYOUT_FIELD", "Use each supplied field name exactly once.", fieldPath);
      if (field.component !== componentForType(source.type)) {
        throw invalidLayout("LAYOUT_COMPONENT", "Use Select for select fields and Input for other fields.", fieldPath);
      }
      original.delete(field.name);
      if (source.section) sections.add(source.section);
      mapped.push(Object.freeze({ ...source, component: field.component }));
    }
    if (sections.size > 1) {
      throw invalidLayout("LAYOUT_SECTION", "Group fields from one named section per step.", stepPath);
    }
    const [section] = sections;
    let title = mapped[0].label;
    if (section && mapped.length > 1) {
      title = useDemoRules && Object.hasOwn(DEFAULT_SECTION_TITLES, section)
        ? DEFAULT_SECTION_TITLES[section]
        : section.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_.-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
    }
    steps.push(Object.freeze({ id: step.id, title, fields: Object.freeze(mapped) }));
  }
  if (original.size > 0) throw invalidLayout("LAYOUT_FIELDS_MISSING", "Include every supplied field.");
  return Object.freeze({ componentName: "DynamicFormWizard", activeField, steps: Object.freeze(steps) });
}
