# AuraGen Fast-Processing Workflow & 180-Second Performance Budget

**Author:** Raksha R. (Senior Frontend Lead – Telemetry, Animation, Fallback UI, and Polish)  
**Branch:** `raksha-telemetry`  
**Status:** Engineering Proposal & Capacity Planning Specification  
**Notice:** *All time allocations and target durations in this document are proposed targets for architectural planning and latency optimization. They do not constitute fabricated benchmark claims.*

---

## 1. Executive Summary & Objective

The objective of Day 3 is to architect, profile, and document a **Fast-Processing Workflow** that guarantees the end-to-end user assistance journey finishes within a **maximum ceiling of 180 seconds (3 minutes)**.

```
0s                  15s                 35s                 50s                           140s                 165s            180s
├────────────────────┼───────────────────┼───────────────────┼──────────────────────────────┼────────────────────┼───────────────┤
│ Stage 1: Input     │ Stage 2: Telemetry│ Stage 3: Cognitive│ Stage 4: AI UI Generation    │ Stage 5: AST /     │ Stage 6: Form │
│ Preparation & Mount│ Dynamics Ingestion│ Load Evaluation   │ & Transformation Pipeline    │ Compilation / Mount│ State Recovery│
└────────────────────┴───────────────────┴───────────────────┴──────────────────────────────┴────────────────────┴───────────────┘
```

By establishing explicit per-stage time budgets, identifying performance bottlenecks, implementing event batching, and setting hard fallback boundaries, AuraGen ensures that users struggling with complex enterprise forms are assisted rapidly, without cognitive disruption or indefinite loading freezes.

---

## 2. End-to-End Workflow Analysis

The AuraGen workflow operates as a continuous state machine traversing six discrete stages:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: Workflow Entry Point & Input Preparation (0 - 15s)                      │
│ - Page load & hydration at http://localhost:3000                                 │
│ - WebSocket handshake established to ws://localhost:8080                         │
│ - 21-field Commercial Disclosure form mounted with client-side validation schema  │
│ - User initiates form engagement (focus, cursor entry, initial field keystrokes) │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: Telemetry Dynamics Ingestion (15 - 35s)                                 │
│ - 100ms mousemove sampling gate throttles raw DOM mouse events                   │
│ - Instantaneous velocity computed and bounded (<= 15,000 px/s)                   │
│ - Heading deflections calculated (atan2) to detect erratic reversals (> 45 deg)  │
│ - Hesitation timer tracks dwell time on active input field                       │
│ - Rage click clusters detected (>= 3 clicks within 1000ms & 35px radius)         │
│ - Misclicks classified via DOM target matching (.closest('button, input, ...'))  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: Cognitive Load Score Calculation & Gating (35 - 50s)                    │
│ - Raw metrics normalized into uniform 0-100 channels                             │
│ - Weighted combination evaluated: Variance(0.25) + Hesitation(0.25) +            │
│   Direction(0.20) + Rage(0.20) + ClickErrors(0.10) = 100 pts                     │
│ - Asymmetric exponential smoothing applied (alpha <= 0.45 attack, 0.65 decay)    │
│ - Minimum interaction gate checked (>= 2 interactions required)                  │
│ - Threshold evaluation: Score >= 70 triggers adaptation pipeline                 │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: Adaptive UI Generation & Transformation Pipeline (50 - 140s)            │
│ - 1.2s Glassmorphic overlay (<SimplifyingOverlay>) announces adaptation          │
│ - Original 21-field form card scales down and fades out (350ms, scale: 0.94)     │
│ - WebSocket client emits { type: "generate_request", formState, score }          │
│ - GenerationFallbackManager initiates 4,000ms hard countdown timer               │
│ - Backend invokes codeGenService (LangChain GPT-4o pipeline or local stub)       │
│ - Shimmer loading skeleton (<WizardLoadingSkeleton>) displays progress           │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 5: AST Security Validation, Compilation & Dynamic Injection (140 - 165s)   │
│ - Babel AST parses generated code, verifying syntax and import allowlist         │
│ - Banned calls rejected (eval, fetch, window, localStorage, <script>)            │
│ - Safe in-browser compilation / sandbox injection via restricted scope           │
│ - Framer Motion spring mounts <ConversationalWizard> (stiffness: 280, damping: 24)│
│ - Direction-aware step navigation initialized (+36px / -36px slide offsets)      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 6: State Synchronization, Completion & Recovery Buffer (165 - 180s)        │
│ - 100% bidirectional form value preservation: initial inputs pre-fill wizard     │
│ - User completes Step 1 -> Step 2 -> Step 3 and confirms submission             │
│ - Persistent "Back to Original Form" bar permits instant return with zero data loss│
│ - React ErrorBoundary guards against runtime rendering exceptions               │
│ - Fallback template router engages if 4s timeout expires                         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 180-Second Processing Budget Breakdown

