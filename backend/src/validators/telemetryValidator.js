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
  let parsedJson;

  if (typeof rawMessage === "string") {
    try {
      parsedJson = JSON.parse(rawMessage);
    } catch {
      return {
        valid: false,
        errors: ["Invalid JSON payload."]
      };
    }
  } else if (Buffer.isBuffer(rawMessage)) {
    try {
      parsedJson = JSON.parse(rawMessage.toString("utf-8"));
    } catch {
      return {
        valid: false,
        errors: ["Invalid UTF-8 JSON buffer payload."]
      };
    }
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
  }

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
  };
}
