# TelemetryDebugPanel Developer Cockpit Guide

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/components/TelemetryDebugPanel.jsx`

---

## 1. Overview
The `TelemetryDebugPanel` provides a non-intrusive floating cockpit in the bottom-right corner of the viewport (toggleable via `Ctrl+Shift+D`).

## 2. Displayed Diagnostic Telemetry
- **Cognitive Load Score:** Current real-time smoothed score (0–100).
- **Threshold Level:** Configured breach trigger point (default: 70).
- **Interface Mode:** Current active visual mode (`standard`, `simplifying`, `wizard`, `fallback`).
- **Generation Latency:** Milliseconds elapsed between request dispatch and component arrival.
- **WebSocket Health:** Connection status and reconnect attempt counters.
- **AST Cache Status:** Hit or miss indicators for client-side pre-compiled templates.
