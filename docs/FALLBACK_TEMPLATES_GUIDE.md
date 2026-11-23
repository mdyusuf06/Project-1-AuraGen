# 4-Second Timeout & Prebuilt Fallback Templates Architecture

**Author:** Raksha R. (Senior Frontend Lead)  
**Files:** `frontend/src/fallback/generationFallbackManager.js` & `frontend/src/fallback/prebuiltTemplates.js`

---

## 1. The 4-Second Countdown Rule
When cognitive load crosses the threshold (70 pts), `GenerationFallbackManager` initiates an atomic 4,000ms countdown timer.
- If remote LLM code generation or WebSocket delivery exceeds 4 seconds, the wait is cancelled.
- The manager automatically routes to one of Pavilson's pre-compiled fallback templates.
- If templates are disabled or unavailable, it restores the original form cleanly.

## 2. Prebuilt Template Routing Matrix
| Template ID | Target Fields | Wizard Layout |
| :--- | :--- | :--- |
| **`income-stepper`** | `annualIncome`, `monthlyNetIncome`, `employmentStatus` | 2-step focused income verification stepper. |
| **`loan-details`** | `monthlyHousingPayment`, `totalCreditCardDebt` | 2-step focused debt-to-income assistant. |
| **`quick-review`** | All general form fields | Universal 2-step verification assistant. |
