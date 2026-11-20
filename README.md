# AuraGen – Self-Healing Generative UI via Cognitive Load

> **Infotact Solutions – Advanced Generative AI Engineering (Week 1 Full-Stack Monorepo)**  
> Real-time WebSocket telemetry, the financial form demo, and schema-driven wizard generation.

---

## 🌟 Overview

Standard enterprise forms are rigid. When a user struggles on a complex financial disclosure form, AuraGen tracks behavioral friction signals (mouse velocity, hesitation time, rage clicks, click-error rate) to calculate a real-time **Cognitive Load Score (0–100)**. When the score crosses the configured threshold (`>= 70`), the Node.js WebSocket server invokes `generateComponent()` and pushes a custom, simplified React wizard component (`{ type: "component", code }`) back to the browser.

<<<<<<< HEAD
### Week 1–2/3 Bridge Architecture
- **Backend (`/backend`)**:
  - **Zod Payload Validation (`src/validators/telemetryValidator.js`)**: Strict `zod` schema validating telemetry packets (`cursor`, `metrics`, `instantScore`, `rollingAverageScore`, `activeFieldId`, `formStateSnapshot`).
  - **In-Memory LRU Session Store (`src/store/sessionStore.js`)**: Aggregates per-`sessionId` telemetry over time, tracks per-field friction hotspots, and exposes `GET /api/sessions/:sessionId/metrics` (plus `GET /api/sessions`).
  - **Code-Gen Trigger (`src/server.js`)**: Evaluates `rollingAverageScore >= threshold`, passes preserved `formStateSnapshot.values` and `domContext` into `generateComponent()`, and returns `{ type: "component", code }`.
- **Frontend (`/frontend`)**:
  - **WebSocket State Machine (`src/hooks/useWebSocket.js` & `src/services/wsService.js`)**: Explicit states (`CONNECTING`, `CONNECTED`, `RECONNECTING`, `DISCONNECTED`), exponential backoff with jitter, `sendTelemetry`, and `onMessage`.
  - **5-Second Sliding Window Telemetry & State Serialization (`src/hooks/useTelemetry.js`)**: Tracks velocity, hesitation, rage clicks, click errors, computes both `instantScore` and 5s `rollingAverageScore` to prevent false positives, and serializes `formStateSnapshot` (typed values + DOM context) when threshold is breached.
  - **Field-Level Financial Form (`src/components/FinancialForm.jsx`)**: 21-field, 5-section financial disclosure form (`Personal`, `Employment`, `Income`, `Assets`, `Liabilities`) with `onFocus`, `onBlur`, and `onMouseMove` tracking.
  - **Live Mouse Trajectory Heatmap & Floating Debug HUD (`src/components/TelemetryHUD.jsx`)**: Togglable full-screen HTML5 `<canvas>` (`pointer-events: none`) rendering smooth green-to-red cursor trajectories + a floating corner Debug HUD with live metrics and Session Store API polling.
=======
### Week 1 Scope
- **Backend (`/backend`)** validates the form and telemetry, applies the cognitive-load threshold, and generates a wizard layout locally or through LangChain and OpenAI. A fixed template converts the validated layout to the `{ type: "component", code }` response.
- **Frontend (`/frontend`)**: Next.js (App Router) + Tailwind CSS app featuring:
  - Resilient WebSocket client service & `useWebSocket` React hook (auto-reconnect with exponential backoff, connection status, `sendTelemetry`, `onMessage`).
  - Behavioral `useTelemetry` hook tracking mouse velocity, field hesitation, rage clicks, and click errors.
  - Complex 21-field, 5-section financial application (`Personal`, `Employment`, `Income`, `Assets`, `Liabilities`) with full client-side validation.
  - Live Telemetry HUD & Week 1 Code Inspector Drawer.

*(Note: Babel AST validation, in-browser dynamic compilation, DOM state preservation, Framer Motion morphing, and streaming fallbacks belong to Weeks 2–4.)*
>>>>>>> e6820a9 (feat: implement AuraGen design system and secure wizard generation)

---

## 📁 Monorepo Folder Structure

