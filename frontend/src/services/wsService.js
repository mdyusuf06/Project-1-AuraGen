/**
 * AuraGen Client WebSocket Service
 * Features:
 *  - Auto-reconnect with exponential backoff + jitter
 *  - Explicit connection status tracking ("connecting" | "connected" | "reconnecting" | "disconnected")
 *  - Shared JSON telemetry sender (`sendTelemetry`)
 *  - Pub/sub message subscription (`onMessage`)
 */

export function createAuraGenWsService(url, options = {}) {
  const {
    baseReconnectDelayMs = 1000,
    maxReconnectDelayMs = 15000,
    maxReconnectAttempts = Infinity
  } = options;

  let socket = null;
  let status = "disconnected";
  let reconnectAttempt = 0;
  let reconnectTimer = null;
  let intentionallyClosed = false;

  const messageListeners = new Set();
  const statusListeners = new Set();

  function setStatus(nextStatus) {
    status = nextStatus;
    for (const listener of statusListeners) {
      try {
        listener({ status, reconnectAttempt });
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
      setStatus("disconnected");
      return;
    }

    reconnectAttempt += 1;
    setStatus("reconnecting");

    const exponentialDelay = Math.min(
      maxReconnectDelayMs,
      baseReconnectDelayMs * Math.pow(2, reconnectAttempt - 1)
    );
    const jitter = Math.floor(Math.random() * 300);
    const delay = exponentialDelay + jitter;

    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function connect() {
    if (typeof window === "undefined") return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    intentionallyClosed = false;
    clearReconnectTimer();
    setStatus(reconnectAttempt > 0 ? "reconnecting" : "connecting");

    try {
      const ws = new WebSocket(url);
      socket = ws;

      ws.onopen = () => {
        // Ignore stale socket events if replaced
        if (socket !== ws) return;
        reconnectAttempt = 0;
        setStatus("connected");
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
          setStatus("disconnected");
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
        // Close once open to avoid browser "WebSocket closed before connection established" warning
        current.onopen = () => current.close(1000, "Client cleanup");
      }
    }

    reconnectAttempt = 0;
    setStatus("disconnected");
  }

  /**
   * Sends a telemetry payload formatted according to the shared AuraGen protocol.
   * @param {object} telemetry
   * @returns {boolean} True if transmitted over open socket, false otherwise
   */
  function sendTelemetry(telemetry) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const normalizedPayload = {
      type: "telemetry",
      sessionId: String(telemetry.sessionId || "anonymous"),
      timestamp: Number(telemetry.timestamp || Date.now()),
      metrics: {
        mouseVelocity: Number(telemetry.metrics?.mouseVelocity ?? 0),
        hesitationMs: Number(telemetry.metrics?.hesitationMs ?? 0),
        rageClicks: Number(telemetry.metrics?.rageClicks ?? 0),
        clickErrorRate: Number(telemetry.metrics?.clickErrorRate ?? 0)
      },
      cognitiveLoadScore: Number(telemetry.cognitiveLoadScore ?? 0),
      activeField: String(telemetry.activeField ?? "")
    };

    // Pass optional context if provided (ready for Week 3 state preservation)
    if (telemetry.userInput) {
      normalizedPayload.userInput = telemetry.userInput;
    }
    if (telemetry.formFields) {
      normalizedPayload.formFields = telemetry.formFields;
    }

    socket.send(JSON.stringify(normalizedPayload));
    return true;
  }

  /**
   * Subscribes to incoming parsed JSON messages from the WebSocket server.
   * @param {function} callback
   * @returns {function} Unsubscribe function
   */
  function onMessage(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }
    messageListeners.add(callback);
    return () => {
      messageListeners.delete(callback);
    };
  }

  function onStatusChange(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }
    statusListeners.add(callback);
    // Emit current status immediately upon subscribe
    callback({ status, reconnectAttempt });
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

