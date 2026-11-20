import { addAbortListener } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { ChatOpenAI } from "@langchain/openai";
import { GenerationError } from "./generationErrors.js";
import { WIZARD_RESPONSE_FORMAT } from "./wizardPrompt.js";

const transientStatus = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const networkErrors = new Set(["APIConnectionError", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENETUNREACH", "EPIPE"]);
const timeoutErrors = new Set(["TimeoutError", "APIConnectionTimeoutError", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"]);
const tracingFlags = ["LANGCHAIN_VERBOSE", "LANGCHAIN_TRACING_V2", "LANGSMITH_TRACING"];

function classify(error) {
  const status = error?.status;
  const code = error?.code ?? error?.error?.code ?? error?.cause?.code;
  if (error instanceof GenerationError) return { error, retryable: false };
  if (code === "context_length_exceeded" || error?.name === "ContextOverflowError") {
    return { error: new GenerationError("OPENAI_TOKEN_LIMIT"), retryable: false };
  }
  if (status === 401 || status === 403) return { error: new GenerationError("OPENAI_AUTH"), retryable: false };
  if (status === 429 && ["insufficient_quota", "billing_hard_limit_reached"].includes(code)) {
    return { error: new GenerationError("OPENAI_QUOTA"), retryable: false };
  }
  if (status === 429) return { error: new GenerationError("OPENAI_RATE_LIMIT"), retryable: true };
  if (status === 408 || timeoutErrors.has(error?.name) || timeoutErrors.has(code)) {
    return { error: new GenerationError("OPENAI_TIMEOUT"), retryable: true };
  }
  if (transientStatus.has(status) || networkErrors.has(error?.name) || networkErrors.has(code)) {
    return { error: new GenerationError("OPENAI_UNAVAILABLE"), retryable: true };
  }
  if (status >= 400 && status < 500) return { error: new GenerationError("OPENAI_REQUEST"), retryable: false };
  return { error: new GenerationError("OPENAI_UNAVAILABLE"), retryable: false };
}

function retryAfterMs(headers) {
  const milliseconds = headers?.get?.("retry-after-ms") ?? headers?.["retry-after-ms"];
  if (milliseconds && Number.isFinite(Number(milliseconds))) return Math.max(0, Number(milliseconds));
  const value = headers?.get?.("retry-after") ?? headers?.["retry-after"];
  if (!value) return 0;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Math.max(0, Date.parse(value) - Date.now()) || 0;
}

async function withAbort(run, signal) {
  signal.throwIfAborted();
  let listener;
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        signal.throwIfAborted();
        return run(signal);
      }),
      new Promise((_, reject) => {
        listener = addAbortListener(signal, () => reject(signal.reason));
      })
    ]);
  } finally {
    listener?.[Symbol.dispose]();
  }
}

let invoke;
export function createOpenAIWizardInvoker({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL_NAME || "gpt-4o",
  temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.2),
  configuration
} = {}) {
  if (!apiKey?.trim() || apiKey === "your_openai_api_key_here") throw new GenerationError("OPENAI_AUTH");
  if (!model.trim() || !Number.isFinite(temperature) || temperature < 0 || temperature > 2 ||
      tracingFlags.some((flag) => process.env[flag] === "true" || process.env[flag] === "1")) {
    throw new GenerationError("OPENAI_CONFIGURATION");
  }
  const client = new ChatOpenAI({
    apiKey,
    model,
    temperature,
    maxRetries: 0,
    maxTokens: 3500,
    modelKwargs: { store: false },
    useResponsesApi: false,
    verbose: false,
    configuration
  });
  return (messages, signal) => client.invoke(messages, { signal, response_format: WIZARD_RESPONSE_FORMAT });
}

export function invokeOpenAIWizard(messages, signal) {
  invoke ??= createOpenAIWizardInvoker();
  return invoke(messages, signal);
}

export async function requestWizardLayout(invoke, messages, {
  timeoutMs,
  attemptTimeoutMs,
  maxAttempts,
  retryBaseMs,
  signal
}) {
  const deadline = Date.now() + timeoutMs;
  const timeout = new AbortController();
  const deadlineTimer = setTimeout(() => timeout.abort(new DOMException("Deadline exceeded", "TimeoutError")), timeoutMs);
  const overall = timeout.signal;
  const requestSignal = signal ? AbortSignal.any([signal, overall]) : overall;

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal?.aborted) throw new GenerationError("GENERATION_CANCELLED");
      if (overall.aborted) throw new GenerationError("OPENAI_TIMEOUT");
      const attemptSignal = AbortSignal.any([requestSignal, AbortSignal.timeout(attemptTimeoutMs)]);
      try {
        return await withAbort((currentSignal) => invoke(messages, currentSignal), attemptSignal);
      } catch (cause) {
        if (signal?.aborted) throw new GenerationError("GENERATION_CANCELLED");
        if (overall.aborted) throw new GenerationError("OPENAI_TIMEOUT");
        const { error, retryable } = classify(cause);
        if (!retryable || attempt === maxAttempts - 1) throw error;
        const backoff = retryBaseMs * 2 ** attempt * (0.5 + Math.random() * 0.5);
        const wait = Math.max(backoff, retryAfterMs(cause?.headers));
        if (wait >= deadline - Date.now()) throw error;
        try {
          await delay(wait, undefined, { signal: requestSignal });
        } catch {
          throw new GenerationError(signal?.aborted ? "GENERATION_CANCELLED" : "OPENAI_TIMEOUT");
        }
      }
    }
  } finally {
    clearTimeout(deadlineTimer);
  }
}
