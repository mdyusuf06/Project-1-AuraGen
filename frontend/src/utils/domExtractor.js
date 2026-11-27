/**
 * AuraGen Autonomous DOM Schema Extractor & Enterprise PII Privacy Engine
 *
 * 1. extractFormSchemaFromDOM:
 *    Scans whichever form is currently mounted in the DOM (Infotact Finance,
 *    Infosys Career Portal, or any third-party HTML form), extracts labels,
 *    input types, select options, validation errors, and live values.
 *
 * 2. maskSensitivePII / unmaskSensitivePII:
 *    Masks sensitive PII fields ([REDACTED_PII]) before leaving the browser
 *    when Enterprise Privacy Mode is enabled, and restores them locally upon
 *    dynamic wizard injection.
 */

const SENSITIVE_FIELD_PATTERNS = [
  /taxid/i,
  /ssn/i,
  /uan/i,
  /epfo/i,
  /phone/i,
  /mobile/i,
  /income/i,
  /salary/i,
  /ctc/i,
  /balance/i,
  /debt/i,
  /loan/i,
  /dateofbirth/i,
  /dob/i
];

export function isSensitiveField(fieldName = "") {
  return SENSITIVE_FIELD_PATTERNS.some((rx) => rx.test(String(fieldName)));
}

/**
 * Masks sensitive user values into deterministic tokens before WebSocket transmission.
 * Returns { maskedValues, piiVault, maskedCount }.
 */
export function maskSensitivePII(values = {}) {
  const maskedValues = {};
  const piiVault = {};
  let maskedCount = 0;

  for (const [key, val] of Object.entries(values || {})) {
    const hasValue = val !== undefined && val !== null && String(val).trim() !== "";
    if (hasValue && isSensitiveField(key)) {
      const token = `[REDACTED_PII:${key}]`;
      piiVault[token] = val;
      maskedValues[key] = token;
      maskedCount += 1;
    } else {
      maskedValues[key] = val;
    }
  }

  return { maskedValues, piiVault, maskedCount };
}

/**
 * Restores masked [REDACTED_PII:...] tokens locally inside the browser before
 * injecting initialValues into DynamicRenderer.
 */
export function unmaskSensitivePII(values = {}, piiVault = {}) {
  if (!values || typeof values !== "object") return values;
  const restored = {};
  for (const [key, val] of Object.entries(values)) {
    if (typeof val === "string" && val in piiVault) {
      restored[key] = piiVault[val];
    } else {
      restored[key] = val;
    }
  }
  return restored;
}

/**
 * Autonomous DOM Schema Extractor:
 * Inspects a live mounted <form> container to build a structured schema
 * without hardcoding fields.
 */
export function extractFormSchemaFromDOM(
  rootElement = null,
  reactValues = {},
  reactErrors = {},
  activeField = "",
  formId = "auto-detected-form"
) {
  const extractedFields = [];
  const seen = new Set();

  if (typeof document !== "undefined") {
    const container =
      rootElement ||
      document.querySelector("[data-auragen-form]") ||
      document.querySelector("form");

    if (container) {
      const detectedFormId = container.getAttribute?.("data-auragen-form");
      if (detectedFormId) {
        formId = detectedFormId;
      }

      const controls = container.querySelectorAll("input, select, textarea");
      controls.forEach((el) => {
        const name = el.getAttribute("name") || el.getAttribute("id");
        if (!name || seen.has(name)) return;
        seen.add(name);

        // Resolve human-readable label from DOM <label for="...">
        let label = "";
        const id = el.getAttribute("id") || name;
        const labelEl = container.querySelector(`label[for="${id}"]`);
        if (labelEl) {
          label = labelEl.textContent?.replace(/\*/g, "").replace(/Active focus/i, "").trim() || "";
        }

        const sectionEl = el.closest("section");
        const sectionHeading = sectionEl?.querySelector("h2")?.textContent?.trim() || "";
        const sectionId = sectionEl?.getAttribute("data-section-id") || sectionHeading || "general";

        const tagName = el.tagName.toLowerCase();
        const type = tagName === "select" ? "select" : tagName === "textarea" ? "textarea" : el.getAttribute("type") || "text";
        const placeholder = el.getAttribute("placeholder") || "";
        const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";

        let options = null;
        if (tagName === "select") {
          options = Array.from(el.querySelectorAll("option"))
            .filter((opt) => opt.value !== "")
            .map((opt) => ({ value: opt.value, label: opt.textContent?.trim() || opt.value }));
        }

        const domValue = el.value;
        const value = reactValues[name] !== undefined ? reactValues[name] : domValue;
        const error = reactErrors[name] || (el.getAttribute("aria-invalid") === "true" ? "Validation error" : null);

        extractedFields.push({
          name,
          label: label || name,
          type,
          placeholder,
          required,
          section: sectionId,
          ...(options ? { options } : {}),
          ...(error ? { error } : {}),
          value: value ?? ""
        });
      });
    }
  }

  return {
    formId,
    activeField,
    extractedCount: extractedFields.length,
    fields: extractedFields,
    validationErrors: { ...(reactErrors || {}) },
    extractedAt: Date.now()
  };
}
