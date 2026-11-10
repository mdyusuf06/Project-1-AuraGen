/**
 * Validates incoming WebSocket telemetry payloads against the shared AuraGen JSON format:
 * {
 *   "type": "telemetry",
 *   "sessionId": "abc123",
 *   "timestamp": 1700000000000,
 *   "metrics": {
 *     "mouseVelocity": 0,
 *     "hesitationMs": 0,
 *     "rageClicks": 0,
 *     "clickErrorRate": 0
 *   },
 *   "cognitiveLoadScore": 0,
 *   "activeField": "annualIncome"
 * }
 */

function isFiniteNonNegativeNumber(val) {
  return typeof val === "number" && Number.isFinite(val) && val >= 0;
}

export function validateTelemetryMessage(rawMessage) {
  let payload;

  if (typeof rawMessage === "string") {
    try {
      payload = JSON.parse(rawMessage);
    } catch {
      return {
        valid: false,
        errors: ["Invalid JSON payload."]
      };
    }
  } else if (Buffer.isBuffer(rawMessage)) {
    try {
      payload = JSON.parse(rawMessage.toString("utf-8"));
    } catch {
      return {
        valid: false,
        errors: ["Invalid UTF-8 JSON buffer payload."]
      };
    }
  } else if (rawMessage && typeof rawMessage === "object") {
    payload = rawMessage;
  } else {
    return {
      valid: false,
      errors: ["Payload must be a JSON string or object."]
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      valid: false,
      errors: ["Payload must be a JSON object."]
    };
  }

  const errors = [];

  if (payload.type !== "telemetry") {
    errors.push(`Expected "type" to be "telemetry", received "${String(payload.type)}".`);
  }

  if (typeof payload.sessionId !== "string" || payload.sessionId.trim().length === 0) {
    errors.push(`"sessionId" must be a non-empty string.`);
  }

  if (typeof payload.timestamp !== "number" || !Number.isFinite(payload.timestamp) || payload.timestamp <= 0) {
    errors.push(`"timestamp" must be a positive finite Unix timestamp number.`);
  }

  if (!payload.metrics || typeof payload.metrics !== "object" || Array.isArray(payload.metrics)) {
    errors.push(`"metrics" must be an object containing mouseVelocity, hesitationMs, rageClicks, and clickErrorRate.`);
  } else {
    const { mouseVelocity, hesitationMs, rageClicks, clickErrorRate } = payload.metrics;

    if (!isFiniteNonNegativeNumber(mouseVelocity)) {
      errors.push(`"metrics.mouseVelocity" must be a non-negative number.`);
    }
    if (!isFiniteNonNegativeNumber(hesitationMs)) {
      errors.push(`"metrics.hesitationMs" must be a non-negative number.`);
    }
    if (!isFiniteNonNegativeNumber(rageClicks)) {
      errors.push(`"metrics.rageClicks" must be a non-negative number.`);
    }
    if (!isFiniteNonNegativeNumber(clickErrorRate) || clickErrorRate > 1) {
      errors.push(`"metrics.clickErrorRate" must be a number between 0 and 1.`);
    }
  }

  if (
    typeof payload.cognitiveLoadScore !== "number" ||
    !Number.isFinite(payload.cognitiveLoadScore) ||
    payload.cognitiveLoadScore < 0 ||
    payload.cognitiveLoadScore > 100
  ) {
    errors.push(`"cognitiveLoadScore" must be a finite number between 0 and 100.`);
  }

  if (typeof payload.activeField !== "string") {
    errors.push(`"activeField" must be a string.`);
  }

  if (payload.userInput !== undefined && (typeof payload.userInput !== "object" || Array.isArray(payload.userInput) || payload.userInput === null)) {
    errors.push(`Optional "userInput" must be a plain object if provided.`);
  }

  if (payload.formFields !== undefined && !Array.isArray(payload.formFields)) {
    errors.push(`Optional "formFields" must be an array if provided.`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      type: payload.type,
      sessionId: payload.sessionId.trim(),
      timestamp: payload.timestamp,
      metrics: {
        mouseVelocity: payload.metrics.mouseVelocity,
        hesitationMs: payload.metrics.hesitationMs,
        rageClicks: payload.metrics.rageClicks,
        clickErrorRate: payload.metrics.clickErrorRate
      },
      cognitiveLoadScore: payload.cognitiveLoadScore,
      activeField: payload.activeField,
      // Optional downstream context (ready for Week 3 state preservation)
      userInput: payload.userInput || {},
      formFields: payload.formFields || null
    }
  };
}

