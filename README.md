# AuraGen – AI-Powered Self-Healing Generative UI

> **Infotact Solutions – Advanced Generative AI Engineering**  
> *Interfaces That Understand You.*  
> Real-time behavioral psychomotor telemetry, calibrated cognitive friction detection, fluid Framer Motion morphing, and zero-data-loss adaptive Generative UI over WebSockets.

---

## 🌟 Executive Summary

Enterprise forms are notoriously rigid. When a user experiences cognitive overload on complex financial, medical, or administrative applications, traditional interfaces provide static error labels or suffer high abandonment rates.

**AuraGen** dynamically detects implicit behavioral friction in real time by monitoring cursor velocity variance, directional path reversals, hesitation pauses, and rage-click clusters. When a calculated **Cognitive Load Score (0–100)** crosses a calibrated threshold (`>= 70`), AuraGen initiates a fluid, zero-page-refresh UI transformation:
1. Announces the adaptation with a non-jarring glassmorphic overlay (*"AuraGen detected interaction difficulty. Simplifying your experience..."*).
2. Fades and scales down the intimidating multi-section form (`350ms`).
3. Seamlessly morphs into an AI-generated 3-step **Conversational Wizard** via spring physics.
4. Preserves 100% of user-entered data bidirectionally.
5. Provides a persistent **"Back to Original Form"** recovery action, resilient error boundaries, and a 4-second generation timeout fallback.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│                                                                        │
│  [21-Field Financial Form]                                             │
│            │                                                           │
│            ▼                                                           │
│  [useTelemetry Hook] ──(10s Rolling Window)──> [Cognitive Load Score]   │
│            │                                            │              │
│            │ (1s WebSocket Stream)                      ▼ (Score >= 70)│
│            │                                 [1.2s Morph Transition]   │
│            │                                            │              │
│            │                                            ▼              │
│            │                                 [Conversational Wizard]   │
│            │                                            ▲              │
│            │                                            │ (Fallback)   │
│            │                                 [Prebuilt Templates]      │
│            │                                 (Pavilson / 4s Timeout)   │
└────────────┼────────────────────────────────────────────┼──────────────┘
             │                                            │
   ws://...  │ telemetry { metrics, score, activeField }  │ { type: "component", code }
             ▼                                            │
┌─────────────────────────────────────────────────────────┼──────────────┐
│                              BACKEND                    │              │
│                                                         │              │
│  [WebSocket Server (ws)] ──> [Telemetry Validator]      │              │
│                                     │                   │              │
│                                     ▼ (Score >= 70)     │              │
│                             [CodeGen Service] ──────────┘              │
│                             (GPT-4o Pipeline / Stub)                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Monorepo Directory Layout

