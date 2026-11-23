# useTelemetry React Hook API Reference

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** rontend/src/hooks/useTelemetry.js

---

## Hook Signature

`	ypescript
function useTelemetry(options: TelemetryOptions): TelemetryReturn
`

### Options (TelemetryOptions)
- sessionId (string): Active user session identifier.
- ctiveField (string): Focused form input name for hesitation tracking.
- 	hreshold (number, default: 70): Cognitive load score threshold triggering transformation.
- weights (object): Metric weight configuration summing to 100.
- streamIntervalMs (number, default: 1000): Cadence of WebSocket telemetry dispatch.
- windowDurationMs (number, default: 10000): Rolling time window for metric aggregation.
- smoothingAlpha (number, default: 0.65): Base exponential smoothing factor.
- cooldownMs (number, default: 60000): Minimum cooldown window post-trigger.
- minInteractions (number, default: 2): Minimum user interactions required before scoring.
- isConnected (boolean): Active WebSocket connection flag.
- sendTelemetry (function): Transport callback emitting snapshot to WebSocket.
- onThreshold (function): Callback fired when score crosses threshold.

### Return Values (TelemetryReturn)
- 	elemetrySnapshot (object): Latest computed metrics, scores, and status flags.
- simulationMode (string): Current simulation status (idle | confused | calm).
- 	elemetryHistory (array): 60-second time-series rolling history.
- startConfusionSimulation (function): Initiates progressive confusion simulation.
- startCalmSimulation (function): Initiates steady calm simulation.
- stopSimulation (function): Restores simulation to idle.
- 	riggerSimulatedFriction (function): One-click synthetic friction spike helper.
- 
esetTelemetry (function): Clears rolling buffers and resets score to 0.
