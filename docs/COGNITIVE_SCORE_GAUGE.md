# CognitiveScoreGauge Visual Component Architecture

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/components/CognitiveScoreGauge.jsx`

---

## 1. Component Overview
The `CognitiveScoreGauge` renders a large, animated, circular SVG progress dial visualizing the user's real-time Cognitive Load Score (0–100).

## 2. Visual Specifications
- **Progress Ring:** SVG circle with dynamic `strokeDashoffset` driven by score percentage.
- **Glowing Violet Arc:** `#8057FF` with drop shadow filter creating an intelligent SaaS aesthetic.
- **Cyan Pulse Indicator:** `#25D9E8` live activity dot animated on incoming telemetry.
- **Numerical Score Display:** Large bold score typography with smooth tabular transitions.
- **Dynamic Status Pill:**
  - `Normal` (0–44): Emerald badge indicating optimal interaction flow.
  - `Elevated` (45–69): Amber warning badge indicating emerging hesitation.
  - `High` (70–100): Rose pulse badge indicating threshold breach.
- **Threshold Marker:** Visible graduation mark at the configured trigger point (70 pts).
