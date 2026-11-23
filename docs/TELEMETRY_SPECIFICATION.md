# AuraGen Behavioral Telemetry & Cognitive Load Specification

**Author:** Raksha R. (Senior Frontend Lead – Telemetry, Animation, Fallback UI, and Polish)  
**Module:** `frontend/src/hooks/useTelemetry.js` & `frontend/src/utils/telemetrySimulator.js`  
**Status:** Calibrated & Production-Ready (Week 2 Milestones)

---

## 1. Overview & Behavioral Thesis

AuraGen detects when an end-user experiences cognitive friction or confusion while interacting with complex digital interfaces (such as multi-section financial disclosure applications). Rather than relying on explicit user complaints or post-abandonment analytics, AuraGen monitors implicit psychomotor micro-behaviors:

1. **Erratic Cursor Trajectories:** Rapid shifts in direction and high velocity variance indicate hesitation, disorientation, or searching behavior.
2. **Prolonged Hesitation / Idle Dwell:** Extended pauses while an input field is active indicate comprehension failure or calculation fatigue.
3. **Rage Clicks:** Repeated, rapid click clusters within a small physical radius denote UI unresponsive perception or user frustration.
4. **Form Click Errors (Misclicks):** Clicks on non-interactive regions or invalid controls indicate misdirected attention.

These signals are captured by the `useTelemetry` React hook, normalized against calibrated psychomotor baselines, combined into a weighted **Cognitive Load Score (0–100)**, smoothed using asymmetric exponential decay, and evaluated against a trigger threshold (default: `70`).

---

## 2. Telemetry Ingestion & Sampling Architecture

### 2.1 Mouse Movement Gating
- **Sampling Interval:** Mousemove events are sampled at a 100 ms cadence using `performance.now()` high-resolution timestamps. High-frequency bursts are throttled to prevent UI thread lockup.
- **Instantaneous Velocity Calculation:**
  $$\Delta x = x_t - x_{t-1}, \quad \Delta y = y_t - y_{t-1}, \quad \Delta t = \frac{t - t_{t-1}}{1000}$$
  $$v_{\text{instant}} = \frac{\sqrt{\Delta x^2 + \Delta y^2}}{\Delta t} \quad (\text{px/sec})$$
  *Numerical Safety Guard:* $v_{\text{instant}}$ is bounded to $\le 15,000\text{ px/s}$ and verified for finiteness to prevent `NaN` or `Infinity` from corrupted timestamps.
- **Directional Deflection Detection:**
  When mouse travel exceeds $8\text{ px}$, the heading angle $\theta$ is computed via $\text{atan2}(\Delta y, \Delta x)$. A direction reversal event is registered whenever:
  $$\Delta \theta = |\theta_t - \theta_{t-1}| > \frac{\pi}{4} \quad (45^\circ)$$

### 2.2 Click Classification & Rage Click Clustering
- **Interactive Element Resolution:** Every click event target is evaluated using DOM element matching:
  ```javascript
  const closestInteractive = targetEl?.closest?.(
    'input, select, textarea, button, label, option, a, [role="button"], [role="link"], [role="checkbox"], [role="radio"]'
  );
  ```
  Clicks inside nested spans or SVGs within buttons are properly classified as valid interactive clicks.
- **Misclick Definition:** Clicks outside interactive elements, or clicks on controls marked `aria-invalid="true"`, increment the error click tally.
- **Rage Click Cluster Engine:** An incident is registered when $\ge 3$ clicks occur within $1,000\text{ ms}$ inside a Euclidean radius of $\le 35\text{ px}$:
  $$\sqrt{(x_i - x_j)^2 + (y_i - y_j)^2} \le 35\text{ px}$$

### 2.3 Hesitation Timer
Hesitation duration accumulates continuously while an input field holds active focus (`activeField`). Any user keyboard input (`keydown`) or mouse interaction updates `lastInteractionTime`. Hesitation is measured as:
$$\text{hesitationMs} = \max(0, \text{now} - \text{lastInteractionTime})$$

---

## 3. Rolling Window & Memory Bounds

Telemetry operates over a strict **10-second rolling window** ($10,000\text{ ms}$).

