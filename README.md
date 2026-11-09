# AuraGen: Self-Healing Generative UI via Cognitive Load
### Week 1: LangChain.js Code-Generation Pipeline

> **Infotact Solutions – Advanced Generative AI Engineering**  
> *Self-Healing UI via Real-Time Cognitive Load Telemetry & On-the-Fly React Code Generation*

---

## 🌟 Executive Summary

Standard web forms and dashboards are static and rigid. When a user is confused by a complex multi-section form, they are typically forced to read dense tooltips, contact customer support, or abandon the task entirely. Existing GenAI solutions are disconnected from the application (e.g., side chatbots), forcing users to pause their active workflow.

**AuraGen** redefines human-computer interaction by making the user interface **self-healing**:
1. The frontend continuously tracks cursor velocity, hesitation times, and rage-clicks to compute a real-time **Cognitive Load Score (0–100)**.
2. When high cognitive friction is detected (e.g., score > 75 on a specific field like \`annualIncome\`), the backend LLM triggers.
3. The **LangChain.js Code-Gen Pipeline** analyzes the exact friction point, original form schema, and user-entered values.
4. It synthesizes an intuitive, multi-step, conversational React wizard styled strictly to the **Infotact Design System** (Tailwind CSS), preserving every character previously entered.
5. In subsequent weeks, this code is validated by a Babel AST security layer and injected dynamically into the client DOM via WebSockets with zero page reload.

---

## 📁 Project Architecture & Folder Structure

```
AuraGen (Infotact Solutions)/
├── package.json                   # Dependencies: @langchain/openai, @langchain/core, dotenv
├── .env.example                   # Environment configuration template
├── .env                           # Local environment variables (API keys, model)
├── .gitignore                     # Git ignore rules
├── README.md                      # Comprehensive documentation and run guide
├── src/
│   ├── index.js                   # Unified module exports
│   ├── agent.js                   # Main generateComponent() agent with retry loop & validation
│   ├── chains/
│   │   └── codeGenChain.js        # LCEL pipeline: Prompt -> ChatOpenAI (GPT-4o) -> Parser
│   ├── config/
│   │   └── designSystem.js        # Infotact Design System tokens & System Prompt specification
│   ├── parsers/
│   │   └── codeBlockParser.js     # Custom BaseOutputParser stripping markdown backticks
│   └── prompts/
│       └── codeGenPrompt.js       # ChatPromptTemplate uniting system rules & friction context
└── tests/
    ├── test-codegen.js            # Comprehensive test suite (Unit, retry, live & mock E2E)
    └── output/                    # Output directory for generated React component artifacts
        └── GeneratedWizardComponent.jsx
```

---

## 🔄 LangChain LCEL Pipeline

```
┌────────────────────────────────────────────────────────┐
│                   Input Parameters                     │
│  { activeField, formFields, userInput, score }        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               src/prompts/codeGenPrompt.js             │
│  - SystemMessage: Design System tokens & safety rules  │
│  - HumanMessage: Telemetry, friction spot, form schema │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              src/chains/codeGenChain.js                │
│  ChatOpenAI (GPT-4o, temperature: 0.2)                 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             src/parsers/codeBlockParser.js             │
│  Extracts raw JSX code block, strips markdown fences   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             src/agent.js (AST Pre-Validator)           │
│  1. Check: Non-empty code string                       │
│  2. Check: Has "export default function ..."           │
│  3. Check: Pure Tailwind classes                       │
│  4. Safety: No eval(), new Function(), fetch(), window │
└─────────────┬────────────────────────────┬─────────────┘
              │ Valid                      │ Invalid (Retry <= 2)
              ▼                            ▼
       [Return Raw Code]         [Append Error Feedback & Retry]
```

---

## 🛡️ Strict Prompt & Security Constraints

The pipeline enforces strict security and architectural rules at both the prompt level and validation level:

1. **Single Default Export**: Must export exactly one functional component:
   \`\`\`jsx
   export default function DynamicFormWizard({ initialValues = {}, onSubmit, onStepChange, onCancel }) { ... }
   \`\`\`
2. **Pure Tailwind CSS**: Only Tailwind classes (no external CSS files, no style tags).
3. **No External Component Imports**: No Material UI, Ant Design, or lucide-react. Icons are self-contained inline SVGs.
4. **Zero Malicious Execution**:
   - 🚫 `eval()` or `new Function()`
   - 🚫 Network calls: `fetch()`, `axios`, `XMLHttpRequest`, `WebSocket`
   - 🚫 Global DOM manipulation: `window`, `document`, `localStorage`, `sessionStorage`
5. **State Preservation**: Component initializes form state using `initialValues` merged with `userInput` so the user never re-types data.
6. **Automatic Retries**: If the output is empty or lacks a default export, the agent automatically retries up to **2 times** (3 total attempts), appending targeted error feedback into the next prompt.

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (tested on Node v25)
- **OpenAI API Key** (with GPT-4o access)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and configure your OpenAI API key:
```ini
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL_NAME=gpt-4o
OPENAI_TEMPERATURE=0.2
MAX_RETRIES=2
```

---

## 🧪 Running the Tests

The project includes an end-to-end test suite (`tests/test-codegen.js`) that tests:
- Clean markdown code block stripping via `CodeBlockOutputParser`
- Security and structure pre-validation (catching `eval`, `fetch`, missing exports)
- `PromptTemplate` message formatting with dynamic friction telemetry
- The 2-attempt retry recovery engine
- End-to-end component generation on a sample complex 12-field financial application

### Option A: Local / Mock Mode (No OpenAI credits needed)
Runs all tests offline in mock simulation mode:
```bash
npm run test:mock
```

### Option B: Live GPT-4o Generation
Runs tests against live OpenAI GPT-4o (requires valid `OPENAI_API_KEY` in `.env`):
```bash
npm test
```

When test 5 completes, the generated self-healing React component is saved to:
`tests/output/GeneratedWizardComponent.jsx`

---

## 💻 API Reference

### `generateComponent({ activeField, formFields, userInput, score }, options)`

Generates a validated React code string tailored to the user's friction point.

```javascript
import { generateComponent } from "./src/index.js";

const rawCode = await generateComponent({
  // Field where user experienced hesitation or rage clicks
  activeField: "annualIncome",

  // Schema or array of fields from the complex static form
  formFields: [
    { name: "businessLegalName", label: "Business Legal Name", type: "text" },
    { name: "annualIncome", label: "Net Owner Annual Income", type: "number" },
    { name: "requestedFacilityAmount", label: "Facility Amount", type: "number" }
  ],

  // Data the user has already entered before getting stuck
  userInput: {
    businessLegalName: "Apex Meridian Logistics LLC",
    requestedFacilityAmount: 350000
  },

  // Real-time Cognitive Load Score (0-100)
  score: 88
});

console.log(rawCode);
```

### Shared Telemetry Message Format (AuraGen Protocol)
```json
{
  "type": "telemetry",
  "sessionId": "sess_infotact_9921",
  "timestamp": 1700000000000,
  "metrics": {
    "mouseVelocity": 480.2,
    "hesitationMs": 14500,
    "rageClicks": 7,
    "clickErrorRate": 0.52
  },
  "cognitiveLoadScore": 88,
  "activeField": "annualIncome"
}
```

### Server Reply Format
```json
{
  "type": "component",
  "code": "export default function DynamicFormWizard({ initialValues = {}, onSubmit }) { ... }"
}
```

---

## 🔮 Roadmap & Next Steps

- **Week 1 (Completed)**: LangChain.js code-gen pipeline, GPT-4o prompt engineering, Infotact design system, extraction parser, and retry engine.
- **Week 2**: Babel AST security validation layer (Node.js) & in-browser dynamic compiler (Next.js Suspense shell).
- **Week 3**: Framer Motion layout morphing transitions & WebSocket streaming server.
- **Week 4**: Token streaming latency optimization (< 2s) & automated fallback degradation.

