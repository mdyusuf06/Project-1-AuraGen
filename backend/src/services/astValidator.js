import { parse } from "@babel/parser";

export const BLOCKED_IDENTIFIERS = new Set([
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "fetch",
  "XMLHttpRequest",
  "eval",
  "Function",
  "process",
  "require"
]);

export const BLOCKED_RULES_COUNT = 10;

export class ASTSecurityError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ASTSecurityError";
    this.details = details;
  }
}

/**
 * Recursively traverses a Babel AST node and invokes `visitor(node, parent, parentKey)`
 * on every AST node in depth-first order.
 */
function traverseAst(node, visitor, parent = null, parentKey = null) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      traverseAst(node[i], visitor, parent, parentKey);
    }
    return;
  }

  if (typeof node.type === "string") {
    visitor(node, parent, parentKey);
  }

  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "extra" || key === "comments") {
      continue;
    }
    const child = node[key];
    if (child && typeof child === "object") {
      traverseAst(child, visitor, node, key);
    }
  }
}

function formatLocation(node) {
  const line = node?.loc?.start?.line;
  const col = node?.loc?.start?.column;
  if (line !== undefined && col !== undefined) {
    return ` (line ${line}, col ${col + 1})`;
  }
  return "";
}

/**
 * Parses raw React/JSX code into a Babel AST, enforces all security rules,
 * and returns audit metrics ({ code, parseTimeMs, nodesInspected, blockedRulesChecked, passed }).
 */
export function validateComponentAstWithAudit(code) {
  const startNs = performance.now();

  if (typeof code !== "string" || code.trim().length === 0) {
    throw new ASTSecurityError("Generated component code is empty or not a string.");
  }

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"]
    });
  } catch (parseErr) {
    throw new ASTSecurityError(
      `AST syntax parse failed: ${parseErr.message}`,
      { cause: parseErr }
    );
  }

  let nodesInspected = 0;

  traverseAst(ast, (node) => {
    nodesInspected += 1;

    // 1. Block JSX <script> tags (case-insensitive)
    if (node.type === "JSXOpeningElement" || node.type === "JSXClosingElement") {
      if (
        node.name?.type === "JSXIdentifier" &&
        node.name.name.toLowerCase() === "script"
      ) {
        throw new ASTSecurityError(
          `Security violation: Forbidden <${node.name.name}> tag detected${formatLocation(node)}.`,
          { rule: "blocked-jsx-tag", tag: node.name.name }
        );
      }
    }

    // 2. Block React.createElement("script", ...) or createElement("script", ...)
    if (node.type === "CallExpression") {
      const calleeName =
        node.callee?.type === "Identifier"
          ? node.callee.name
          : node.callee?.type === "MemberExpression" &&
            node.callee.property?.type === "Identifier"
          ? node.callee.property.name
          : null;

      if (
        calleeName === "createElement" &&
        node.arguments?.[0]?.type === "StringLiteral" &&
        node.arguments[0].value.toLowerCase() === "script"
      ) {
        throw new ASTSecurityError(
          `Security violation: Forbidden createElement("script") call detected${formatLocation(node)}.`,
          { rule: "blocked-create-element-script" }
        );
      }
    }

    // 3. Block computed bracket access like globalThis["fetch"], self["window"], obj["localStorage"]
    if (
      (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") &&
      node.computed
    ) {
      if (
        node.property?.type === "StringLiteral" &&
        BLOCKED_IDENTIFIERS.has(node.property.value)
      ) {
        throw new ASTSecurityError(
          `Security violation: Forbidden computed access ["${node.property.value}"] detected${formatLocation(node)}.`,
          { rule: "blocked-computed-access", identifier: node.property.value }
        );
      }

      if (
        node.property?.type === "TemplateLiteral" &&
        node.property.quasis?.length === 1 &&
        node.property.expressions?.length === 0 &&
        BLOCKED_IDENTIFIERS.has(node.property.quasis[0].value.cooked)
      ) {
        const name = node.property.quasis[0].value.cooked;
        throw new ASTSecurityError(
          `Security violation: Forbidden template access [\`${name}\`] detected${formatLocation(node)}.`,
          { rule: "blocked-computed-access", identifier: name }
        );
      }
    }

    // 4. Block direct Identifier usage of blocked globals
    if (node.type === "Identifier" && BLOCKED_IDENTIFIERS.has(node.name)) {
      throw new ASTSecurityError(
        `Security violation: Forbidden identifier "${node.name}" detected${formatLocation(node)}.`,
        { rule: "blocked-identifier", identifier: node.name }
      );
    }

    // 5. Block dangerouslySetInnerHTML JSX attribute
    if (
      node.type === "JSXAttribute" &&
      node.name?.type === "JSXIdentifier" &&
      node.name.name === "dangerouslySetInnerHTML"
    ) {
      throw new ASTSecurityError(
        `Security violation: Forbidden JSX attribute "dangerouslySetInnerHTML" detected${formatLocation(node)}.`,
        { rule: "blocked-dangerous-html" }
      );
    }

    // 6. Block dynamic import() expressions
    if (node.type === "Import" || node.type === "ImportExpression") {
      throw new ASTSecurityError(
        `Security violation: Dynamic import() is not allowed${formatLocation(node)}.`,
        { rule: "blocked-dynamic-import" }
      );
    }

    // 7. Block new Function(...) constructor calls
    if (
      node.type === "NewExpression" &&
      node.callee?.type === "Identifier" &&
      node.callee.name === "Function"
    ) {
      throw new ASTSecurityError(
        `Security violation: Forbidden "new Function()" constructor detected${formatLocation(node)}.`,
        { rule: "blocked-function-constructor" }
      );
    }
  });

  const parseTimeMs = Number((performance.now() - startNs).toFixed(2));
  return {
    code,
    parseTimeMs,
    nodesInspected,
    blockedRulesChecked: BLOCKED_RULES_COUNT,
    passed: true
  };
}

/**
 * Validates raw React/JSX code string and returns the code if safe.
 */
export function validateComponentAst(code) {
  return validateComponentAstWithAudit(code).code;
}

export { validateComponentAst as validate };
