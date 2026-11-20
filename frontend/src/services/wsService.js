/**
 * AuraGen Client WebSocket Service
 * Features:
 *  - Explicit connection state machine (CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED)
 *  - Auto-reconnect with exponential backoff + jitter
 *  - Telemetry serialization supporting Sliding Window scores, directionChanges, clickErrorCount & formStateSnapshot
 *  - Pub/sub message subscription (`onMessage`)
 */

export const WS_STATUS = Object.freeze({
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  RECONNECTING: "RECONNECTING",
  DISCONNECTED: "DISCONNECTED"
});

export function createAuraGenWsService(url, options = {}) {
  const {
    baseReconnectDelayMs = 1000,
    maxReconnectDelayMs = 15000,
    maxReconnectAttempts = Infinity
  } = options;

  let socket = null;
  let status = WS_STATUS.DISCONNECTED;
  let reconnectAttempt = 0;
  let nextReconnectDelayMs = 0;
  let reconnectTimer = null;
  let intentionallyClosed = false;

  const messageListeners = new Set();
  const statusListeners = new Set();

  function setStatus(nextStatus) {
    status = nextStatus;
    for (const listener of statusListeners) {
      try {
        listener({ status, reconnectAttempt, nextReconnectDelayMs });
      } catch (err) {
        console.error("[AuraGen WS] Status listener error:", err);
      }
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (intentionallyClosed || reconnectAttempt >= maxReconnectAttempts) {
      nextReconnectDelayMs = 0;
      setStatus(WS_STATUS.DISCONNECTED);
      return;
    }

    reconnectAttempt += 1;

    const exponentialDelay = Math.min(
      maxReconnectDelayMs,
      baseReconnectDelayMs * Math.pow(2, reconnectAttempt - 1)
    );
    const jitter = Math.floor(Math.random() * 300);
    nextReconnectDelayMs = exponentialDelay + jitter;

    setStatus(WS_STATUS.RECONNECTING);

    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      connect();
    }, nextReconnectDelayMs);
  }

  function connect() {
    if (typeof window === "undefined") return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    intentionallyClosed = false;
    clearReconnectTimer();
    setStatus(reconnectAttempt > 0 ? WS_STATUS.RECONNECTING : WS_STATUS.CONNECTING);

    try {
      const ws = new WebSocket(url);
      socket = ws;

      ws.onopen = () => {
        if (socket !== ws) return;
        reconnectAttempt = 0;
        nextReconnectDelayMs = 0;
        setStatus(WS_STATUS.CONNECTED);
      };

      ws.onmessage = (event) => {
        if (socket !== ws) return;
        try {
          const parsed = JSON.parse(event.data);
          for (const listener of messageListeners) {
            try {
              listener(parsed);
            } catch (err) {
              console.error("[AuraGen WS] Message listener error:", err);
            }
          }
        } catch (err) {
          console.error("[AuraGen WS] Failed to parse server message:", err);
        }
      };

      ws.onerror = () => {
        // Error events are followed by close events in browser WebSockets
      };

      ws.onclose = () => {
        if (socket !== ws) return;
        socket = null;
        if (intentionallyClosed) {
          setStatus(WS_STATUS.DISCONNECTED);
        } else {
          scheduleReconnect();
        }
      };
    } catch (err) {
      console.error("[AuraGen WS] Failed to initialize WebSocket:", err);
      scheduleReconnect();
    }
  }

  function disconnect() {
    intentionallyClosed = true;
    clearReconnectTimer();

    if (socket) {
      const current = socket;
      socket = null;
      current.onopen = null;
      current.onmessage = null;
      current.onerror = null;
      current.onclose = null;

      if (current.readyState === WebSocket.OPEN) {
        current.close(1000, "Client disconnect");
      } else if (current.readyState === WebSocket.CONNECTING) {
        current.onopen = () => current.close(1000, "Client cleanup");
      }
    }

    reconnectAttempt = 0;
    nextReconnectDelayMs = 0;
    setStatus(WS_STATUS.DISCONNECTED);
  }

  /**
   * Sends a telemetry payload formatted according to the shared AuraGen protocol.
   */
  function sendTelemetry(telemetry) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const activeField = String(telemetry.activeFieldId ?? telemetry.activeField ?? "");
    const rollingScore = Number(
      telemetry.rollingAverageScore ?? telemetry.cognitiveLoadScore ?? 0
    );
    const instantScore = Number(
      telemetry.instantScore ?? telemetry.cognitiveLoadScore ?? 0
    );

    const normalizedPayload = {
      type: "telemetry",
      sessionId: String(telemetry.sessionId || "anonymous"),
      timestamp: Number(telemetry.timestamp || Date.now()),
      metrics: {
        mouseVelocity: Number(telemetry.metrics?.mouseVelocity ?? 0),
        hesitationMs: Number(telemetry.metrics?.hesitationMs ?? 0),
        rageClicks: Number(telemetry.metrics?.rageClicks ?? 0),
        clickErrorRate: Number(telemetry.metrics?.clickErrorRate ?? 0),
        clickErrorCount: Number(telemetry.metrics?.clickErrorCount ?? 0),
        directionChanges: Number(telemetry.metrics?.directionChanges ?? 0)
      },
      cognitiveLoadScore: rollingScore,
      instantScore,
      rollingAverageScore: rollingScore,
      activeField,
      activeFieldId: activeField
    };

    if (telemetry.cursor) {
      normalizedPayload.cursor = {
        x: Math.max(0, Math.round(Number(telemetry.cursor.x ?? 0))),
        y: Math.max(0, Math.round(Number(telemetry.cursor.y ?? 0)))
      };
    }

    if (telemetry.formStateSnapshot) {
      normalizedPayload.formStateSnapshot = telemetry.formStateSnapshot;
    }

    if (telemetry.userInput) {
      normalizedPayload.userInput = telemetry.userInput;
    }

    if (telemetry.formFields) {
      normalizedPayload.formFields = telemetry.formFields;
    }

    socket.send(JSON.stringify(normalizedPayload));
    return true;
  }

  function onMessage(callback) {
    if (typeof callback !== "function") return () => {};
    messageListeners.add(callback);
    return () => {
      messageListeners.delete(callback);
    };
  }

  function onStatusChange(callback) {
    if (typeof callback !== "function") return () => {};
    statusListeners.add(callback);
    callback({ status, reconnectAttempt, nextReconnectDelayMs });
    return () => {
      statusListeners.delete(callback);
    };
  }

  return {
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      connect();
    },
    getStatus: () => status,
    sendTelemetry,
    onMessage,
    onStatusChange
  };
}
