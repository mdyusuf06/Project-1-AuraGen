# AuraGen – Self-Healing Generative UI via Cognitive Load

> **Infotact Solutions – Advanced Generative AI Engineering (Week 1 Full-Stack Monorepo)**  
> Real-time behavioral telemetry streaming over WebSockets + Complex Financial Form Demo + Stubbed Code-Gen Integration.

---

## 🌟 Overview

Standard enterprise forms are rigid. When a user struggles on a complex financial disclosure form, AuraGen tracks behavioral friction signals (mouse velocity, hesitation time, rage clicks, click-error rate) to calculate a real-time **Cognitive Load Score (0–100)**. When the score crosses the configured threshold (`>= 70`), the Node.js WebSocket server invokes `generateComponent()` and pushes a custom, simplified React wizard component (`{ type: "component", code }`) back to the browser.

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
│   │   │   └── constants.js               # WS_PORT, threshold, cooldown, default form schema
│   │   ├── services/
│   │   │   ├── codeGenService.js          # Teammate module adapter (falls back to stub)
│   │   │   └── codeGenStub.js             # Week 1 placeholder React wizard generator
│   │   ├── validators/
│   │   │   └── telemetryValidator.js      # Strict shared JSON format validator
│   │   └── server.js                      # HTTP /health + WebSocket server
│   └── tests/
│       └── test-ws-server.js              # Automated WebSocket integration test suite
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
Default local config files are included:
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
Tests `/health`, WebSocket handshake, invalid telemetry error handling, low-score logging, and high-score `{ type: "component", code }` generation.

### Frontend Production Build Check
```bash
npm run build:frontend
```

### Interactive Demo Walkthrough
1. Open `http://localhost:3000` in your browser.
2. Observe the **TelemetryHUD** banner at the top showing `WS Connected` and live velocity/hesitation metrics streaming to the backend terminal.
3. Interact with the 21-field **Commercial Credit & Wealth Disclosure** form (test validation by clicking **Validate & Submit Application** or clicking **Prefill Partial Data**).
4. Click **Simulate Friction Spike** (or rapidly click 3+ times in one spot / wait idle on a field) to push `cognitiveLoadScore >= 70`.
5. Watch the backend console log the threshold breach and immediately push `{ type: "component", code }` back to the frontend, opening the **Generated Component Preview** drawer.

---

## 🔗 Integrating Teammate's LangChain Module

When the AI/Backend teammate's `generateComponent()` LangChain module is ready:
1. Place or link their module at `backend/src/codegen/agent.js` (exporting `generateComponent({ activeField, formFields, userInput, score })`).
2. Set `USE_TEAMMATE_CODEGEN=true` and add `OPENAI_API_KEY=...` in `backend/.env`.
3. `backend/src/services/codeGenService.js` will automatically delegate to their LangChain pipeline instead of the Week 1 stub.

