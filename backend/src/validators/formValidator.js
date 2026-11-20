import { MAX_FIELDS, MAX_FIELD_TEXT, MAX_MESSAGE_BYTES } from "../config/constants.js";
import { INPUT_TYPES } from "../config/designSystem.js";
import { GenerationError } from "../services/generationErrors.js";

const identifier = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const reservedNames = new Set(["constructor", "prototype", "__proto__"]);
const controlCharacters = /[\u0000-\u001f\u007f]/u;
const types = new Set([...INPUT_TYPES, "select"]);
const constraintKeys = ["min", "max", "step", "minLength", "maxLength"];
const fieldKeys = new Set([
  "name", "label", "type", "required", "section", "placeholder", "helpText", "options",
  "validation", ...constraintKeys
]);
const optionKeys = new Set(["value", "label"]);
const ruleKeys = new Set(constraintKeys);
const validatedSchemas = new WeakSet();

export function isRecord(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

export function isIdentifier(value) {
  return typeof value === "string" && identifier.test(value) && !reservedNames.has(value);
}

export function isScore(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function isText(value, allowEmpty = false) {
  return typeof value === "string" && value.length <= MAX_FIELD_TEXT &&
    (allowEmpty || value.trim().length > 0) && !controlCharacters.test(value);
}

function validDate(value) {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = new Date(value);
  return Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === value;
}

function validStep(value) {
  if (value === "any") return true;
  if (typeof value === "string" && (value.length > 32 || !/^\d+(?:\.\d+)?$/.test(value))) return false;
  const step = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(step) && step > 0;
}

function validConstraints(field) {
  const nested = field.validation === undefined ? {} : field.validation;
  if (!isRecord(nested) || Object.keys(nested).some((key) => !ruleKeys.has(key))) return false;
  if (constraintKeys.some((key) => Object.hasOwn(nested, key) && Object.hasOwn(field, key))) return false;

  const { min = field.min, max = field.max, step = field.step, minLength = field.minLength,
    maxLength = field.maxLength } = nested;
  if (min !== undefined || max !== undefined || step !== undefined) {
    if (field.type !== "number" && field.type !== "date") return false;
    const validBound = field.type === "number" ? Number.isFinite : validDate;
    if ((min !== undefined && !validBound(min)) || (max !== undefined && !validBound(max)) ||
        (min !== undefined && max !== undefined && min > max) ||
        (step !== undefined && !validStep(step))) return false;
  }
  if (minLength !== undefined || maxLength !== undefined) {
    if (!["text", "email", "tel"].includes(field.type)) return false;
    const validLength = (length) => Number.isInteger(length) && length >= 0 && length <= 4096;
    if ((minLength !== undefined && !validLength(minLength)) ||
        (maxLength !== undefined && !validLength(maxLength)) ||
        (minLength !== undefined && maxLength !== undefined && minLength > maxLength)) return false;
  }
  return true;
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length === 0 || options.length > 30) return null;
  const values = new Set();
  const normalized = [];
  for (const [index, supplied] of options.entries()) {
    const option = typeof supplied === "string" ? { value: supplied, label: supplied } : supplied;
    if (!isRecord(option) || Object.keys(option).some((key) => !optionKeys.has(key)) ||
        !isText(option.value, true) || !isText(option.label) ||
        (option.value !== "" && !option.value.trim()) ||
        (option.value === "" && index !== 0) || values.has(option.value)) return null;
    values.add(option.value);
    normalized.push(Object.freeze({ value: option.value, label: option.label }));
  }
  return normalized.some(({ value }) => value !== "") ? Object.freeze(normalized) : null;
}

function invalid(path, message) {
  throw new GenerationError("INVALID_FORM", [{ path, message }]);
}

export function validateFormFields(fields) {
  if (validatedSchemas.has(fields)) return fields;
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > MAX_FIELDS) {
    invalid("formFields", `Provide 1 to ${MAX_FIELDS} fields.`);
  }
  const names = new Set();
  const validated = [];
  for (const [index, field] of fields.entries()) {
    const path = `formFields[${index}]`;
    if (!isRecord(field) || Object.keys(field).some((key) => !fieldKeys.has(key))) {
      invalid(path, "Use only supported field properties.");
    }
    if (!isIdentifier(field.name)) invalid(`${path}.name`, "Provide a valid field identifier.");
    if (names.has(field.name)) invalid(`${path}.name`, "Field identifiers must be unique.");
    names.add(field.name);
    if (!types.has(field.type)) invalid(`${path}.type`, "Use a supported field type.");
    if (!isText(field.label)) invalid(`${path}.label`, "Provide a short, non-empty label.");
    if (field.required !== undefined && typeof field.required !== "boolean") {
      invalid(`${path}.required`, "Use a boolean required flag.");
    }
    if (field.section !== undefined && !isIdentifier(field.section)) {
      invalid(`${path}.section`, "Use a valid section identifier.");
    }
    for (const key of ["placeholder", "helpText"]) {
      if (field[key] !== undefined && !isText(field[key], true)) {
        invalid(`${path}.${key}`, "Use a short plain-text string.");
      }
    }
    const options = field.type === "select" ? normalizeOptions(field.options) : null;
    if ((field.type === "select" && !options) || (field.type !== "select" && field.options !== undefined)) {
      invalid(`${path}.options`, "Only select fields accept options and must have unique, usable choices.");
    }
    if (!validConstraints(field)) invalid(`${path}.validation`, "Use supported validation rules with valid bounds.");
    validated.push(Object.freeze({
      ...field,
      required: field.required ?? false,
      ...(options && { options }),
      ...(field.validation && { validation: Object.freeze({ ...field.validation }) })
    }));
  }
  if (Buffer.byteLength(JSON.stringify(validated)) > MAX_MESSAGE_BYTES) {
    invalid("formFields", "Form schema exceeds the size limit.");
  }
  validatedSchemas.add(validated);
  return Object.freeze(validated);
}
