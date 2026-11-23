# Framer Motion Spring Physics Calibration Guide

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/animation/variants.js`

---

## 1. Physics Tuning Matrix

AuraGen calibrates Framer Motion spring dynamics to create a futuristic, high-performance SaaS feel:

| Parameter | Calibrated Value | Rationale |
| :--- | :--- | :--- |
| **`stiffness`** | `280` | High responsiveness ensuring snappiness without harsh stops. |
| **`damping`** | `24` | Natural kinetic dissipation preventing ringing or bounce overshoot. |
| **`mass`** | `0.8` | Light virtual weight creating an agile, intelligent UI sensation. |
| **`restDelta`** | `0.001` | High precision threshold ensuring imperceptible settle transitions. |

## 2. Transformation Variants
- **`formMorphVariant`:** Scale down (1.0 -> 0.94) and fade out over 350ms (within 300-400ms spec).
- **`wizardSpringVariant`:** Spring entrance translating y: 24px -> 0px.
- **`overlayVariant`:** 1.2s glassmorphic announcement scaling 0.95 -> 1.0 with backdrop blur.
- **`stepSlideVariant`:** Direction-aware horizontal translation (+36px forward, -36px back).
