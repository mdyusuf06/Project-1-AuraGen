"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { GenerationFallbackManager, DEFAULT_GENERATION_TIMEOUT_MS } from "./generationFallbackManager.js";
import { getFallbackTemplate } from "./prebuiltTemplates.js";

/**
 * useGenerationFallback React Hook
 *
 * Coordinates 4-second generation timeout, validation_failed WebSocket messages,
 * connection drops, and template fallback.
 */
export function useGenerationFallback({
  timeoutMs = DEFAULT_GENERATION_TIMEOUT_MS,
  wsStatus = "connected",
  isConnected = true,
  onMessage = null,
  onFallback = null,
  onRestoreOriginal = null,
  onSuccess = null,
  templateResolver = getFallbackTemplate
} = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [fallbackState, setFallbackState] = useState(null);

  const managerRef = useRef(null);

  if (!managerRef.current) {
    managerRef.current = new GenerationFallbackManager({
      timeoutMs,
      templateResolver,
      onFallback: (state) => {
        setIsGenerating(false);
        setFallbackState(state);
        onFallback?.(state);
      },
      onRestoreOriginal: (state) => {
        setIsGenerating(false);
        setFallbackState(state);
        onRestoreOriginal?.(state);
      },
      onSuccess: (msg) => {
        setIsGenerating(false);
        setFallbackState(null);
        onSuccess?.(msg);
      }
    });
  }

  // Update callbacks
  managerRef.current.onFallback = (state) => {
    setIsGenerating(false);
    setFallbackState(state);
    onFallback?.(state);
  };
  managerRef.current.onRestoreOriginal = (state) => {
    setIsGenerating(false);
    setFallbackState(state);
    onRestoreOriginal?.(state);
  };
  managerRef.current.onSuccess = (msg) => {
    setIsGenerating(false);
    setFallbackState(null);
    onSuccess?.(msg);
  };
  managerRef.current.timeoutMs = timeoutMs;

  const startGeneration = useCallback(({ activeField = "annualIncome", templateId = null } = {}) => {
    setIsGenerating(true);
    setFallbackState(null);
    managerRef.current.startGeneration({ activeField, templateId });
  }, []);

  const cancelGeneration = useCallback(() => {
    managerRef.current.cancelGeneration();
    setIsGenerating(false);
  }, []);

  const resetFallback = useCallback(() => {
    managerRef.current.cleanup();
    setIsGenerating(false);
    setFallbackState(null);
  }, []);

  // Listen to WebSocket messages if onMessage is provided
  useEffect(() => {
    if (!onMessage) return;

    const unsubscribe = onMessage((msg) => {
      managerRef.current.handleMessage(msg);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [onMessage]);

  // Handle connection drops while generation is in flight
  useEffect(() => {
    if (isGenerating && (!isConnected || wsStatus === "disconnected" || wsStatus === "error")) {
      managerRef.current.handleConnectionFailure(`WebSocket state: ${wsStatus}`);
    }
  }, [isConnected, wsStatus, isGenerating]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      managerRef.current?.cleanup();
    };
  }, []);

  return {
    isGenerating,
    fallbackState,
    hasTriggeredFallback: managerRef.current.hasTriggeredFallback,
    startGeneration,
    cancelGeneration,
    resetFallback,
    handleMessage: (msg) => managerRef.current.handleMessage(msg),
    handleConnectionFailure: (reason) => managerRef.current.handleConnectionFailure(reason)
  };
}

export default useGenerationFallback;