```
Project-1-AuraGen/
├── .env.example                               # Monorepo environment variable template
├── .gitignore                                 # Git ignore directives
├── package.json                               # Monorepo runner scripts
├── README.md                                  # Primary project reference manual
├── docs/                                      # Specialized technical documentation
│   ├── DEVELOPER_WORKFLOW.md                  # Team Git conventions, branches & PR checklist
│   ├── FAST_PROCESSING_BUDGET.md              # 180-second fast-processing budget & latency guide
│   ├── FRONTEND_MODULES.md                    # Deep dive into Weeks 2-4 frontend modules
│   ├── TELEMETRY_SPECIFICATION.md             # Cognitive Load Score math & sensor architecture
│   └── TROUBLESHOOTING.md                     # Port conflicts, Webpack cache & connection guide
├── scripts/
│   └── dev.mjs                                # Zero-dependency dual-process dev launcher
├── backend/                                   # WebSocket Server & Telemetry Engine
│   ├── .env.example                           # Backend environment template
│   ├── package.json                           # Dependencies (ws, dotenv)
│   ├── src/
│   │   ├── server.js                          # HTTP /health & WebSocket server
│   │   ├── config/
│   │   │   └── constants.js                   # Ports, default thresholds, form schema
│   │   ├── services/
│   │   │   ├── codeGenService.js              # Pipeline adapter (falls back to stub)
│   │   │   └── codeGenStub.js                 # High-performance local wizard generator
│   │   └── validators/
│   │       └── telemetryValidator.js          # Strict telemetry JSON validator
│   └── tests/
│       └── test-ws-server.js                  # Automated WebSocket test suite (5 tests)
└── frontend/                                  # Next.js 15.5 SaaS Application
    ├── .env.local.example                     # Frontend environment template
    ├── next.config.mjs                        # Next.js configuration
    ├── package.json                           # Next.js, React 19, Framer Motion, Tailwind
    ├── tailwind.config.js                     # Futuristic Dark Palette configuration
    ├── src/
    │   ├── animation/
    │   │   ├── AnimatedTransition.js          # Motion re-exports & wrapper
    │   │   └── variants.js                    # Spring, morph, slide & accessibility variants
    │   ├── app/
    │   │   ├── globals.css                    # Tailwind directives & scrollbar styles
    │   │   ├── layout.js                      # Root app layout
    │   │   └── page.js                        # Main SaaS page shell & mode coordinator
    │   ├── components/
    │   │   ├── ConversationalWizard.jsx       # 3-step simplified AI assistant
    │   │   ├── FinancialForm.jsx              # 21-field 5-section complex disclosure form
    │   │   ├── SimplifyingOverlay.jsx         # 1.2s glassmorphic transformation announcement
    │   │   ├── TelemetryAnalyticsChart.jsx    # Real-time score trend line chart
    │   │   ├── TelemetryDebugPanel.jsx        # Developer diagnostic cockpit
    │   │   └── TelemetryHUD.jsx               # Top navigation, live score ring & simulator
    │   ├── data/
    │   │   └── financialFormSchema.js         # 21-field definitions & validation rules
    │   ├── fallback/
    │   │   ├── ErrorBoundary.js               # Privacy-safe React error boundary
    │   │   ├── generationFallbackManager.js   # 4-second timeout & template router
    │   │   ├── prebuiltTemplates.js           # Pavilson's 3 prebuilt wizard templates
    │   │   └── WizardLoadingSkeleton.js       # Shimmer loading skeleton
    │   ├── hooks/
    │   │   ├── useTelemetry.js                # Calibrated psychomotor friction sensor hook
    │   │   └── useWebSocket.js                # Auto-reconnecting WebSocket client hook
    │   ├── services/
    │   │   └── wsService.js                   # WebSocket transport with exponential backoff
    │   └── utils/
    │       └── telemetrySimulator.js          # Confused/Calm simulation & CSV exporter
    └── tests/                                 # Frontend test suites (44 tests across 7 files)
        ├── accessibilityAndDebug.test.mjs
        ├── animation.test.mjs
        ├── fallback.test.mjs
        ├── fallbackTimeout.test.mjs
        ├── formRevert.test.mjs
        ├── morphAnimation.test.mjs
        └── telemetry.test.mjs
```

---

## ⚡ Quick Start & Run Guide

### 1. Prerequisites
- **Node.js**: `v18.17.0` or higher (`v20.x` recommended).
- **Package Manager**: `npm` (included with Node.js).
- **Ports**: Port `3000` (Next.js) and Port `8080` (WebSocket server) must be free.

### 2. Environment Setup
Clone the repository and copy the environment templates:
```bash
git clone https://github.com/mdyusuf06/Project-1-AuraGen.git
cd Project-1-AuraGen

# Copy environment templates if not already present
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### 3. Install Dependencies
Install dependencies for all workspaces with a single command from root:
```bash
npm run install:all
```

### 4. Launch AuraGen

#### Option A: Unified Launcher (Recommended)
From the project root:
```bash
npm run dev
```
This concurrently boots:
- **Backend WebSocket Server:** `ws://localhost:8080` (Health check: `http://localhost:8080/health`)
- **Frontend Next.js SaaS:** `http://localhost:3000`

#### Option B: Dedicated Terminals (Ideal for Demos & Debugging)
- **Terminal 1 (Backend):**
  ```bash
  cd backend
  npm run dev
  ```
- **Terminal 2 (Frontend):**
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🌐 Environment Variables Matrix

| Variable | Location | Default | Description |
| :--- | :--- | :--- | :--- |
| `WS_PORT` | `backend/.env` | `8080` | Port for WebSocket server and `/health` endpoint |
| `COGNITIVE_LOAD_THRESHOLD` | `backend/.env` | `70` | Cognitive Load Score threshold triggering code-gen |
| `GENERATION_COOLDOWN_MS` | `backend/.env` | `3000` | Minimum interval between code generation runs |
| `USE_TEAMMATE_CODEGEN` | `backend/.env` | `false` | When `true`, delegates to LangChain pipeline |
| `NEXT_PUBLIC_WS_URL` | `frontend/.env.local` | `ws://localhost:8080` | Target WebSocket server URL |
| `NEXT_PUBLIC_COGNITIVE_LOAD_THRESHOLD` | `frontend/.env.local` | `70` | Client-side score trigger threshold |

---

## 🧠 Behavioral Telemetry & Scoring Details

AuraGen samples mouse and keyboard dynamics over a **10-second rolling window** with memory-bounded buffers:

