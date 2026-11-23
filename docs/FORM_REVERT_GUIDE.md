# Bidirectional Form State Preservation & Revert Protocol

**Author:** Raksha R. (Senior Frontend Lead)  
**Module:** `frontend/src/app/page.js` & WebSocket Protocol

---

## 1. Zero Data Loss Invariant
When a user switches between the full 21-field form and the simplified conversational wizard (or reverts back):
- **100% Data Preservation:** Values entered in the wizard (e.g. updated annual income) are merged into the central form state.
- **Zero Page Refresh:** State synchronization happens in-memory via React state, preserving DOM context.

## 2. WebSocket Revert Message Specification
Upon clicking "Back to Original Form", the client emits a revert message to reset in-flight server generation:
```json
{
  "type": "revert",
  "sessionId": "sess_123456",
  "timestamp": 1700000000000,
  "formValues": {
    "annualIncome": "185000",
    "employmentStatus": "Employed"
  }
}
```
