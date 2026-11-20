<<<<<<< HEAD
import { z } from "zod";

/**
 * Strict Zod Schema for incoming AuraGen WebSocket telemetry payloads.
 * Supports shared Week 1 telemetry + Week 2/3 Sliding Window scores,
 * cursor coordinates, activeFieldId, and formStateSnapshot.
 */
export const TelemetryMetricsSchema = z.object({
  mouseVelocity: z.number().finite().min(0),
  hesitationMs: z.number().finite().min(0),
  rageClicks: z.number().finite().min(0),
  clickErrorRate: z.number().finite().min(0).max(1),
  clickErrorCount: z.number().finite().min(0).optional()
});

export const CursorPositionSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0)
});
=======
import { MAX_MESSAGE_BYTES } from "../config/constants.js";
import { GenerationError } from "../services/generationErrors.js";
import { isIdentifier, isRecord, isScore, validateFormFields } from "./formValidator.js";

const metricKeys = ["mouseVelocity", "hesitationMs", "rageClicks", "clickErrorRate"];
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)

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
  sessionId: z.string().trim().min(1, "sessionId must be a non-empty string"),
  timestamp: z.number().finite().positive("timestamp must be a positive Unix ms number"),
  metrics: TelemetryMetricsSchema,
  cognitiveLoadScore: z.number().finite().min(0).max(100),
  instantScore: z.number().finite().min(0).max(100).optional(),
  rollingAverageScore: z.number().finite().min(0).max(100).optional(),
  activeField: z.string(),
  activeFieldId: z.string().optional(),
  cursor: CursorPositionSchema.optional(),
  formStateSnapshot: FormStateSnapshotSchema.optional(),
  userInput: z.record(z.string(), z.unknown()).optional(),
  formFields: z.array(z.record(z.string(), z.unknown())).optional()
});

/**
 * Validates and normalizes an incoming WebSocket telemetry message using Zod.
 *
 * @param {string|Buffer|object} rawMessage
 * @returns {{ valid: true, data: object } | { valid: false, errors: string[] }}
 */
export function validateTelemetryMessage(rawMessage) {
<<<<<<< HEAD
  let parsedJson;

  if (typeof rawMessage === "string") {
    try {
      parsedJson = JSON.parse(rawMessage);
    } catch {
      return {
        valid: false,
        errors: ["Invalid JSON payload."]
      };
=======
  let payload = rawMessage;
  if (typeof rawMessage === "string" || Buffer.isBuffer(rawMessage)) {
    if (Buffer.byteLength(rawMessage) > MAX_MESSAGE_BYTES) {
      return { valid: false, errors: ["Payload exceeds the message size limit."] };
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
    }
    try {
<<<<<<< HEAD
      parsedJson = JSON.parse(rawMessage.toString("utf-8"));
=======
      payload = JSON.parse(rawMessage.toString());
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
    } catch {
      return { valid: false, errors: ["Invalid JSON payload."] };
    }
<<<<<<< HEAD
  } else if (rawMessage && typeof rawMessage === "object") {
    parsedJson = rawMessage;
  } else {
    return {
      valid: false,
      errors: ["Payload must be a JSON string or object."]
    };
  }

  const result = TelemetryPayloadSchema.safeParse(parsedJson);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "payload";
      return `${path}: ${issue.message}`;
    });

    return {
      valid: false,
      errors
    };
=======
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
  }
  if (!isRecord(payload)) return { valid: false, errors: ["Payload must be a JSON object."] };

<<<<<<< HEAD
  const data = result.data;
  const instantScore = data.instantScore ?? data.cognitiveLoadScore;
  const rollingAverageScore = data.rollingAverageScore ?? data.cognitiveLoadScore;
  const activeField = data.activeFieldId || data.activeField;
  const userInput = data.formStateSnapshot?.values || data.userInput || {};

  return {
    valid: true,
    data: {
      ...data,
      instantScore,
      rollingAverageScore,
      activeField,
      activeFieldId: activeField,
      userInput,
      formFields: data.formFields || null
    }
=======
  const errors = [];
  const { type, sessionId, timestamp, metrics, cognitiveLoadScore, activeField, userInput, formFields } = payload;
  if (type !== "telemetry") errors.push('Expected message type "telemetry".');
  if (typeof sessionId !== "string" || sessionId.length > 128 || !sessionId.trim() || /[\u0000-\u001f\u007f]/.test(sessionId)) {
    errors.push('"sessionId" must be a non-empty string of at most 128 characters.');
  }
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || timestamp > 8.64e15) {
    errors.push('"timestamp" must be a valid positive Unix timestamp in milliseconds.');
  }
  if (!isRecord(metrics)) {
    errors.push('"metrics" must be an object.');
  } else {
    for (const key of metricKeys) {
      if (!Number.isFinite(metrics[key]) || metrics[key] < 0 ||
          (key === "rageClicks" && !Number.isSafeInteger(metrics[key])) ||
          (key === "clickErrorRate" && metrics[key] > 1)) {
        errors.push(`"metrics.${key}" is out of range.`);
      }
    }
  }
  if (!isScore(cognitiveLoadScore)) errors.push('"cognitiveLoadScore" must be between 0 and 100.');
  if (activeField !== "" && !isIdentifier(activeField)) errors.push('"activeField" must be a field identifier or empty.');
  if (userInput !== undefined && !isRecord(userInput)) errors.push('"userInput" must be an object if provided.');
  if (errors.length > 0) return { valid: false, errors };

  let validatedFields;
  try {
    // Validate even on low-score messages. Keep the application values out of generation.
    if (formFields !== undefined) validatedFields = validateFormFields(formFields);
    if (validatedFields && activeField && !validatedFields.some(({ name }) => name === activeField)) {
      return { valid: false, errors: ['"activeField" must refer to a field in the form schema.'] };
    }
  } catch (error) {
    if (!(error instanceof GenerationError)) throw error;
    return { valid: false, errors: error.issues.map(({ path, message }) => `${path}: ${message}`) };
  }
  return {
    valid: true,
    data: { type, sessionId: sessionId.trim(), timestamp, cognitiveLoadScore, activeField, formFields: validatedFields }
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)
  };
}