$$\text{Cognitive Load Score} = \sum_{i=1}^5 w_i \cdot \text{NormalizedMetric}_i \in [0, 100]$$

| Metric Channel | Weight | Formulation & Normalization Range |
| :--- | :--- | :--- |
| **Velocity Variance** | `0.25` (25 pts) | Standard deviation of cursor velocity normalized against $600\text{ px/s}$. |
| **Hesitation Duration** | `0.25` (25 pts) | Continuous idle dwell on active field normalized against $8,000\text{ ms}$. |
| **Direction Changes** | `0.20` (20 pts) | Angular deflections $> 45^\circ$ where travel $> 8\text{ px}$ normalized against 12 reversals. |
| **Rage Clicks** | `0.20` (20 pts) | Clusters of $\ge 3$ clicks within $1000\text{ ms}$ and $35\text{ px}$ normalized against 3 clusters. |
| **Click Error Rate** | `0.10` (10 pts) | Misclicks outside interactive elements or on invalid fields scaled $0 - 100\%$. |

### Dynamic Exponential Smoothing
Raw scores are passed through an asymmetric smoothing filter:
- **Fast Attack ($\alpha \le 0.45$):** Rapidly tracks rising frustration within 1–2 ticks.
- **Gentle Decay ($\alpha = 0.65$):** Prevents UI flickering during intermittent calm movements.

*(For the complete mathematical specification, see [docs/TELEMETRY_SPECIFICATION.md](docs/TELEMETRY_SPECIFICATION.md).)*

---

## ⚡ Fast-Processing Workflow & 180-Second Performance Budget

AuraGen enforces a fast-processing mandate: the complete end-to-end user assistance journey is architected to finish within a **maximum ceiling of 180 seconds (3 minutes)**.

> **Planning Notice:** The following figures are proposed engineering targets for latency budgeting, load allocation, and capacity planning. They represent design goals rather than claims of measured cloud benchmarks.

### 180-Second Target Time Budget Breakdown
| Stage | Description | Target Budget | Primary Operations & Milestones |
| :---: | :--- | :---: | :--- |
| **1** | **Input & Request Preparation** | **15 sec** | Initial form mount, schema hydration, WebSocket handshake, first user keystrokes. |
| **2** | **Telemetry Dynamics Ingestion** | **20 sec** | 100ms mouse throttling, velocity variance, direction reversals, hesitation tracking. |
| **3** | **Cognitive Load Evaluation** | **15 sec** | Normalization, calibrated weighted scoring, asymmetric smoothing, minimum activity check. |
| **4** | **AI UI Generation & Morphing** | **90 sec** | 1.2s announcement overlay, 350ms form exit, LLM prompt generation, token streaming, 4s fallback timeout trigger. |
| **5** | **AST Validation & Rendering** | **25 sec** | Babel AST security parsing, allowlist verification, spring injection, step navigation. |
| **6** | **State Sync & Recovery Buffer** | **15 sec** | 100% bidirectional 21-field value preservation, error boundary recovery buffer, revert readiness. |
| **Total** | **End-to-End Processing Budget** | **180 sec** | **Complete user assistance workflow target (3 minutes maximum)** |

### Core Latency Reduction Mechanisms
1. **100ms Event Throttling & FIFO Pruning:** Mouse tracking is throttled to 100ms using `performance.now()`, and rolling event buffers are capped ($\le 250$ samples) and pruned every 10 seconds.
2. **Dual-Layer Timeout Architecture:** A micro-timeout of **4,000ms** triggers prebuilt template fallback (`income-stepper`, `loan-details`, `quick-review`) if LLM generation stalls, while the macro-budget of **180s** bounds the complete journey.
3. **60-Second Cooldown & Hysteresis:** Prevents redundant code generation calls during user adaptation; trigger latch resets only when score drops below 85% ($59.5$).
4. **Zero-Reload State Synchronization:** Reverting back to the original form is instantaneous and preserves 100% of user data in-memory without network roundtrips.

*(For detailed profiling methodology and bottleneck analysis, see [docs/FAST_PROCESSING_BUDGET.md](docs/FAST_PROCESSING_BUDGET.md).)*

---

## 🎨 Interactive Browser Walkthrough

