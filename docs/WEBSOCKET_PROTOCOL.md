# AuraGen WebSocket Protocol Message Reference

**Author:** Raksha R. (Senior Frontend Lead)  
**Contract:** Shared Client-Server Protocol (`shared/protocol.md`)

---

## 1. Client-to-Server Messages

### `telemetry`
Streams real-time metrics and Cognitive Load Score every 1,000ms:
```json
{
  "type": "telemetry",
  "sessionId": "sess_01",
  "timestamp": 1700000000000,
  "metrics": {
    "mouseVelocity": 420,
    "hesitationMs": 4500,
    "rageClicks": 2,
    "clickErrorRate": 0.25
  },
  "cognitiveLoadScore": 74,
  "activeField": "annualIncome"
}
```

### `generate_request`
Explicitly invokes AI component generation:
```json
{
  "type": "generate_request",
  "sessionId": "sess_01",
  "formState": { "formId": "loan-app", "focusedField": "annualIncome" },
  "score": 78
}
```

### `revert`
Notifies server that the user returned to the full form:
```json
{
  "type": "revert",
  "sessionId": "sess_01",
  "timestamp": 1700000000000
}
```

## 2. Server-to-Client Messages
- `component`: Full React wizard code string `{ type: "component", code }`.
- `component_chunk`: Progressive token stream `{ type: "component_chunk", chunk, index }`.
- `validation_failed`: AST security rejection `{ type: "validation_failed", errors }`.
- `fallback`: Directive to activate template `{ type: "fallback", reason, templateId }`.
