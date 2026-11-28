import { z } from "zod";
import { MAX_MESSAGE_BYTES } from "../config/constants.js";
import { GenerationError } from "../services/generationErrors.js";
import { isIdentifier, isRecord, validateFormFields } from "./formValidator.js";

/**
 * Strict Zod Schema for incoming AuraGen WebSocket telemetry payloads.
 * Supports shared Week 1 telemetry + Week 2/3 Sliding Window scores,
 * cursor coordinates, activeFieldId, and formStateSnapshot.
 */
export const TelemetryMetricsSchema = z.object({
  mouseVelocity: z.number().finite().min(0),
  hesitationMs: z.number().finite().min(0),
  rageClicks: z.number().int().min(0),
  clickErrorRate: z.number().finite().min(0).max(1),
  clickErrorCount: z.number().finite().min(0).optional()
});

export const CursorPositionSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0)
});
export const DomContextSchema = z.object({
  activeFieldId: z.string().optional(),
  activeFieldLabel: z.string().optional(),
  activeSectionId: z.string().optional(),
  completedFieldsCount: z.number().int().min(0).optional(),
  totalFieldsCount: z.number().int().min(0).optional(),
  validationErrors: z.record(z.string(), z.string()).optional(),
  scrollY: z.number().finite().min(0).optional()
});

export const FormStateSnapshotSchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  domContext: DomContextSchema.optional(),
  capturedAt: z.number().finite().positive().optional()
});

export const TelemetryPayloadSchema = z.object({
  type: z.literal("telemetry"),
  sessionId: z.string().max(128).regex(/^[^\u0000-\u001f\u007f]+$/u).trim().min(1),
  timestamp: z.number().int().positive().max(8.64e15),
  metrics: TelemetryMetricsSchema,
  cognitiveLoadScore: z.number().finite().min(0).max(100),
  instantScore: z.number().finite().min(0).max(100).optional(),
  rollingAverageScore: z.number().finite().min(0).max(100).optional(),
  activeField: z.string().refine((field) => field === "" || isIdentifier(field)),
  activeFieldId: z.string().refine((field) => field === "" || isIdentifier(field)).optional(),
  cursor: CursorPositionSchema.optional(),
  formStateSnapshot: FormStateSnapshotSchema.optional(),
  userInput: z.record(z.string(), z.unknown()).optional(),
  formFields: z.array(z.record(z.string(), z.unknown())).optional()
});

export function validateTelemetryMessage(rawMessage) {
  let payload = rawMessage;
  if (typeof rawMessage === "string" || Buffer.isBuffer(rawMessage)) {
    if (Buffer.byteLength(rawMessage) > MAX_MESSAGE_BYTES) {
      return { valid: false, errors: ["Payload exceeds the message size limit."] };
    }
    try {
      payload = JSON.parse(rawMessage.toString());
    } catch {
      return { valid: false, errors: ["Invalid JSON payload."] };
    }
  }
  if (!isRecord(payload)) return { valid: false, errors: ["Payload must be a JSON object."] };
  const parsed = TelemetryPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const errors = new Map();
    for (const { path, message } of parsed.error.issues) {
      const field = path.join(".") || "payload";
      if (errors.has(field)) continue;
      errors.set(field, field === "activeField" || field === "activeFieldId"
        ? `${field}: Provide a field identifier or an empty string.`
        : `${field}: ${message}`);
    }
    return { valid: false, errors: [...errors.values()] };
  }

  const data = parsed.data;
  const activeField = data.activeFieldId || data.activeField;
  let formFields;
  try {
    if (data.formFields !== undefined) formFields = validateFormFields(data.formFields);
    if (formFields && activeField && !formFields.some(({ name }) => name === activeField)) {
      return { valid: false, errors: ['"activeField" must refer to a field in the form schema.'] };
    }
  } catch (error) {
    if (!(error instanceof GenerationError)) throw error;
    return { valid: false, errors: error.issues.map(({ path, message }) => `${path}: ${message}`) };
  }
  return {
    valid: true,
    data: {
      ...data,
      activeField,
      activeFieldId: activeField,
      instantScore: data.instantScore ?? data.cognitiveLoadScore,
      rollingAverageScore: data.rollingAverageScore ?? data.cognitiveLoadScore,
      formFields
    }
  };
}
