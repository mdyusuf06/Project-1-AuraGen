/**
 * GenerationFallbackManager
 *
 * Coordinates generation timeouts (4-second requirement), WebSocket validation
 * failures, generation errors, and connection drops.
 *
 * Requirements met:
 * 1. Handles validation_failed WebSocket messages.
 * 2. Handles generation errors and connection failures.
 * 3. Enforces 4-second generation timeout.
 * 4. Activates fallback if no valid generated component arrives in 4s.
 * 5. Integrates with pre-built wizard templates when available.
 * 6. Restores original form if template is unavailable.
 * 7. Dispatches clear, user-friendly messages without exposing internal errors.
 * 8. Cancels timeout immediately when generation succeeds.
 * 9. Strictly prevents duplicate fallback triggers.
 * 10. Cleanly cleans up timers and listeners.
 */

import { getFallbackTemplate } from "./prebuiltTemplates.js";

export const DEFAULT_GENERATION_TIMEOUT_MS = 4000;

export class GenerationFallbackManager {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_GENERATION_TIMEOUT_MS;
    this.templateResolver = options.templateResolver || getFallbackTemplate;

    // Callbacks
    this.onFallback = options.onFallback || null;
    this.onRestoreOriginal = options.onRestoreOriginal || null;
    this.onSuccess = options.onSuccess || null;
    this.onTimeout = options.onTimeout || null;

    // Internal State
    this.isGenerating = false;
    this.hasTriggeredFallback = false;
    this.timeoutTimer = null;
    this.activeField = null;
    this.activeTemplateId = null;
    this.fallbackState = null;
  }

  /**
   * Initiates generation tracking and starts the 4-second timeout.
   */
  startGeneration({ activeField = "annualIncome", templateId = null } = {}) {
    this.cleanup();

    this.isGenerating = true;
    this.hasTriggeredFallback = false;
    this.activeField = activeField;
    this.activeTemplateId = templateId;
    this.fallbackState = null;

    // Requirement 3 & 4: Start 4-second timeout
    this.timeoutTimer = setTimeout(() => {
      this._handleTimeout();
    }, this.timeoutMs);
  }

  /**
   * Internal timeout handler
   */
  _handleTimeout() {
    if (!this.isGenerating || this.hasTriggeredFallback) {
      return;
    }

    this.onTimeout?.();

    const userMessage =
      "Assistance generation took longer than expected (4s timeout). Safe fallback activated.";

    this._triggerFallback({
      reason: "timeout",
      message: userMessage,
      templateId: this.activeTemplateId,
      activeField: this.activeField
    });
  }

  /**
   * Core fallback execution with duplicate prevention and template resolution.
   */
  _triggerFallback({ reason, message, templateId, activeField, errors = null }) {
    // Requirement 9: Prevent duplicate fallback triggers
    if (this.hasTriggeredFallback) {
      return;
    }
    this.hasTriggeredFallback = true;
    this.isGenerating = false;

    // Cancel timer
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    // Requirement 5: Check if pre-built template is available
    const resolvedTemplate = this.templateResolver(templateId, activeField);

    this.fallbackState = {
      active: true,
      reason,
      message,
      templateId,
      activeField,
      templateComponent: resolvedTemplate,
      hasTemplate: Boolean(resolvedTemplate),
      errors,
      triggeredAt: Date.now()
    };

    if (resolvedTemplate) {
      // Requirement 5: Render pre-built template
      this.onFallback?.(this.fallbackState);
    } else {
      // Requirement 6: If template unavailable, restore original form
      this.onRestoreOriginal?.(this.fallbackState);
    }
  }

  /**
   * Processes incoming WebSocket messages according to shared protocol.
   */
  handleMessage(msg) {
    if (!msg || typeof msg !== "object") return;

    // Requirement 8: Cancel timeout handling when generation succeeds
    if (msg.type === "component" && typeof msg.code === "string") {
      this.isGenerating = false;
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
      this.onSuccess?.(msg);
      return;
    }

    // Requirement 1: Handle validation_failed WebSocket message
    if (msg.type === "validation_failed") {
      const userMessage =
        "The generated assistant encountered validation constraints. Safe fallback activated.";

      this._triggerFallback({
        reason: "validation_failed",
        message: userMessage,
        templateId: msg.templateId || this.activeTemplateId,
        activeField: this.activeField,
        errors: msg.errors
      });
      return;
    }

    // Server-initiated explicit fallback message: { type: "fallback", reason, templateId }
    if (msg.type === "fallback") {
      const userMessage =
        msg.reason || "Assistant generation requested verified fallback template.";

      this._triggerFallback({
        reason: msg.reason || "server_fallback",
        message: userMessage,
        templateId: msg.templateId || this.activeTemplateId,
        activeField: this.activeField
      });
      return;
    }

    // Requirement 2: Handle generation errors
    if (msg.type === "error" || msg.type === "generation_error") {
      const userMessage =
        "We encountered a temporary generation issue. Restoring your application safely.";

      this._triggerFallback({
        reason: "generation_error",
        message: userMessage,
        templateId: this.activeTemplateId,
        activeField: this.activeField,
        errors: msg.message || msg.details
      });
    }
  }

  /**
   * Requirement 2: Handle connection failures
   */
  handleConnectionFailure(reason = "WebSocket disconnected") {
    if (!this.isGenerating || this.hasTriggeredFallback) {
      return;
    }

    const userMessage =
      "Connection to assistance service lost. Restoring form safely.";

    this._triggerFallback({
      reason: "connection_failure",
      message: userMessage,
      templateId: this.activeTemplateId,
      activeField: this.activeField,
      errors: reason
    });
  }

  /**
   * Requirement 10: Clean up timers and reset tracking
   */
  cancelGeneration() {
    this.cleanup();
  }

  cleanup() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.isGenerating = false;
  }
}

export default GenerationFallbackManager;
