# ConversationalWizard 3-Step Assistant Specification

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/components/ConversationalWizard.jsx`

---

## 1. Conversational Journey Design
When friction triggers UI adaptation, the 21-field form is condensed into an intelligent 3-step wizard:

- **Step 1: Income and Housing Details**
  - Conversational question: *"Let's simplify your financial disclosure. What is your annual income and housing cost?"*
  - Pre-filled inputs: Gross Annual Income, Housing Payment.
- **Step 2: Employment and Assets**
  - Conversational question: *"Tell us about your current employer and liquid assets."*
  - Inputs: Employment Status, Employer Name, Checking & Savings Balance.
- **Step 3: Review and Confirm**
  - Consolidated summary of all entered parameters across the application.
  - Clear confirmation button and instant submission handler.

## 2. Navigation & Animation Controls
- **Next Step:** Slides forward with `+36px` to `0px` spring translation.
- **Back Step:** Slides backward with `-36px` to `0px` translation.
- **Revert:** Persistent top action button restoring the full 21-field form without page reload.
