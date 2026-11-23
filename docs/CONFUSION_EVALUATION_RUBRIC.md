# Confusion vs Calm User Evaluation Rubric

**Author:** Raksha R. (Senior Frontend Lead)  
**Scope:** Evaluator & National Demonstration Guidelines

---

## Evaluation Benchmark Criteria

| Evaluation Dimension | Calm User Benchmark | Confused User Benchmark | Verification Method |
| :--- | :--- | :--- | :--- |
| **Cognitive Load Score** | Remains low: **8–18 pts** (<= 25) | Spikes rapidly: **75–88 pts** (>= 70) | CognitiveScoreGauge & HUD |
| **Score Delta ($\Delta$)** | Baseline stability | $\Delta \ge 50	ext{ pts}$ separation | Telemetry Comparison Banner |
| **Velocity Profile** | Smooth: $140–200	ext{ px/s}$ | High Variance: $550–1100	ext{ px/s}$ | TelemetryDebugPanel |
| **Hesitation Dwell** | Rapid progression: $< 800	ext{ms}$ | Extended stall: $> 6,000	ext{ms}$ | TelemetryHUD metric card |
| **Rage Clicking** | 0 incidents | $\ge 3$ rapid cluster clicks | Rage Clicks metric card |
| **UI Transformation** | Form remains stable | Smooth morph into 3-step wizard | Glassmorphic overlay & wizard |
