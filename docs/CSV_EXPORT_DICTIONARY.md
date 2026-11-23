# CSV Telemetry Export Data Dictionary

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/utils/telemetrySimulator.js`

---

## Column Specification

| Column Header | Data Type | Units / Scale | Description |
| :--- | :--- | :--- | :--- |
| `timestamp` | ISO-8601 | UTC Date-Time | Timestamp of recorded telemetry frame. |
| `timeSeconds` | Integer | Seconds | Elapsed session time in seconds. |
| `score` | Integer | 0–100 pts | Smoothed Cognitive Load Score. |
| `rawScore` | Integer | 0–100 pts | Unsmoothed instantaneous weighted score. |
| `threshold` | Integer | 0–100 pts | Configured trigger threshold (default: 70). |
| `isTriggered` | Boolean | `true`/`false` | Flag indicating threshold breach. |
| `activeField` | String | Identifier | Currently focused form field. |
| `velocityVariance` | Number | $\text{px}^2/\text{s}^2$ | Sample variance of mouse velocity. |
| `hesitationMs` | Integer | Milliseconds | Continuous idle pause on active input. |
| `rageClicks` | Integer | Count | Count of detected rage-click clusters. |
| `clickErrorRate` | Float | 0.0–1.0 | Misclick proportion over rolling window. |
| `directionChanges` | Integer | Count | Angular deflections > 45 degrees. |
| `mode` | String | Enum | Current simulation mode (`idle`, `confused`, `calm`). |
