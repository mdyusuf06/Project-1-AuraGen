import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import { checkImport, checkElement } from "./jsxDesignValidator.js";

const traverse = babelTraverse.default;
export const MAX_SOURCE_BYTES = 20 * 1024;
export const DEFAULT_MAX_AST_DEPTH = 64;
const MAX_CONFIGURED_DEPTH = 128;
const MAX_ERRORS = 24;

export const BLOCKED_IDENTIFIERS = new Set([
  "window", "document", "globalThis", "eval", "Function", "fetch", "XMLHttpRequest",
  "localStorage", "sessionStorage", "WebSocket", "navigator", "process", "setTimeout",
  "setInterval", "require", "module", "exports"
]);
const blockedIdentifiers = new Set(BLOCKED_IDENTIFIERS);

const structuralNodes = new Set([
  "Program", "ImportDeclaration", "ImportDefaultSpecifier", "ImportSpecifier",
  "ExportDefaultDeclaration", "BlockStatement", "ReturnStatement", "VariableDeclaration",
  "VariableDeclarator", "Identifier", "DirectiveLiteral", "ParenthesizedExpression",
  "ExportSpecifier", "EmptyStatement",
  "StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "ConditionalExpression",
  "JSXElement", "JSXOpeningElement", "JSXClosingElement", "JSXIdentifier", "JSXText",
  "JSXAttribute", "JSXExpressionContainer", "JSXEmptyExpression", "JSXFragment",
  "JSXOpeningFragment", "JSXClosingFragment", "JSXMemberExpression", "JSXNamespacedName"
]);
const primitiveTypes = new Set(["StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral"]);
const functionTypes = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function issue(code, message, rule, location) {
  return { code, message, line: location?.line ?? null, column: location?.column ?? null, rule };
}

function failed(code, message, rule, location) {
  return { ok: false, errors: [issue(code, message, rule, location)] };
}

function withinDepth(ast, limit) {
  const pending = [[ast, 1]];
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (depth > limit) return false;
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item?.type) pending.push([item, depth + 1]);
        }
      } else if (child?.type) {
        pending.push([child, depth + 1]);
      }
    }
  }
  return true;
}

function unwrap(path) {
  while (path.isParenthesizedExpression()) path = path.get("expression");
  return path;
}

function constValue(path) {
  const binding = path.scope.getBinding(path.node.name);
  if (binding?.kind !== "const" || !binding.constant || !binding.path.isVariableDeclarator() ||
      !binding.path.get("id").isIdentifier({ name: path.node.name }) ||
      binding.path.node.end > path.node.start) return null;
  return unwrap(binding.path.get("init"));
}

function returnsJsx(path) {
  path = unwrap(path);
  if (path.isIdentifier()) {
    const value = constValue(path);
    return Boolean(value?.isJSXElement() || value?.isJSXFragment());
  }
  if (path.isConditionalExpression()) {
    return returnsJsx(path.get("consequent")) && returnsJsx(path.get("alternate"));
  }
  return path.isJSXElement() || path.isJSXFragment();
}

function isDefaultExport(path) {
  if (path.isExportDefaultDeclaration()) return true;
  if (!path.isExportNamedDeclaration() || path.node.source || path.node.declaration ||
      path.node.specifiers.length !== 1) return false;
  const [specifier] = path.node.specifiers;
  return specifier.type === "ExportSpecifier" &&
    (specifier.exported.name ?? specifier.exported.value) === "default";
}

function exportedFunction(path) {
  const expression = path.isExportDefaultDeclaration()
    ? unwrap(path.get("declaration"))
    : path.get("specifiers.0.local");
  if (!expression.isIdentifier()) return expression;
  const binding = expression.scope.getBinding(expression.node.name);
  return binding?.path.isFunctionDeclaration() ? binding.path : constValue(expression);
}

function checkComponent(path, report) {
  const component = exportedFunction(path);
  if (!component?.node || !functionTypes.has(component.node.type) ||
      component.node.async || component.node.generator ||
      component.node.params.some((param) => param.type !== "Identifier" || param.name === "React")) {
    report(path, "INVALID_COMPONENT_EXPORT", "Export a synchronous function component.", "component-export");
    return null;
  }
  const body = component.get("body");
  if (body.isBlockStatement()) {
    const statements = body.get("body");
    const last = statements.pop();
    if (statements.some((statement) => !statement.isVariableDeclaration()) ||
        !last?.isReturnStatement() || !returnsJsx(last.get("argument"))) {
      report(component, "MISSING_JSX_RETURN", "Use local const declarations followed by a JSX return.", "jsx-return");
    }
  } else if (!returnsJsx(body)) {
    report(component, "MISSING_JSX_RETURN", "The component must return JSX.", "jsx-return");
  }
  return component.node;
}

function checkVariable(path, component, report) {
  const topLevel = path.parentPath.isProgram();
  if (path.node.kind !== "const") {
    report(path, "UNSAFE_BINDING", "Use immutable const bindings.", "declarative-code");
    return;
  }
  for (const declaration of path.get("declarations")) {
    const init = unwrap(declaration.get("init")).node;
    const data = init && (primitiveTypes.has(init.type) ||
      (!topLevel && (init.type === "JSXElement" || init.type === "JSXFragment")));
    if (!declaration.get("id").isIdentifier() || (!data && (!init || init !== component))) {
      report(declaration, "UNSAFE_BINDING", "Use simple bindings initialized with literal data or local JSX.", "declarative-code");
    }
  }
}

