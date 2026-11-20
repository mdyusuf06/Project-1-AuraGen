import { readFileSync } from "node:fs";
import { validateField as validateFinancialField } from "../../../frontend/src/data/financialFormSchema.js";
import { DESIGN_SYSTEM } from "../config/designSystem.js";

const template = readFileSync(new URL("./wizardTemplate.jsx", import.meta.url), "utf8");
const theme = JSON.stringify(Object.fromEntries(
  Object.entries(DESIGN_SYSTEM).map(([name, { variants }]) => [name, variants])
));
const compiled = new WeakMap();

function serializeData(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/gu, (character) =>
    "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0")
  );
}

export function renderWizardSource(wizard, useDemoRules) {
  const existing = useDemoRules ? compiled.get(wizard) : undefined;
  if (existing !== undefined) return existing;

  // The checked-in demo validator uses ALL_FORM_FIELDS as its only module binding.
  const demoValidation = useDemoRules
    ? `const ALL_FORM_FIELDS = fields;\nconst validateDemoField = ${validateFinancialField.toString()};`
    : "const validateDemoField = null;";
  const source = `import React, { useEffect, useId, useRef, useState } from "react";
const wizard = ${serializeData(wizard)};
const theme = ${theme};
const fields = wizard.steps.flatMap((step) => step.fields);
${demoValidation}

${template}`;
  if (useDemoRules) compiled.set(wizard, source);
  return source;
}
