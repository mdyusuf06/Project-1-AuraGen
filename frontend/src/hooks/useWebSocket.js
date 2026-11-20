"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createAuraGenWsService, WS_STATUS } from "../services/wsService";

export { WS_STATUS };

const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

/**
 * React hook for managing AuraGen's WebSocket connection state machine
 * (CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED) with exponential backoff.
 *
 * @param {string} [url] - WebSocket endpoint URL
 * @param {object} [options] - Exponential backoff options
 */
export function useWebSocket(url = DEFAULT_WS_URL, options = {}) {
  const [status, setStatus] = useState(WS_STATUS.DISCONNECTED);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [nextReconnectDelayMs, setNextReconnectDelayMs] = useState(0);

  const serviceRef = useRef(null);
  const pendingListenersRef = useRef(new Set());

  useEffect(() => {
    const service = createAuraGenWsService(url, options);
    serviceRef.current = service;

    const unsubs = [];
    for (const listener of pendingListenersRef.current) {
      unsubs.push(service.onMessage(listener));
    }

    const unsubStatus = service.onStatusChange(
      ({ status: nextStatus, reconnectAttempt: attempt, nextReconnectDelayMs: delayMs }) => {
        setStatus(nextStatus);
        setReconnectAttempt(attempt);
        setNextReconnectDelayMs(delayMs || 0);
      }
    );

    service.connect();

    return () => {
      unsubStatus();
      for (const unsub of unsubs) {
        unsub();
      }
      service.disconnect();
      serviceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const sendTelemetry = useCallback((telemetryPayload) => {
    if (!serviceRef.current) return false;
    return serviceRef.current.sendTelemetry(telemetryPayload);
  }, []);

  const onMessage = useCallback((callback) => {
    if (typeof callback !== "function") return () => {};

    pendingListenersRef.current.add(callback);
    const serviceUnsub = serviceRef.current
      ? serviceRef.current.onMessage(callback)
      : () => {};

    return () => {
      pendingListenersRef.current.delete(callback);
      serviceUnsub();
    };
  }, []);

  const reconnect = useCallback(() => {
    serviceRef.current?.reconnect();
  }, []);

  return {
    status,
    WS_STATUS,
    isConnected: status === WS_STATUS.CONNECTED,
    reconnectAttempt,
    nextReconnectDelayMs,
    sendTelemetry,
    onMessage,
    reconnect
  };
}
