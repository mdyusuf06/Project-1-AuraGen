# ErrorBoundary & UI Resilience Guide

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/fallback/ErrorBoundary.js`

---

## 1. Architecture & Privacy Guarantees
The `ErrorBoundary` wraps dynamic UI modules to ensure that unexpected runtime errors never crash the entire page.

### Privacy-First Error Masking
- Internal stack traces, raw error messages, and AST compiler outputs are strictly suppressed from end users.
- A friendly, branded recovery screen is rendered with clear guidance.

## 2. Dual Recovery Flow
1. **Retry Assistance:** Re-mounts the simplified conversational wizard, attempting fresh evaluation.
2. **Return to Original Form:** Safely re-mounts the standard 21-field disclosure form with all user inputs intact.