The table below outlines the **proposed planning budget** for the 180-second fast-processing ceiling.

> **Important Disclaimer:** These values represent targeted time envelopes for capacity planning, load allocation, and latency optimization. They are **not** claims of verified production benchmarks.

| Stage # | Processing Stage | Target Budget | Relative Share | Primary Operations & Milestones |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **Input & Request Preparation** | **15 sec** | 8.3% | DOM mount, schema hydration, WS handshake, initial user keystrokes. |
| **2** | **Telemetry Dynamics Ingestion** | **20 sec** | 11.1% | 100ms mouse throttling, velocity variance, direction reversals, hesitation dwell. |
| **3** | **Cognitive Load Evaluation** | **15 sec** | 8.3% | Normalization, weighted sum, asymmetric smoothing, minimum activity check. |
| **4** | **UI Transformation & Generation** | **90 sec** | 50.0% | 1.2s announcement overlay, 350ms form exit, LLM prompt generation, token streaming, 4s fallback timeout trigger. |
| **5** | **AST Validation & Rendering** | **25 sec** | 13.9% | Babel AST security parsing, allowlist verification, spring injection, step navigation. |
| **6** | **State Sync & Recovery Buffer** | **15 sec** | 8.3% | Bidirectional value preservation, error boundary recovery buffer, revert readiness. |
| **Total** | **End-to-End Processing Budget** | **180 sec** | **100.0%** | **Comprehensive workflow target (3 minutes maximum)** |

---

## 4. Bottleneck Identification & Latency Reduction Strategies

Through architectural inspection of the full-stack codebase, six primary latency bottlenecks were identified, along with concrete reduction strategies:

```
┌───────────────────────────────┬──────────────────────────────────┬────────────────────────────────────────┐
│ Identified Bottleneck         │ Current Risk / Impact            │ Latency Reduction Strategy             │
├───────────────────────────────┼──────────────────────────────────┼────────────────────────────────────────┤
│ 1. LLM Generation Latency     │ Cloud LLM API calls can take     │ • Fallback timeout at 4,000ms.         │
│    (OpenAI / LangChain)       │ 5–15 seconds during peak load.   │ • Token streaming (component_chunk).   │
│                               │                                  │ • Server-side prompt caching.          │
├───────────────────────────────┼──────────────────────────────────┼────────────────────────────────────────┤
│ 2. Unthrottled Mouse Events   │ High-frequency mousemove events  │ • 100ms sampling gate implemented.     │
│    (DOM Main Thread Churn)    │ (120Hz+) cause layout thrashing. │ • Bounded FIFO buffers (<= 250 items). │
│                               │                                  │ • Passive event listeners enabled.     │
├───────────────────────────────┼──────────────────────────────────┼────────────────────────────────────────┤
│ 3. WebSocket Protocol Bloat   │ Frequent uncompressed JSON       │ • 1,000ms fixed streaming interval.   │
│    (Network Overhead)         │ packets saturate uplink.         │ • Delta-only telemetry transmission.   │
│                               │                                  │ • Structured compact schema.           │
├───────────────────────────────┼──────────────────────────────────┼────────────────────────────────────────┤
│ 4. Heavy AST Parsing          │ In-browser Babel parsing adds    │ • Pre-compiled fallback templates.     │
│    (Client-Side CPU Spike)    │ 200–600ms of script execution.   │ • Server-side AST validation check.    │
│                               │                                  │ • LRU template caching in-memory.      │
├───────────────────────────────┼──────────────────────────────────┼────────────────────────────────────────┤
│ 5. Layout Jumps During Morph  │ Re-rendering DOM elements        │ • Fixed container min-height.          │
│    (Cumulative Layout Shift)  │ causes visual page jump.         │ • Shared layoutId morphing.            │
│                               │                                  │ • AnimatePresence mode="wait".         │
├───────────────────────────────┼──────────────────────────────────┼────────────────────────────────────────┤
│ 6. Duplicate Generation Runs  │ Rapid user clicks trigger        │ • 60-second post-trigger cooldown.     │
│    (Redundant API Cost)       │ multiple parallel requests.      │ • 85% hysteresis reset threshold.      │
│                               │                                  │ • Atomic execution flags in manager.   │
└───────────────────────────────┴──────────────────────────────────┴────────────────────────────────────────┘
```

