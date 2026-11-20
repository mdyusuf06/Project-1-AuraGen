import { DEFAULT_SECTION_TITLES, MAX_MESSAGE_BYTES, MAX_STEP_FIELDS } from "../config/constants.js";
import { componentForType } from "../config/designSystem.js";
import { GenerationError } from "../services/generationErrors.js";
import { isRecord } from "./formValidator.js";

const stepId = /^[a-z][a-z0-9_-]{0,63}$/;

function hasKeys(record, keys) {
  return isRecord(record) && Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key));
}

export function parseWizardLayout(content) {
  if (typeof content !== "string" || Buffer.byteLength(content) > MAX_MESSAGE_BYTES) {
    throw new GenerationError("INVALID_OUTPUT");
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new GenerationError("INVALID_OUTPUT");
  }
}

export function validateWizardLayout(layout, fields, { activeField = "", useDemoRules = false } = {}) {
  const reject = () => { throw new GenerationError("INVALID_OUTPUT"); };
  if (!hasKeys(layout, ["steps"]) || !Array.isArray(layout.steps) ||
      layout.steps.length === 0 || layout.steps.length > fields.length) reject();

  const original = new Map(fields.map((field) => [field.name, field]));
  const stepIds = new Set();
  const steps = [];
  for (const step of layout.steps) {
    if (!hasKeys(step, ["id", "fields"]) || typeof step.id !== "string" || !stepId.test(step.id) ||
        stepIds.has(step.id) || !Array.isArray(step.fields) ||
        step.fields.length === 0 || step.fields.length > MAX_STEP_FIELDS) reject();

    stepIds.add(step.id);
    const sections = new Set();
    const mapped = [];
    for (const field of step.fields) {
      if (!hasKeys(field, ["name", "component"]) || typeof field.name !== "string") reject();
      const source = original.get(field.name);
      if (!source || field.component !== componentForType(source.type)) reject();
      original.delete(field.name);
      if (source.section) sections.add(source.section);
      mapped.push(Object.freeze({ ...source, component: field.component }));
    }
    if (sections.size > 1) reject();
    const [section] = sections;
    let title = mapped[0].label;
    if (section && mapped.length > 1) {
      title = useDemoRules && Object.hasOwn(DEFAULT_SECTION_TITLES, section)
        ? DEFAULT_SECTION_TITLES[section]
        : section.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_.-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
    }
    steps.push(Object.freeze({ id: step.id, title, fields: Object.freeze(mapped) }));
  }
  if (original.size > 0) reject();
  return Object.freeze({ componentName: "DynamicFormWizard", activeField, steps: Object.freeze(steps) });
}
