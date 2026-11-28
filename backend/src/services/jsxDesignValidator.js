import { DESIGN_SYSTEM, INPUT_TYPES } from "../config/designSystem.js";
import { DESIGN_SYSTEM_SPEC } from "../../../src/config/designSystem.js";

// Exact barrel paths relative to the existing generated component consumers.
export const DESIGN_SYSTEM_MODULES = Object.freeze([
  "../design-system/index.js",
  "../components/design-system/index.js"
]);
const reactImports = new Set(["default", "Fragment"]);
const nativeContracts = new Map(Object.values(DESIGN_SYSTEM).map((component) => [component.element, component]));
const nativeElements = new Set([
  ...nativeContracts.keys(), "div", "header", "footer", "h1", "h2", "h3", "h4", "p", "span", "option", "textarea"
]);
const blockedElements = new Set(["script", "iframe", "object", "embed"]);
const approvedClasses = new Set([
  ...Object.values(DESIGN_SYSTEM).flatMap(({ allowedTailwindClasses }) => allowedTailwindClasses),
  ...Object.values(DESIGN_SYSTEM_SPEC.theme).flatMap((group) =>
    Object.values(group).flatMap((classes) => classes.split(/\s+/u)))
]);
const universalProps = new Set(["className", "id", "key", "title", "role", "hidden", "tabIndex"]);
const nativeExtraProps = {
  button: ["disabled"],
  input: ["defaultValue", "defaultChecked", "disabled", "readOnly"],
  select: ["defaultValue", "disabled", "multiple"],
  option: ["value", "label", "disabled"],
  textarea: ["name", "value", "defaultValue", "placeholder", "required", "disabled", "readOnly", "rows", "minLength", "maxLength"]
};

function importName(node) {
  if (node.type === "ImportDefaultSpecifier") return "default";
  if (node.type === "ImportSpecifier") return node.imported.name ?? node.imported.value;
  return null;
}

function approvedDesignModule(source) {
  return DESIGN_SYSTEM_MODULES.includes(source);
}

export function checkImport(path, report) {
  const { source, specifiers, attributes, assertions, phase } = path.node;
  const fromReact = source.value === "react";
  if ((!fromReact && !approvedDesignModule(source.value)) ||
      specifiers.length === 0 || attributes?.length || assertions?.length || phase) {
    report(path, "UNAPPROVED_IMPORT", "Import React or named exports from an approved AuraGen design-system module.", "approved-imports");
    return;
  }
  for (const specifier of path.get("specifiers")) {
    const name = importName(specifier.node);
    if (fromReact ? reactImports.has(name) : Object.hasOwn(DESIGN_SYSTEM, name)) continue;
    report(specifier, "UNAPPROVED_IMPORT", "Import only approved bindings from this module.", "approved-imports");
  }
}

function importedBinding(scope, name) {
  const binding = scope.getBinding(name);
  if (binding?.kind !== "module" || !binding.path.parentPath.isImportDeclaration()) return {};
  return { source: binding.path.parentPath.node.source.value, name: importName(binding.path.node) };
}

function resolveElement(path) {
  const tag = path.node.name;
  if (tag.type === "JSXIdentifier") {
    if (nativeElements.has(tag.name)) return { native: tag.name };
    if (!/^[A-Z]/u.test(tag.name)) return {};
    const binding = importedBinding(path.scope, tag.name);
    if (approvedDesignModule(binding.source) && Object.hasOwn(DESIGN_SYSTEM, binding.name)) {
      return { component: binding.name };
    }
    if (binding.source === "react" && binding.name === "Fragment") return { fragment: true };
  }
  if (tag.type === "JSXMemberExpression" && tag.object.type === "JSXIdentifier" && tag.property.name === "Fragment") {
    const binding = importedBinding(path.scope, tag.object.name);
    if (binding.source === "react" && binding.name === "default") return { fragment: true };
  }
  return {};
}

function decodeUrlEntities(text) {
  const named = { colon: ":", tab: "\t", newline: "\n", amp: "&" };
  return text.replace(/&(?:#(x[\da-f]+|\d+);?|(colon|tab|newline|amp);)/giu, (entity, numeric, name) => {
    if (name) return named[name.toLowerCase()];
    const hex = numeric[0].toLowerCase() === "x";
    const points = hex ? numeric.slice(1) : numeric;
    const value = Number.parseInt(points, hex ? 16 : 10);
    return value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  });
}

function javascriptUrl(text) {
  const normalized = decodeUrlEntities(decodeUrlEntities(text)).replace(/[\s\p{Cc}\p{Cf}]/gu, "");
  return /^javascript:/iu.test(normalized);
}

function attributeValue(attribute, constValue) {
  const value = attribute.get("value");
  if (!value.node) return { type: "BooleanLiteral", value: true };
  if (!value.isJSXExpressionContainer()) return value.node;
  let expression = value.get("expression");
  while (expression.isParenthesizedExpression()) expression = expression.get("expression");
  return (expression.isIdentifier() ? constValue(expression)?.node : expression.node) ?? null;
}