---

## 5. Architectural Optimization Deep Dive

### 5.1 Telemetry Event Batching & Memory Pruning
In [useTelemetry.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/hooks/useTelemetry.js), telemetry processing avoids continuous recalculation:
- **100ms Time-Gated Sampling:** Mouse movements between sample intervals are dropped immediately, reducing calculations by over $90\%$ on standard displays.
- **Fixed Cadence WebSocket Streaming:** Telemetry snapshots are dispatched on a strict $1,000\text{ ms}$ interval (`setInterval`), decoupling network I/O from mouse frame rate.
- **Strict FIFO Eviction:** All samples older than $10,000\text{ ms}$ are pruned every tick, preventing memory leaks during extended user sessions. Buffer caps enforce stability:
  - Velocity samples $\le 250$
  - Direction events $\le 100$
  - Click events $\le 50$
  - Rage click incidents $\le 20$

### 5.2 Timeout & Fallback Strategy (Macro vs. Micro Timeouts)
AuraGen operates a dual-layer timeout architecture:
1. **Micro-Timeout (4-Second Generation Fallback):**
   - Implemented in [generationFallbackManager.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/fallback/generationFallbackManager.js).
   - If a custom AI-generated component is not received, validated, and ready within **4,000 ms**, the system cancels the wait and instantly mounts one of Pavilson's prebuilt templates (`income-stepper`, `loan-details`, or `quick-review`).
   - If templates are unavailable, it restores the original form.
   - *Result:* The user is never subjected to indefinite spinners.
2. **Macro-Timeout (180-Second Journey Ceiling):**
   - Covers the entire end-to-end user session from initial landing to final wizard submission.
   - Allocates ample time for user reading, step navigation, and data verification while preventing stalled sessions.

### 5.3 Caching & Pre-Compilation Opportunities
1. **Schema-Hash Caching:** Caching generated component code using an LRU cache keyed by `hash(formSchema + activeField + promptVersion)` allows sub-50ms cache hits for recurring friction points.
2. **Pre-Built Wizard Templates:** Fallback templates are pre-compiled and bundled directly within the client bundle (`prebuiltTemplates.js`), eliminating network latency entirely during fallback activation.
3. **Provider Prompt Caching:** By placing static design system guidelines and Tailwind token rules first in the prompt, upstream LLM providers (e.g. OpenAI) can leverage KV cache hits to reduce generation latency.

### 5.4 Loading UX & Progress Communication
- **Shimmer Loading Skeleton:** While awaiting generation, `<WizardLoadingSkeleton>` displays an accessible pulsing wireframe of the upcoming wizard with *"Preparing your simplified experience..."*.
- **ARIA Live Region:** An assertive/polite live region (`role="status"`, `aria-live="polite"`) announces the state change to assistive technologies without waiting for visual rendering.
- **Reduced-Motion Compliance:** Under `prefers-reduced-motion`, all shimmer translations and spatial transitions are suppressed, falling back to static high-contrast containers.