### 3.1 FIFO Event Eviction
At each computation tick, events older than $t - 10,000\text{ ms}$ are purged:
- `velocitySamples`: Filtered to $t \ge \text{cutoff}$ and capped to $\le 250$ entries.
- `directionEvents`: Filtered to $t \ge \text{cutoff}$ and capped to $\le 100$ entries.
- `clickEvents`: Filtered to $t \ge \text{cutoff}$ and capped to $\le 50$ entries.
- `rageClickIncidents`: Filtered to $t \ge \text{cutoff}$ and capped to $\le 20$ entries.

### 3.2 Rolling Velocity Variance
Given $N$ velocity samples in the active window:
$$\mu_v = \frac{1}{N} \sum_{i=1}^N v_i, \quad \sigma_v^2 = \frac{1}{N} \sum_{i=1}^N (v_i - \mu_v)^2$$

---

## 4. Normalization & Cognitive Load Score Calculation

Raw values vary across different physical scales. Each metric channel is normalized to a $[0, 100]$ score using calibrated clinical ranges.

### 4.1 Channel Normalization Functions
$$\text{norm}_{\text{variance}} = \min\left(100, \frac{\sqrt{\sigma_v^2}}{600} \times 100\right)$$
$$\text{norm}_{\text{hesitation}} = \min\left(100, \frac{\text{hesitationMs}}{8000} \times 100\right)$$
$$\text{norm}_{\text{rage}} = \min\left(100, \frac{\text{rageClicks}}{3} \times 100\right)$$
$$\text{norm}_{\text{clickError}} = \min\left(100, \text{clickErrorRate} \times 100\right)$$
$$\text{norm}_{\text{direction}} = \min\left(100, \frac{\text{directionChanges}}{12} \times 100\right)$$

### 4.2 Calibrated Weight Matrix
| Metric Channel | Weight ($w_i$) | Fraction | Scaling Denominator |
| :--- | :--- | :--- | :--- |
| **Velocity Variance** | 25 | 0.25 | $\sigma = 600\text{ px/s}$ |
| **Hesitation Duration** | 25 | 0.25 | $8,000\text{ ms}$ pause |
| **Direction Changes** | 20 | 0.20 | 12 erratic reversals |
| **Rage Clicks** | 20 | 0.20 | 3 click clusters |
| **Click Error Rate** | 10 | 0.10 | 1.0 (100% misclicks) |
| **Total** | **100** | **1.00** | — |

### 4.3 Raw Score Combination
$$\text{RawScore} = \sum_{i} w_i \cdot \text{norm}_i \in [0, 100]$$

---

## 5. Asymmetric Exponential Smoothing

To prevent jarring score jumps while remaining immediately responsive to genuine confusion, AuraGen applies an **asymmetric exponential smoothing filter**:

$$\text{EffAlpha} = \begin{cases} 
\min(\alpha, 0.45) & \text{if } \text{RawScore} > \text{PrevScore} \quad (\text{Fast Attack}) \\ 
\alpha = 0.65 & \text{if } \text{RawScore} \le \text{PrevScore} \quad (\text{Gentle Decay}) 
\end{cases}$$

$$\text{SmoothedScore}_t = \text{round}\left( \text{PrevScore} \cdot \text{EffAlpha} + \text{RawScore} \cdot (1 - \text{EffAlpha}) \right)$$

This ensures that an abrupt spike in user confusion immediately drives the score upward within 1–2 ticks, while a return to calm motion decays gracefully without visual flickering.

---

## 6. Trigger State Machine, Minimum Activity & Cooldown

```
  ┌───────────────┐
  │     IDLE      │ <──────── User arrives / Page loads
  └───────┬───────┘
          │ User interacts (>= 2 actions)
          ▼
  ┌───────────────┐
  │   MONITORING  │ <──────── Stream telemetry (1s interval)
  └───────┬───────┘
          │ Score >= 70 AND Not in Cooldown
          ▼
  ┌───────────────┐
  │    TRIGGER    │ ────────> Invoke onThreshold(), show overlay,
  └───────┬───────┘           start 60s cooldown countdown
          │ Cooldown active (60s)
          ▼
  ┌───────────────┐
  │   COOLDOWN    │ ────────> Suppress duplicate code-gen triggers
  └───────┬───────┘
          │ Cooldown expires AND Score < 59.5 (85% hysteresis)
          ▼
  ┌───────────────┐
  │   MONITORING  │
  └───────────────┘
```

