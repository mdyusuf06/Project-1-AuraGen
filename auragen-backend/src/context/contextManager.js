// ============================================================
// CONTEXT MANAGER — WEEK 3
// Stores and manages per-session DOM state + form data.
// ============================================================

export class ContextManager {
    constructor() {
        // sessionId → full context snapshot
        this.sessionContexts = new Map();

        // Auto-cleanup sessions after 30 minutes of inactivity
        this.SESSION_TTL_MS = 30 * 60 * 1000;
        this.cleanupInterval = setInterval(
            () => this.cleanupExpiredSessions(),
            5 * 60 * 1000 // Check every 5 minutes
        );

        console.log("[ContextManager] ✅ Initialized");
    }

    // ── STORE: Called every time frontend sends telemetry ───────
    /**
     * Updates the session context with the latest snapshot from frontend.
     * @param {string} sessionId
     * @param {Object} contextSnapshot - Full DOM + form state from frontend
     */
    updateContext(sessionId, contextSnapshot) {
        const existing = this.sessionContexts.get(sessionId) || {};

        const updated = {
            ...existing,

            // Form field values (what the user has typed so far)
            formData: {
                ...(existing.formData || {}),
                ...(contextSnapshot.formData || {}),
            },

            // Which fields have validation errors right now
            fieldErrors: contextSnapshot.fieldErrors || existing.fieldErrors || {},

            // The complete form schema (field definitions)
            formSchema: contextSnapshot.formSchema || existing.formSchema || [],

            // Currently active/focused field
            activeFieldId: contextSnapshot.activeFieldId || existing.activeFieldId,

            // User's scroll position (helps LLM know what was visible)
            scrollPosition: contextSnapshot.scrollPosition || 0,

            // Fields that have been interacted with at all
            touchedFields: new Set([
                ...(existing.touchedFields || []),
                ...(contextSnapshot.touchedFields || []),
            ]),

            // History of friction events this session
            frictionHistory: [
                ...(existing.frictionHistory || []),
                {
                    timestamp: new Date().toISOString(),
                    score: contextSnapshot.cognitiveLoadScore,
                    fieldId: contextSnapshot.activeFieldId,
                },
            ].slice(-10), // Keep last 10 events only

            lastUpdated: Date.now(),
        };

        this.sessionContexts.set(sessionId, updated);
    }

    // ── GET: Called by Code-Gen Agent before LLM invocation ─────
    /**
     * Returns the full enriched context for LLM prompt building.
     * @param {string} sessionId
     * @returns {Object} Complete context object for LLM
     */
    getContext(sessionId) {
        const ctx = this.sessionContexts.get(sessionId);
        if (!ctx) return null;

        return {
            formData: ctx.formData || {},
            fieldErrors: ctx.fieldErrors || {},
            formSchema: ctx.formSchema || [],
            activeFieldId: ctx.activeFieldId,
            touchedFields: Array.from(ctx.touchedFields || []),
            frictionHistory: ctx.frictionHistory || [],
            scrollPosition: ctx.scrollPosition || 0,

            // Derived: Which fields are complete vs incomplete
            completedFields: this.deriveCompletedFields(ctx),
            incompleteFields: this.deriveIncompleteFields(ctx),
            problematicFields: this.deriveProblematicFields(ctx),
        };
    }

    // ── DERIVE HELPERS ───────────────────────────────────────────

    deriveCompletedFields(ctx) {
        const completed = {};
        for (const [fieldId, value] of Object.entries(ctx.formData || {})) {
            if (value !== null && value !== undefined && value !== "") {
                completed[fieldId] = value;
            }
        }
        return completed;
    }

    deriveIncompleteFields(ctx) {
        return (ctx.formSchema || [])
            .filter((field) => {
                const value = ctx.formData?.[field.id];
                return !value || value === "";
            })
            .map((f) => f.id);
    }

    // Fields that have errors OR have been rageclicked repeatedly
    deriveProblematicFields(ctx) {
        const errorFields = Object.keys(ctx.fieldErrors || {});
        const repeatedFrictionFields = (ctx.frictionHistory || [])
            .filter((h) => h.score > 70)
            .map((h) => h.fieldId)
            .filter(Boolean);

        return [...new Set([...errorFields, ...repeatedFrictionFields])];
    }

    // ── CLEANUP ──────────────────────────────────────────────────

    clearSession(sessionId) {
        this.sessionContexts.delete(sessionId);
        console.log(`[ContextManager] 🗑️ Session cleared: ${sessionId}`);
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        let cleaned = 0;
        for (const [sessionId, ctx] of this.sessionContexts.entries()) {
            if (now - ctx.lastUpdated > this.SESSION_TTL_MS) {
                this.sessionContexts.delete(sessionId);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`[ContextManager] 🧹 Cleaned ${cleaned} expired sessions`);
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
    }
}
