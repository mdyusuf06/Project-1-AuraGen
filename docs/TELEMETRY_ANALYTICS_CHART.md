# TelemetryAnalyticsChart Time-Series Visualization

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/components/TelemetryAnalyticsChart.jsx`

---

## 1. Overview
The `TelemetryAnalyticsChart` displays the rolling 60-second time series of the user's Cognitive Load Score, showing immediate score spikes during friction and steady stability during calm use.

## 2. Chart Invariants
- **Rolling Window:** Visualizes up to 60 historical data points (1 data point per second).
- **Threshold Reference Line:** Distinct horizontal reference at score = 70 with glowing accent.
- **Trend Curve:** Smooth SVG polyline mapping historical score progression.
- **Real-Time Data Points:** Interactive tooltips displaying exact timestamp, raw score, and active field.
- **Audit Export:** Direct button triggering `downloadCSVReport()` to export the time-series.