function isScalar(node) {
  return node?.type === "StringLiteral" || node?.type === "BooleanLiteral" ||
    (node?.type === "NumericLiteral" && Number.isFinite(node.value));
}

function literalList(node, keys, isItem) {
  return node?.type === "ArrayExpression" && node.elements.every((item) => {
    if (isItem(item)) return true;
    if (item?.type !== "ObjectExpression" || item.properties.length !== keys.length) return false;
    const props = new Map(item.properties.map((property) => [
      property.key?.name ?? property.key?.value, property
    ]));
    return keys.every((key) => {
      const prop = props.get(key);
      return prop?.type === "ObjectProperty" && !prop.computed && isScalar(prop.value) &&
        prop.value.type !== "BooleanLiteral";
    });
  });
}

function approvedProp({ native, component, fragment }, name) {
  if (fragment) return name === "key";
  if (universalProps.has(name) || /^aria-[a-z]+(?:-[a-z]+)*$/u.test(name)) return true;
  if (component) {
    return Object.hasOwn(DESIGN_SYSTEM[component].props, name) ||
      DESIGN_SYSTEM_SPEC.components[component].props.includes(name);
  }
  return (name !== "children" && name !== "options" && Object.hasOwn(nativeContracts.get(native)?.props ?? {}, name)) ||
    (Object.hasOwn(nativeExtraProps, native) && nativeExtraProps[native].includes(name));
}

function checkAttribute(path, element, report, constValue) {
  const name = path.node.name.name;
  if (typeof name !== "string" || /^on/iu.test(name) || name.toLowerCase() === "dangerouslysetinnerhtml") {
    report(path, "UNSAFE_JSX_PROP", "Event handlers, raw HTML and namespaced attributes are prohibited.", "safe-props");
    return;
  }
  const value = attributeValue(path, constValue);
  if (value?.type === "StringLiteral" && javascriptUrl(value.value)) {
    report(path, "JAVASCRIPT_URL", "JavaScript URLs are prohibited.", "safe-urls");
    return;
  }
  if (!approvedProp(element, name)) {
    report(path, "UNAPPROVED_PROP", "Use props approved for this element.", "design-props");
    return;
  }
  if (name === "className") {
    const raw = path.node.value;
    const literal = raw?.type === "JSXExpressionContainer" ? raw.expression : raw;
    if (literal?.type !== "StringLiteral" ||
        literal.value.split(/\s+/u).some((token) => token && !approvedClasses.has(token))) {
      report(path, "UNAPPROVED_CLASS", "Use a string literal containing only AuraGen Tailwind classes.", "design-classes");
    }
    return;
  }
  const listKeys = element.component === "Select" && name === "options" ? ["value", "label"] :
    element.component === "StepProgress" && name === "steps" ? ["id", "title"] : null;
  const valid = listKeys ? literalList(value, listKeys, (item) => item?.type === "StringLiteral") :
    element.component === "StepProgress" && name === "completedSteps"
      ? value?.type === "ArrayExpression" &&
        value.elements.every((item) => item?.type === "NumericLiteral" && Number.isSafeInteger(item.value))
      : isScalar(value);
  if (!valid) {
    report(path, "UNSAFE_PROP_VALUE", "Use literal data for JSX props.", "safe-props");
    return;
  }
  if (name === "type" && (element.native === "button" || element.component === "Button") &&
      value.value !== "button") {
    report(path, "UNSAFE_BUTTON_TYPE", 'Use type="button" in generated JSX.', "safe-props");
  }
  if (name === "type" && (element.native === "input" || element.component === "Input") &&
      !INPUT_TYPES.includes(value.value)) {
    report(path, "UNAPPROVED_INPUT_TYPE", "Use an AuraGen input type.", "design-props");
  }
}

export function checkElement(path, report, constValue) {
  const name = path.node.name.name;
  if (typeof name === "string" && blockedElements.has(name.toLowerCase())) {
    report(path, "BLOCKED_JSX_TAG", "Executable and embedded elements are prohibited.", "safe-elements");
    return;
  }
  const element = resolveElement(path);
  if (!element.native && !element.component && !element.fragment) {
    report(path, "UNAPPROVED_COMPONENT", "Use an approved native tag or an imported AuraGen component.", "design-elements");
  }
  const attributes = new Set();
  for (const attribute of path.get("attributes")) {
    if (!attribute.isJSXAttribute()) continue;
    const attributeName = attribute.node.name.name;
    if (attributes.has(attributeName)) {
      report(attribute, "DUPLICATE_PROP", "Provide each prop at most once.", "safe-props");
    }
    attributes.add(attributeName);
    checkAttribute(attribute, element, report, constValue);
  }
  if (element.native === "button" && !attributes.has("type")) {
    report(path, "UNSAFE_BUTTON_TYPE", 'Declare type="button" on native buttons.', "safe-props");
  }
  if (element.native === "input" && path.parentPath.node.children.length > 0) {
    report(path, "VOID_ELEMENT_CHILDREN", "Inputs cannot contain JSX children.", "design-elements");
  }
}