```
AuraGen (Infotact Solutions)/
├── .env.example                           # Monorepo environment reference
├── .gitignore                             # Git ignore rules
├── package.json                           # Root convenience scripts (run both servers together)
├── README.md                              # Project documentation & run guide
├── scripts/
│   └── dev.mjs                            # Zero-dependency runner launching backend + frontend together
├── backend/
│   ├── .env                               # Local backend environment variables
│   ├── .env.example                       # Backend environment template
│   ├── package.json                       # Backend dependencies (ws, dotenv)
│   ├── src/
│   │   ├── config/
│   │   │   ├── constants.js               # Environment, schema and request limits
│   │   │   └── designSystem.js            # Six approved component contracts
│   │   ├── services/
│   │   │   ├── codeGenService.js          # Wizard orchestration and compatibility adapter
│   │   │   ├── openAIWizard.js            # LangChain client and provider retry policy
│   │   │   └── wizardPrompt.js            # Versioned prompt and three examples
│   │   ├── validators/
│   │   │   └── telemetryValidator.js      # Telemetry and form validation entry point
│   │   └── server.js                      # HTTP /health + WebSocket server
│   └── tests/                             # Integration tests, ten scenarios and benchmark
└── frontend/
    ├── .env.local                         # Local frontend environment variables
    ├── .env.local.example                 # Frontend environment template
    ├── next.config.mjs                    # Next.js configuration
    ├── package.json                       # Next.js, React, Tailwind CSS dependencies
    ├── postcss.config.mjs                 # PostCSS configuration
    ├── tailwind.config.js                 # Tailwind CSS configuration
    └── src/
        ├── app/
        │   ├── globals.css                # Tailwind directives
        │   ├── layout.js                  # Root app layout
        │   └── page.js                    # Financial Form Demo + Telemetry HUD + Code Drawer
        ├── components/
        │   ├── FinancialForm.jsx          # 21-field, 5-section complex financial form + validation
        │   ├── GeneratedCodeDrawer.jsx    # Inspector modal for received `{ type: "component", code }`
        │   └── TelemetryHUD.jsx           # Live WS status, score bar, metrics, friction simulator
        ├── data/
        │   └── financialFormSchema.js     # Field schema & per-field/full-form validation logic
        ├── hooks/
        │   ├── useTelemetry.js            # Mouse velocity, hesitation, rage clicks & score hook
        │   └── useWebSocket.js            # Auto-reconnecting WS hook (`sendTelemetry`, `onMessage`)
        └── services/
            └── wsService.js               # Underlying WebSocket client with exponential backoff
```

---

## 🔌 Shared WebSocket Protocol

### Client → Server (`telemetry`)
```json
{
  "type": "telemetry",
  "sessionId": "sess_a1b2c3d4",
  "timestamp": 1700000000000,
  "metrics": {
    "mouseVelocity": 420,
    "hesitationMs": 9500,
    "rageClicks": 4,
    "clickErrorRate": 0.35
  },
  "cognitiveLoadScore": 84,
  "activeField": "annualIncome"
}
```

### Server → Client (`component`)
When `cognitiveLoadScore >= COGNITIVE_LOAD_THRESHOLD` (default `70`):
```json
{
  "type": "component",
  "code": "import React, { useState } from \"react\";\nexport default function DynamicFormWizard(...) { ... }"
}
```

---

## 🚀 Setup & Running Frontend + Backend Together

### 1. Install All Dependencies
From the monorepo root:
```bash
npm run install:all
```
*(Or manually run `npm install` inside both `backend/` and `frontend/`.)*

### 2. Verify Environment Files
Create local config files from the templates if you need to override the defaults.
- `backend/.env` (`WS_PORT=8080`, `COGNITIVE_LOAD_THRESHOLD=70`)
- `frontend/.env.local` (`NEXT_PUBLIC_WS_URL=ws://localhost:8080`, `NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD=70`)

*(See `.env.example`, `backend/.env.example`, and `frontend/.env.local.example` for reference.)*

### 3. Run Frontend & Backend Together

#### Option A: Single Command from Root (Recommended)
```bash
npm run dev
```
This launches:
- **Backend WebSocket Server**: `ws://localhost:8080` (health check: `http://localhost:8080/health`)
- **Frontend Next.js App**: `http://localhost:3000`

#### Option B: Two Separate Terminals
**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 🧪 Verification & Testing

### Automated Backend WebSocket Tests
```bash
npm run test:backend
```
Tests cover the WebSocket protocol, backend startup, provider failures, and ten form scenarios with deterministic provider responses.

### Frontend Production Build Check
```bash
npm run build:frontend
```

### Interactive Demo Walkthrough
1. Open `http://localhost:3000` in your browser.
2. Observe the **TelemetryHUD** banner at the top showing `WS Connected` and live velocity and hesitation metrics.
3. Interact with the 21-field **Commercial Credit & Wealth Disclosure** form (test validation by clicking **Validate & Submit Application** or clicking **Prefill Partial Data**).
4. Click **Simulate Friction Spike** (or rapidly click 3+ times in one spot / wait idle on a field) to push `cognitiveLoadScore >= 70`.
5. Open the **Generated Component Preview** drawer to inspect the JSX returned by the backend.

---

## Enable OpenAI wizard generation

The backend requires Node.js 22 or newer. It groups fields locally by default. Set `USE_TEAMMATE_CODEGEN=true` and add `OPENAI_API_KEY` in `backend/.env` to enable LangChain with GPT-4o. Read the [backend wizard documentation](backend/WIZARD.md) for component contracts, the WebSocket compatibility boundary, operational limits, benchmarks, and review records.