1. **Minimum Activity Gate:** At least 2 user interactions (`totalInteractions >= 2`) or 1 click must occur before scoring activates. This prevents cold-start false positives upon initial page mount.
2. **60-Second Cooldown:** Once the score crosses the threshold (`>= 70`) and fires `onThreshold`, a 60,000 ms cooldown timer is engaged. During cooldown, telemetry snapshots continue streaming over WebSockets, but generation triggers are strictly suppressed.
3. **Hysteresis Reset:** The trigger state flag resets only when the score drops below $85\%$ of the threshold ($70 \times 0.85 = 59.5$), preventing rapid edge oscillation.

---

## 7. Development Telemetry Simulator

The simulation suite in `frontend/src/utils/telemetrySimulator.js` allows developers and evaluators to test both calm and confused behavioral profiles deterministically without manual mouse manipulation.

### 7.1 Confused User Simulation (`simulateConfusion`)
Executes a multi-stage friction progression:
- **0–2s:** Rapid erratic cursor deflections with high velocity variance ($500 - 1100\text{ px/s}$).
- **2–5s:** Simulated hesitation pause ($> 4,000\text{ ms}$).
- **5–8s:** Bursts of rage clicks and off-target error clicks.
- **8s+:** Peak friction driving Cognitive Load Score to $\ge 75$ and crossing the trigger threshold.

### 7.2 Calm User Simulation (`simulateCalmUser`)
Dispatches smooth, controlled cursor movements:
- Velocity maintained at a gentle $120 - 240\text{ px/s}$.
- Pauses kept under $800\text{ ms}$.
- Valid interactive form clicks with zero rage clicks.
- Cognitive Load Score remains stable between $5 - 20$ (well below threshold).

### 7.3 CSV Telemetry Time-Series Export
The simulator includes a `generateTelemetryReportCSV()` generator exporting the full 60-second rolling buffer with columns:
`timestamp, timeSeconds, score, rawScore, threshold, isTriggered, activeField, velocityVariance, hesitationMs, rageClicks, clickErrorRate, directionChanges, mode`.
Users can download the audit file via `downloadCSVReport()` directly from the Telemetry HUD.

---

## 8. Mathematical Notation Glossary & Variable Index

| Symbol | Mathematical Definition | Units / Scale | Code Equivalent |
| :--- | :--- | :--- | :--- |
| $\bar{v}$ / $\mu_v$ | Mean cursor velocity over rolling window | Pixels / second | `meanVelocity` |
| $\sigma_v^2$ | Sample variance of instantaneous velocities | $\text{px}^2/\text{s}^2$ | `velocityVariance` |
| $\sigma_v$ | Standard deviation of cursor velocity | Pixels / second | `stdDev` |
| $\theta$ | Heading angle computed via $\text{atan2}(\Delta y, \Delta x)$ | Radians ($-\pi \dots \pi$) | `headingAngle` |
| $\Delta \theta$ | Angular direction deflection between consecutive samples | Radians ($0 \dots \pi$) | `angleDiff` |
| $t_{\text{hesitate}}$ | Continuous idle dwell on active field without interaction | Milliseconds | `hesitationMs` |
| $\alpha_{\text{eff}}$ | Asymmetric exponential smoothing parameter | Unitless ($0.45 - 0.65$) | `effAlpha` |
| $S_t$ | Calibrated Cognitive Load Score at time $t$ | Range $[0, 100]$ | `cognitiveLoadScore` |
| $T$ | Adaptation trigger threshold | Default: $70$ | `threshold` |

---

## 9. Touch & Mobile Gestural Telemetry Considerations

On touchscreen devices:
1. **Touchmove Emulation:** Pointer and touch events generate continuous trajectory streams similar to mousemove.
2. **Hesitation Dwell:** Focus events on mobile keyboards (`focus`, `blur`) track touch hesitation without requiring pointer motion.
3. **Double-Tap / Multi-Tap Clustering:** Rapid taps on disabled buttons or static labels map cleanly to rage-click clustering algorithms.