1. Open [http://localhost:3000](http://localhost:3000) in Chrome, Edge, or Firefox.
2. Verify the top header displays **`WS Connected`** with a pulsing green indicator.
3. Fill in preliminary fields on the **Commercial Credit Disclosure** form:
   - *Legal Full Name:* `Jane Doe`
   - *Annual Income:* `$185,000`
4. In the Telemetry HUD, test the adaptation engine:
   - **Instant:** Click **`⚡ 1-Click Spike`**.
   - **Realistic:** Click **`Simulate Confused User`** to observe micro-hesitations and rage clicks driving the score across the threshold (`>= 70`).
5. Experience the fluid transition:
   - The 1.2-second glassmorphic announcement appears.
   - The 21-field form card smoothly scales down and exits.
   - The 3-step **Conversational Wizard** slides into place with spring physics.
6. Step through the wizard (pre-populated with your `$185,000` entry) and edit values.
7. Click **`← Back to Original Form`**:
   - Re-mounts the original form without a page reload.
   - All updated values are 100% preserved.
8. Open the **Telemetry Debug HUD** (bottom-right button or `Ctrl+Shift+D`) to inspect raw telemetry, cooldown status, and WebSocket logs.

---

## 🧪 Comprehensive Automated Test Matrix

AuraGen maintains **49 passing tests** across frontend and backend:

```bash
# Run all frontend test suites (44 tests)
npm --prefix frontend test

# Run backend WebSocket integration suite (5 tests)
npm --prefix backend test

# Run Next.js production build verification
npm --prefix frontend run build
```

| Suite | Tests | Description |
| :--- | :--- | :--- |
| `frontend/tests/telemetry.test.mjs` | 12 | Weights, metric normalization, score clamping, simulator profiles, minimum activity gate, 60s cooldown, WebSocket schema compliance, numerical stability. |
| `frontend/tests/animation.test.mjs` | 6 | Spring physics parameters, fade variants, scale down variant (`scale: 0.94`), directional slide offsets ($+36\text{px} / -36\text{px}$). |
| `frontend/tests/morphAnimation.test.mjs` | 6 | Calibrated 350ms form exit duration, wizard spring entrance, direction-aware step navigation, `prefers-reduced-motion` spatial translation suppression. |
| `frontend/tests/fallback.test.mjs` | 5 | Shimmer loading skeleton wave rendering, privacy-safe ErrorBoundary exception catching, user recovery actions. |
| `frontend/tests/fallbackTimeout.test.mjs` | 9 | 4-second generation timeout, prebuilt template resolution, timeout cancellation, `validation_failed` handling, connection drop fallback. |
| `frontend/tests/formRevert.test.mjs` | 4 | Full 21-field round-trip state preservation, multi-switch stability, `{ type: "revert" }` protocol dispatch. |
| `frontend/tests/accessibilityAndDebug.test.mjs` | 3 | Reduced motion accessibility adaptations, ARIA live announcements, TelemetryDebugPanel rendering. |
| `backend/tests/test-ws-server.js` | 5 | HTTP `/health` check, WebSocket handshake, schema validation, low-score logging, threshold breach code generation. |

---

## 🛠️ Troubleshooting & Support

If you encounter port conflicts, WebSocket dropouts, or Next.js cache anomalies:

```powershell
# Terminate lingering processes on port 3000 or 8080 (Windows PowerShell)
Get-NetTCPConnection -LocalPort 3000, 8080 -ErrorAction SilentlyContinue | Select-Object OwningProcess, LocalPort
Stop-Process -Id <PID> -Force

# Clear Next.js build cache
Remove-Item -Recurse -Force frontend\.next -ErrorAction SilentlyContinue
```

*(For in-depth troubleshooting scenarios, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).)*

---

## 👥 Team & Ownership Matrix

| Member | Primary Modules | Focus Areas |
| :--- | :--- | :--- |
| **Raksha R.** | `frontend/telemetry`<br>`frontend/animation`<br>`frontend/fallback`<br>`frontend/polish` | Telemetry calibration, cognitive score math, Framer Motion morphing, error boundary, 4s timeout, prebuilt templates, bidirectional revert, WCAG accessibility, Telemetry Debug HUD. |
| **Yusuf** | `backend/server`<br>`frontend/renderer`<br>`frontend/form` | WebSocket server transport, dynamic code evaluation sandbox (`new Function` scope), form serialization, message protocol dispatch, final integration. |
| **Jeevan** | `backend/pipeline` | LangChain GPT-4o code-generation pipeline, prompt engineering, token streaming, retry loop. |
| **Pavilson** | `backend/validator` | Babel AST security validator, banned call detection (`eval`, `fetch`, `window`), pre-built fallback wizard templates. |

---

## 📄 License & Attribution

Developed under the **Infotact Solutions Advanced Generative AI Engineering Program**.  
Built with Next.js 15.5, React 19, Framer Motion, Tailwind CSS, and Node.js.
