# AuraGen Frontend Engineering Documentation
**Author:** Raksha R. (Senior Frontend Lead – Telemetry, Animation, Fallback UI, and Polish)  
**Modules Covered:** Weeks 2, 3, and 4

---

## Table of Contents
1. [Module 1: frontend/telemetry](#module-1-frontendtelemetry)
2. [Module 2: frontend/animation](#module-2-frontendanimation)
3. [Module 3: frontend/fallback](#module-3-frontendfallback)
4. [Module 4: Frontend Polish & Accessibility](#module-4-frontend-polish--accessibility)
5. [Automated Verification & Test Matrix](#automated-verification--test-matrix)

---

## Module 1: frontend/telemetry

### Architecture & Calibration
The telemetry engine captures real-time cursor dynamics, interaction cadence, hesitation intervals, and frustration signals inside [useTelemetry.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/hooks/useTelemetry.js).

- **Rolling 10-Second Time Window:**
  Samples are tracked in a FIFO queue pruned to exactly 10,000 ms.
- **Calibrated Multi-Metric Weights:**
  - Velocity Standard Deviation / Variance: `0.25`
  - Direction Reversals (Jitter / erratic path shifts): `0.20`
  - Hesitation / Pause Durations: `0.25`
  - Rage Clicks (rapid repeated clicks within radius): `0.20`
  - Form Click Errors / Misclicks: `0.10`
- **Exponential Smoothing:**
  $$\text{SmoothedScore}_t = \alpha \cdot \text{RawScore}_t + (1 - \alpha) \cdot \text{SmoothedScore}_{t-1}$$  
  $(\alpha = 0.35)$ prevents jarring spikes while preserving acute sensitivity to sustained confusion.
- **Trigger Gate & Cooldown:**
  - Default Confusion Threshold: `70`
  - Cooldown Window: `60 seconds` post-trigger to eliminate redundant code-gen requests.
  - Minimum Activity Requirement: Requires at least 2 real interactions before activating.

### Development Confusion & Calm User Simulator
- Located in [telemetrySimulator.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/utils/telemetrySimulator.js).
- **Simulate Confused User:** Dispatches high-frequency jitter paths, rapid micro-pauses, and concentrated rage clicks (demonstrating a sharp spike $\ge 70$).
- **Simulate Calm User:** Dispatches smooth cubic bezier trajectories with normal field progression (score remains baseline $< 25$).
- **Export CSV Telemetry Report:** Dumps full 10-second rolling time series with raw and normalized metrics for analytics audit.

---

## Module 2: frontend/animation

### Architecture & Primitives
Powered by Framer Motion, implemented in [variants.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/animation/variants.js) and [AnimatedTransition.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/animation/AnimatedTransition.js).

- **Dynamic Form-to-Wizard Morph Transition:**
  - When cognitive load crosses threshold, a short 1.2s glassmorphic overlay (`Simplifying this for you...`) renders.
  - Original 21-field form fades out and scales down (`scale: 0.94`, `duration: 350ms`, within 300–400ms spec).
  - Wizard fades in and slides into view via calibrated spring physics (`stiffness: 280`, `damping: 24`).
  - Shared layout transition via `layoutId="auragen-form-card"` across `AnimatePresence mode="wait"`.
- **Direction-Aware Step Navigation:**
  - **Forward (Next):** Enters from right (`+36px`), exits to left (`-36px`).
  - **Backward (Back):** Enters from left (`-36px`), exits to right (`+36px`).
  - Animated stepper numbers, badges, and progress bar width transitions.
- **Prefers-Reduced-Motion Accessibility:**
  - Leverages `useReducedMotion()`.
  - When active, all spatial offsets (`x`, `y`, `scale`) are zeroed out, falling back to gentle opacity fades.

---

## Module 3: frontend/fallback

### Resilient Recovery Layer
Located in [frontend/src/fallback/](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/fallback/).

1. **Graceful Loading Skeleton (`WizardLoadingSkeleton`):**
   - Renders while code is generated or validated.
   - Animated shimmer waves and text: *"Preparing your simplified form..."*.
2. **React Error Boundary (`ErrorBoundary` & `WizardErrorFallback`):**
   - Catches unhandled runtime exceptions inside the wizard.
   - Privacy-first design: stack traces and syntax errors are strictly suppressed from user UI.
   - Offers dual recovery actions: **"Retry Assistance"** and **"Return to Original Form"**.
3. **4-Second Generation Timeout & WebSocket Failure Handling:**
   - Implemented in [GenerationFallbackManager.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/fallback/generationFallbackManager.js).
   - Starts a 4,000 ms countdown upon generation trigger.
   - If no valid `{ type: "component" }` arrives in 4s, or if `{ type: "validation_failed" }`, `{ type: "error" }`, or WebSocket connection drops, fallback triggers automatically.
   - Cancels timeout immediately if component arrives in time.
   - Prevents duplicate triggers via atomic state flags.
4. **Integration with Pavilson's Pre-built Wizard Templates:**
   - Pre-built templates in [prebuiltTemplates.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/fallback/prebuiltTemplates.js):
     - `income-stepper`: For `annualIncome` / `monthlyNetIncome`.
     - `loan-details`: For `loanAmount` / `loanPurpose`.
     - `quick-review`: Universal 2-step assistant.
   - If template is available, renders template. If template is unavailable, cleanly restores original form.
5. **Persistent "Back to Original Form" Revert Workflow:**
   - Persistent top action bar visible whenever simplified mode is active.
   - Zero page reload: restores full 21-field form with latest updated values (not initial empty fields).
   - Transmits `{ type: "revert", sessionId, timestamp, formValues }` over WebSocket to reset in-flight server state.
   - Animated smoothly with `revertMorphVariant`.

---

## Module 4: Frontend Polish & Accessibility

1. **Focus Management:**
   - Active focus is shifted to the assistant card upon morphing, and restored to the form container upon reverting (`tabIndex={-1}`, `preventScroll: true`).
2. **ARIA Live Region:**
   - `role="status"` with `aria-live="polite"` announces state transitions to assistive technologies (screen readers) for form changes, loading, wizard activation, and fallback templates.
3. **Keyboard Navigation:**
   - Accessible keyboard support throughout: `Enter` advances steps, `Escape` reverts to original form or closes the debug panel.
   - Visible focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`) on all interactive controls.
4. **Responsive Layouts:**
   - Fully optimized across mobile (`320px+`), tablet (`768px+`), and desktop (`1024px+`).
5. **Telemetry Diagnostic Cockpit (`TelemetryDebugPanel`):**
   - Non-intrusive collapsible floating panel in bottom-right corner.
   - Shows real-time score, threshold, UI mode, generation latency (ms), AST cache hit/miss status, and fallback health.
   - Hidden or minimized by default to ensure standard users are unaffected.

---

## Automated Verification & Test Matrix

Total test suite: **49 passing unit and integration tests** across the stack:
- `tests/telemetry.test.mjs`: 11 tests (weights, normalization, smoothing, confusion simulator, CSV export)
- `tests/animation.test.mjs`: 6 tests (spring parameters, fade, scale, directional slide)
- `tests/morphAnimation.test.mjs`: 6 tests (morph timing, overlay, bidirectional step slide, reduced motion)
- `tests/fallback.test.mjs`: 5 tests (loading skeleton, error boundary, retry, privacy check)
- `tests/fallbackTimeout.test.mjs`: 9 tests (4s timeout, validation failure, connection drop, template fallback)
- `tests/formRevert.test.mjs`: 4 tests (round-trip form values preservation, multi-switch, revert protocol)
- `tests/accessibilityAndDebug.test.mjs`: 3 tests (reduced motion variant adapter, ARIA strings, debug panel)
- `backend/tests/test-ws-server.js`: 5 tests (WebSocket health, telemetry validation, threshold trigger, revert)
- Production Build: `npm run build` succeeds cleanly with 0 errors.
