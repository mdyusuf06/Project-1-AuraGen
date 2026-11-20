// ============================================================
// AST VALIDATOR — WEEK 2
// ============================================================

import * as parser from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default;

// ── Security Rule Sets ─────────────────────────────────────────

const FORBIDDEN_GLOBALS = new Set([
    "eval",
    "Function",
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "document",
    "window",
    "navigator",
    "location",
    "history",
    "process",
    "require",
    "module",
    "__dirname",
    "__filename",
    "global",
    "globalThis",
    "Buffer",
    "setInterval",
    "setTimeout",   // Prevent delayed execution tricks
]);

const FORBIDDEN_JSX_PROPS = new Set([
    "dangerouslySetInnerHTML",
    "ref",
    "suppressHydrationWarning",
]);

const ALLOWED_IMPORTS = new Set([
    "react",
]);

export class ASTValidator {
    /**
     * Full security validation pipeline.
     * @param {string} code - Raw JSX string from LLM
     * @returns {{ valid: boolean, errors: string[], ast: Object|null }}
     */
    validate(code) {
        const errors = [];
        let ast = null;

        // ── STEP 1: Parse → AST ───────────────────────────────────
        try {
            ast = parser.parse(code, {
                sourceType: "module",
                plugins: ["jsx"],
                errorRecovery: false,
            });
            console.log("[ASTValidator] ✅ Syntax valid");
        } catch (parseError) {
            return {
                valid: false,
                errors: [`SYNTAX: ${parseError.message}`],
                ast: null,
            };
        }

        // ── STEP 2: Traverse → Check every node ───────────────────
        try {
            traverse(ast, {

                // Check: No forbidden global identifiers in use
                Identifier(nodePath) {
                    if (FORBIDDEN_GLOBALS.has(nodePath.node.name)) {
                        const parent = nodePath.parent;
                        const isActiveUse =
                            parent.type === "CallExpression" ||
                            parent.type === "MemberExpression" ||
                            parent.type === "NewExpression" ||
                            parent.type === "TaggedTemplateExpression";

                        if (isActiveUse) {
                            errors.push(
                                `SECURITY: Forbidden global "${nodePath.node.name}" ` +
                                `at line ${nodePath.node.loc?.start?.line}`
                            );
                        }
                    }
                },

                // Check: No forbidden JSX attributes
                JSXAttribute(nodePath) {
                    const name = nodePath.node.name.name;
                    if (FORBIDDEN_JSX_PROPS.has(name)) {
                        errors.push(
                            `SECURITY: Forbidden JSX prop "${name}" ` +
                            `at line ${nodePath.node.loc?.start?.line}`
                        );
                    }
                },

                // Check: Only 'react' can be imported
                ImportDeclaration(nodePath) {
                    const source = nodePath.node.source.value;
                    if (!ALLOWED_IMPORTS.has(source)) {
                        errors.push(
                            `SECURITY: Unauthorized import "${source}" — only 'react' is allowed`
                        );
                    }
                },

                // Check: new Function() — eval in disguise
                NewExpression(nodePath) {
                    if (
                        nodePath.node.callee.type === "Identifier" &&
                        nodePath.node.callee.name === "Function"
                    ) {
                        errors.push(
                            `SECURITY: "new Function()" detected ` +
                            `at line ${nodePath.node.loc?.start?.line}`
                        );
                    }
                },

                // Check: Prototype pollution
                MemberExpression(nodePath) {
                    if (
                        !nodePath.node.computed &&
                        nodePath.node.property.name === "__proto__"
                    ) {
                        errors.push(
                            `SECURITY: "__proto__" access at line ${nodePath.node.loc?.start?.line}`
                        );
                    }
                },

                // Check: Template literal eval
                TaggedTemplateExpression(nodePath) {
                    if (
                        nodePath.node.tag.type === "Identifier" &&
                        nodePath.node.tag.name === "eval"
                    ) {
                        errors.push(
                            `SECURITY: Tagged template eval at line ${nodePath.node.loc?.start?.line}`
                        );
                    }
                },
            });
        } catch (traverseError) {
            errors.push(`TRAVERSE ERROR: ${traverseError.message}`);
        }

        // ── STEP 3: Structural validation ─────────────────────────
        this.validateStructure(code, errors);

        const valid = errors.length === 0;

        if (valid) {
            console.log("[ASTValidator] ✅ Security validation passed — 0 violations");
        } else {
            console.error(
                `[ASTValidator] ❌ FAILED — ${errors.length} violation(s):`,
                errors
            );
        }

        return { valid, errors, ast };
    }

    validateStructure(code, errors) {
        if (!code.includes("GeneratedComponent")) {
            errors.push(`STRUCTURE: Must be named "GeneratedComponent"`);
        }
        if (!code.includes("export default")) {
            errors.push(`STRUCTURE: Missing "export default"`);
        }
        if (!code.includes("onUpdate") && !code.includes("onComplete")) {
            errors.push(`STRUCTURE: Must use "onUpdate" or "onComplete" callbacks`);
        }
        if (code.trim().length < 200) {
            errors.push(`STRUCTURE: Code too short — likely failed generation`);
        }
    }
}
