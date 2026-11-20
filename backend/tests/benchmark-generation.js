import { performance } from "node:perf_hooks";
import { createWizardGenerator } from "../src/services/codeGenService.js";
import { validateTelemetryMessage } from "../src/validators/telemetryValidator.js";

const request = {
  type: "telemetry",
  sessionId: "benchmark",
  timestamp: 1_700_000_000_000,
  metrics: { mouseVelocity: 0, hesitationMs: 0, rageClicks: 0, clickErrorRate: 0 },
  activeField: "annualIncome",
  cognitiveLoadScore: 80
};
const raw = Buffer.from(JSON.stringify(request));
const { generateComponent } = createWizardGenerator({ invoke: null });

async function measure(iterations) {
  const start = performance.now();
  let outputBytes;
  for (let index = 0; index < iterations; index++) {
    const { valid, data } = validateTelemetryMessage(raw);
    if (!valid) throw new Error("Benchmark telemetry rejected");
    const code = await generateComponent({ ...data, score: data.cognitiveLoadScore });
    outputBytes = Buffer.byteLength(code);
  }
  return { elapsedMs: performance.now() - start, outputBytes };
}

await measure(2000);
const samples = [];
for (let sample = 0; sample < 7; sample++) samples.push(await measure(10000));
samples.sort((left, right) => left.elapsedMs - right.elapsedMs);
console.log(JSON.stringify({ iterationsPerSample: 10000, samples: 7, median: samples[3] }));
