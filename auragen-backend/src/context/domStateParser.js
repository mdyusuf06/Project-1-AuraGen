// ============================================================
// DOM STATE PARSER — WEEK 3
// ============================================================

export class DOMStateParser {
    /**
     * Parse and sanitize raw DOM context from frontend.
     * @param {Object} rawContext
     * @returns {Object} Clean, structured context safe for LLM
     */
    parse(rawContext) {
        if (!rawContext || typeof rawContext !== "object") {
            return this.getEmptyContext();
        }

        return {
            formData: this.sanitizeFormData(rawContext.formData),
            fieldErrors: this.sanitizeErrors(rawContext.fieldErrors),
            formSchema: this.sanitizeSchema(rawContext.formSchema),
            activeFieldId: this.sanitizeFieldId(rawContext.activeFieldId),
            touchedFields: this.sanitizeFieldList(rawContext.touchedFields),
            scrollPosition: Number(rawContext.scrollPosition) || 0,
            viewportHeight: Number(rawContext.viewportHeight) || 768,
            timestamp: new Date().toISOString(),
        };
    }

    // ── Sanitizers ────────────────────────────────────────────────

    sanitizeFormData(formData) {
        if (!formData || typeof formData !== "object") return {};
        const result = {};
        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === "string") {
                result[key] = this.maskSensitiveValue(key, value);
            } else if (typeof value === "number" || typeof value === "boolean") {
                result[key] = value;
            }
            // Intentionally drop objects and arrays — keep data flat
        }
        return result;
    }

    maskSensitiveValue(fieldId, value) {
        const f = fieldId.toLowerCase();

        // Social Security Number → show last 4 only
        if (f.includes("ssn") || f.includes("social_security")) {
            return value.length > 4 ? `***-**-${value.slice(-4)}` : "***";
        }

        // Account numbers → show last 4 only
        if (f.includes("account") && value.length > 8) {
            return `****${value.slice(-4)}`;
        }

        // Passwords and PINs → never send to LLM
        if (f.includes("password") || f.includes("pin")) {
            return "[REDACTED]";
        }

        return value;
    }

    sanitizeErrors(errors) {
        if (!errors || typeof errors !== "object") return {};
        const result = {};
        for (const [key, value] of Object.entries(errors)) {
            if (typeof value === "string") {
                result[key] = value.substring(0, 200); // Cap error message length
            }
        }
        return result;
    }

    sanitizeSchema(schema) {
        if (!Array.isArray(schema)) return [];
        return schema
            .slice(0, 50) // Max 50 fields
            .map((field) => ({
                id: String(field.id || ""),
                label: String(field.label || ""),
                type: String(field.type || "text"),
                required: Boolean(field.required),
                placeholder: String(field.placeholder || ""),
                helpText: String(field.helpText || ""),
                // Drop any functions or React-specific props
            }))
            .filter((f) => f.id); // Remove fields with no ID
    }

    sanitizeFieldId(fieldId) {
        if (!fieldId || typeof fieldId !== "string") return null;
        // Allow only safe characters in field IDs
        return fieldId
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .substring(0, 100);
    }

    sanitizeFieldList(fields) {
        if (!Array.isArray(fields)) return [];
        return fields
            .filter((f) => typeof f === "string")
            .map((f) => f.replace(/[^a-zA-Z0-9_-]/g, ""))
            .slice(0, 50);
    }

    getEmptyContext() {
        return {
            formData: {},
            fieldErrors: {},
            formSchema: [],
            activeFieldId: null,
            touchedFields: [],
            scrollPosition: 0,
            viewportHeight: 768,
            timestamp: new Date().toISOString(),
        };
    }
}
