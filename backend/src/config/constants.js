import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { ALL_FORM_FIELDS, FINANCIAL_FORM_SECTIONS } from "../../../frontend/src/data/financialFormSchema.js";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || fileURLToPath(new URL("../../.env", import.meta.url)) });

export const WS_PORT = Number(process.env.WS_PORT || 8080);
export const COGNITIVE_LOAD_THRESHOLD = Number(process.env.COGNITIVE_LOAD_THRESHOLD || 70);
export const GENERATION_COOLDOWN_MS = Number(process.env.GENERATION_COOLDOWN_MS || 3000);
export const USE_TEAMMATE_CODEGEN = process.env.USE_TEAMMATE_CODEGEN === "true";

export const MAX_MESSAGE_BYTES = 32 * 1024;
export const MAX_FIELDS = 40;
export const MAX_STEP_FIELDS = 8;
export const MAX_FIELD_TEXT = 256;

export const DEFAULT_FORM_FIELDS = Object.freeze(ALL_FORM_FIELDS.map((field) => Object.freeze({
  ...field,
  ...(field.options && { options: Object.freeze(field.options.map((option) => Object.freeze({ ...option }))) })
})));
export const DEFAULT_SECTION_TITLES = Object.freeze(Object.fromEntries(
  FINANCIAL_FORM_SECTIONS.map(({ id, title }) => [id, title.replace(/^\d+\.\s+/, "")])
));
