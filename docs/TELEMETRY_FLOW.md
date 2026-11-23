# AuraGen Telemetry Architecture Diagram & Flow Guide

**Author:** Raksha R. (Senior Frontend Lead)  
**Module:** rontend/src/hooks/useTelemetry.js

---

## 1. End-to-End Telemetry Pipeline Flow

`
[User Input / Cursor] ──(100ms Gate)──> [Velocity & Heading Calculation]
                                                      │
                                                      ▼
[Active Field Focus]  ──(Dwell Timer)─> [Hesitation Measurement]
                                                      │
                                                      ▼
[Mouse Click Stream]  ──(Radius / Time)─> [Rage Click Clustering]
                                                      │
                                                      ▼
[10-Second Rolling Window] ─────────────> [FIFO Queue Pruning]
                                                      │
                                                      ▼
[Metric Normalization] ─────────────────> [Weighted Score Sum (0-100)]
                                                      │
                                                      ▼
[Asymmetric Smoothing Filter] ─────────> [Smoothed Cognitive Load Score]
                                                      │
                                                      ▼
[Threshold Evaluator (>= 70)] ──────────> [onThreshold Trigger / Cooldown (60s)]
`

## 2. Ingestion Subsystems

1. **MouseMove Gating:** 100ms throttling via performance.now().
2. **Velocity Tracking:** Instantaneous distance over delta time, bounded to 15,000 px/s.
3. **Heading Deflection:** Directional angle shifts > 45 degrees.
4. **Hesitation Timer:** Active field dwell tracking.
5. **Rage Click Engine:** Clusters of 3+ clicks in 1,000ms within 35px.
6. **Exponential Smoothing:** Dual-rate alpha (0.45 attack / 0.65 decay).
