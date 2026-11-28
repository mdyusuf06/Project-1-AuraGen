const errors = {
  INVALID_FORM: "Invalid form schema.",
  INVALID_OUTPUT: "The model returned an invalid wizard layout.",
  INVALID_COMPONENT: "The generated component failed validation.",
  GENERATION_BUSY: "Wizard generation is busy. Try again shortly.",
  GENERATION_CANCELLED: "Wizard generation was cancelled.",
  OPENAI_AUTH: "The wizard provider could not authenticate.",
  OPENAI_CONFIGURATION: "The wizard provider configuration is invalid.",
  OPENAI_REQUEST: "The wizard provider rejected the request.",
  OPENAI_TIMEOUT: "The wizard provider timed out.",
  OPENAI_RATE_LIMIT: "The wizard provider is rate limited. Try again shortly.",
  OPENAI_QUOTA: "The wizard provider has no available quota.",
  OPENAI_TOKEN_LIMIT: "The wizard provider reached its token limit.",
  OPENAI_UNAVAILABLE: "The wizard provider is temporarily unavailable.",
  GENERATION_FAILED: "Wizard generation could not be completed."
};

export class GenerationError extends Error {
  constructor(code, issues = []) {
    super(errors[code]);
    this.code = code;
    this.issues = issues;
  }
}

export function publicGenerationError(error) {
  return error instanceof GenerationError ? error : new GenerationError("GENERATION_FAILED");
}