function checkReference(path, component, report) {
  if (!path.isReferencedIdentifier()) return;
  const name = path.node.name;
  if (blockedIdentifiers.has(name)) {
    report(path, "BLOCKED_IDENTIFIER", `The identifier "${name}" is prohibited.`, "blocked-identifier");
    return;
  }
  const exportPath = path.parentPath.isExportSpecifier() ? path.parentPath.parentPath : path.parentPath;
  if (isDefaultExport(exportPath) && exportedFunction(exportPath)?.node === component) return;
  const value = constValue(path)?.node;
  if (value && primitiveTypes.has(value.type)) return;
  if (value && (value.type === "JSXElement" || value.type === "JSXFragment") &&
      (path.parentPath.isReturnStatement() || path.parentPath.isJSXExpressionContainer())) return;
  report(path, "UNAPPROVED_REFERENCE", "Use only statically validated local values.", "safe-reference");
}

function checkNode(path, component, report) {
  switch (path.node.type) {
    case "ImportDeclaration":
      return checkImport(path, report);
    case "ImportExpression":
    case "Import":
    case "MetaProperty":
      return report(path, "MODULE_ACCESS", "Dynamic imports and module metadata are prohibited.", "approved-imports");
    case "ExportNamedDeclaration":
      if (isDefaultExport(path)) return;
      return report(path, "ADDITIONAL_EXPORT", "Only the default component export is allowed.", "component-export");
    case "ExportAllDeclaration":
      return report(path, "ADDITIONAL_EXPORT", "Only the default component export is allowed.", "component-export");
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      if (path.node === component) return;
      break;
    case "VariableDeclaration":
      return checkVariable(path, component, report);
    case "CallExpression":
    case "OptionalCallExpression":
    case "NewExpression":
      if (path.get("callee").isIdentifier({ name: "require" })) {
        return report(path, "MODULE_ACCESS", "CommonJS module loading is prohibited.", "approved-imports");
      }
      return report(path, "UNSAFE_CALL", "Function calls and construction are prohibited.", "declarative-code");
    case "MemberExpression":
    case "OptionalMemberExpression":
      return report(path, "MEMBER_ACCESS", "Property access is prohibited in generated code.", "safe-reference");
    case "JSXSpreadAttribute":
    case "JSXSpreadChild":
      return report(path, "JSX_SPREAD", "JSX spreads are prohibited.", "safe-props");
    case "JSXOpeningElement":
      return checkElement(path, report, constValue);
    case "Identifier":
      return checkReference(path, component, report);
    case "ArrayExpression":
    case "ObjectExpression":
    case "ObjectProperty":
      // checkElement validates the entire literal options prop before any values are used.
      if (path.findParent((ancestor) => ancestor.isJSXAttribute() &&
          ["options", "steps", "completedSteps"].includes(ancestor.node.name.name))) return;
      break;
    case "Directive":
      if (path.node.value.value === "use strict" ||
          (path.parentPath.isProgram() && path.node.value.value === "use client")) return;
      break;
    default:
      if (structuralNodes.has(path.node.type)) return;
  }
  report(path, "UNSAFE_SYNTAX", "Use declarative JSX and literal data.", "declarative-code");
}

export function validate(code, { maxDepth = DEFAULT_MAX_AST_DEPTH } = {}) {
  if (typeof code !== "string") return failed("EMPTY_SOURCE", "Provide JSX source text.", "syntax");
  if (Buffer.byteLength(code, "utf8") > MAX_SOURCE_BYTES) {
    return failed("SOURCE_TOO_LARGE", "Source exceeds the 20 KiB UTF-8 limit.", "source-size");
  }
  if (!code.trim()) return failed("EMPTY_SOURCE", "Provide JSX source text.", "syntax");
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > MAX_CONFIGURED_DEPTH) {
    return failed("INVALID_DEPTH_LIMIT", `Use an AST depth limit from 1 to ${MAX_CONFIGURED_DEPTH}.`, "ast-depth");
  }
  const depthError = () => failed("AST_TOO_DEEP", "Source exceeds the AST nesting limit.", "ast-depth");
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module", plugins: ["jsx"], attachComment: false, annexB: false,
      createImportExpressions: true, createParenthesizedExpressions: true
    });
  } catch (error) {
    if (error instanceof RangeError) return depthError();
    return failed("SYNTAX_ERROR", "Invalid JavaScript or JSX syntax.", "syntax", error.loc);
  }
  if (!withinDepth(ast, maxDepth)) return depthError();

  const errors = [];
  let component;
  const report = (path, id, message, rule) => {
    if (errors.length < MAX_ERRORS) errors.push(issue(id, message, rule, path.node?.loc?.start));
  };
  try {
    traverse(ast, {
      enter(path) {
        if (errors.length >= MAX_ERRORS) return path.stop();
        if (path.isProgram()) {
          const statements = path.get("body");
          const defaults = statements.filter(isDefaultExport);
          if (defaults.length !== 1) {
            report(path, "DEFAULT_EXPORT_REQUIRED", "Declare exactly one default export.", "component-export");
          } else {
            component = checkComponent(defaults[0], report);
          }
          for (const statement of statements) {
            if (statement.node === component || statement.isImportDeclaration() ||
                statement.isVariableDeclaration() || statement.isExportDeclaration() || statement.isEmptyStatement()) continue;
            report(statement, "TOP_LEVEL_STATEMENT", "Only imports, constants and the component are allowed at module scope.", "module-structure");
          }
        }
        checkNode(path, component, report);
      }
    });
  } catch {
    return failed("VALIDATION_FAILED", "The component could not be safely analyzed.", "declarative-code");
  }
  return { ok: errors.length === 0, errors };
}

export class ASTSecurityError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ASTSecurityError";
    this.details = details;
  }
}

export function validateComponentAst(code) {
  const result = validate(code);
  if (!result.ok) throw new ASTSecurityError(result.errors[0].message, { errors: result.errors });
  return code;
}
