// ============================================================
// COMPONENT COMPILER — WEEK 2
// Orchestrates the full compile pipeline for LLM output
// ============================================================

import { ASTValidator } from "./astValidator.js";

export class ComponentCompiler {
    constructor() {
        this.validator = new ASTValidator();
    }

    /**
     * Full compile pipeline: raw LLM code → safe delivery package.
     * @param {Object} generatedOutput - { componentName, code, reasoning, generationTimeMs }
     * @returns {Object} Compiled package ready for WebSocket delivery
     */
    async compile(generatedOutput) {
        const { componentName, code, reasoning, generationTimeMs } = generatedOutput;

        console.log(`[ComponentCompiler] 🔧 Compiling "${componentName}"`);

        // ── STEP 1: AST Security Validation ──────────────────────
        const { valid, errors } = this.validator.validate(code);

        if (!valid) {
            throw new CompilationError(
                `Security validation failed for "${componentName}"`,
                errors
            );
        }

        // ── STEP 2: Sanitize ──────────────────────────────────────
        const sanitizedCode = this.sanitize(code);

        // ── STEP 3: Create delivery package ──────────────────────
        const pkg = this.createPackage({
            componentName,
            code: sanitizedCode,
            reasoning,
            generationTimeMs,
        });

        console.log(
            `[ComponentCompiler] ✅ Compiled — ${pkg.metadata.codeSizeBytes} bytes`
        );

        return pkg;
    }

    /**
     * Light sanitization — no functional changes, just cleanliness.
     */
    sanitize(code) {
        return code
            .replace(/\/\/[^\n]*/g, "")    // Remove single-line comments
            .replace(/\n{3,}/g, "\n\n")    // Collapse excess blank lines
            .trim();
    }

    /**
     * Wrap compiled code in the WebSocket delivery envelope.
     */
    createPackage({ componentName, code, reasoning, generationTimeMs }) {
        return {
            type: "COMPONENT_UPDATE",
            componentName,
            code,
            reasoning,
            metadata: {
                generatedAt: new Date().toISOString(),
                generationTimeMs,
                codeSizeBytes: Buffer.byteLength(code, "utf8"),
                version: `v${Date.now()}`,
                fromCache: false,
            },
        };
    }
}

// ── Custom Error ──────────────────────────────────────────────
export class CompilationError extends Error {
    constructor(message, violations = []) {
        super(message);
        this.name = "CompilationError";
        this.violations = violations;
    }
}