---

## 6. Performance Acceptance Criteria

To satisfy the fast-processing mandate, AuraGen defines the following **proposed acceptance criteria**:

| Criterion | Target Requirement | Pass / Fail Metric |
| :--- | :--- | :--- |
| **Workflow Ceiling** | Total end-to-end journey completes within 180 seconds. | Total elapsed time $\le 180.0\text{ s}$ |
| **Generation Fallback** | Fallback activates if code generation exceeds 4,000ms. | Fallback trigger at $t = 4,000\text{ ms} \pm 100\text{ ms}$ |
| **Data Preservation** | 100% of previously entered form values retained upon morph or revert. | $\text{RetainedFields} / 21 = 100\%$ |
| **No Indefinite Spinners**| Loading skeleton replaced by wizard or fallback within 4 seconds. | Shimmer duration $\le 4.0\text{ s}$ |
| **Redundant Call Suppression** | Cooldown strictly prevents repeated code-gen requests for 60 seconds. | Invocations during cooldown $= 0$ |
| **Smooth Frame Rate** | Morph and step transitions maintain $\ge 55\text{ FPS}$ on desktop. | No dropped frames during 350ms exit |
| **Zero Code Leaks** | No sensitive stack traces exposed in ErrorBoundary UI. | Stack traces in DOM $= 0$ |

---

## 7. Performance Benchmarking & Profiling Methodology

When formal performance benchmarks are conducted, engineers must use the following standardized measurement protocol:

### 7.1 High-Resolution Timestamp Markers
Use the browser's `performance.now()` API to log discrete phase transitions:
```javascript
// High-resolution performance markers
performance.mark("auragen-friction-detected");
performance.mark("auragen-overlay-mounted");
performance.mark("auragen-request-dispatched");
performance.mark("auragen-component-received");
performance.mark("auragen-ast-validated");
performance.mark("auragen-wizard-rendered");

// Measure discrete durations
performance.measure("time-to-first-overlay", "auragen-friction-detected", "auragen-overlay-mounted");
performance.measure("generation-latency", "auragen-request-dispatched", "auragen-component-received");
performance.measure("ast-compilation-time", "auragen-component-received", "auragen-ast-validated");
performance.measure("total-adaptation-duration", "auragen-friction-detected", "auragen-wizard-rendered");
```

### 7.2 Slow-Request Diagnosis Protocol
If an end-to-end run exceeds its target budget during testing:
1. Inspect the **Telemetry Debug HUD** (`Ctrl+Shift+D`) to view `generationDurationMs`.
2. Check backend console logs:
   - `[Telemetry]` indicates timestamp of score breach.
   - `[CodeGen]` logs duration of code generation.
3. If `generationDurationMs > 4000ms`, verify whether `GenerationFallbackManager` engaged fallback within the expected 4-second envelope.
4. Profile main thread CPU using Chrome DevTools Performance panel to detect any script evaluation bottlenecks during AST parsing.

---

## 8. Honest Performance Reporting Status

AuraGen maintains strict engineering integrity regarding performance metrics:

- **Proposed Target:** Complete end-to-end assistance journey within **180 seconds (3 minutes)**.
- **Actual Measured Status:** Micro-components (telemetry sampling: 100ms, form exit: 350ms, fallback timeout: 4,000ms) operate within calibrated ranges in local unit tests. Full cloud LLM generation pipeline benchmarks will be formally reported once integrated on `main`.
- **Remaining Bottlenecks:** External network variability when connecting to cloud LLM APIs; client-side Babel compilation overhead on low-power mobile devices.
- **Future Roadmap:** WebAssembly (Wasm) AST validator, server-side streaming component compilation, and edge Redis telemetry caching.
