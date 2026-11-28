import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { WebSocket } from "ws";
import { createAuraGenServer } from "../src/server.js";
import {
  ASTSecurityError, MAX_SOURCE_BYTES, validate, validateComponentAst
} from "../src/services/astValidator.js";
import { createWizardGenerator } from "../src/services/codeGenService.js";

const design = "../design-system/index.js";
const frontendDesign = "../components/design-system/index.js";
const render = (jsx) => `export default () => (${jsx});`;
const body = (statement) => `export default function Wizard() { ${statement}; return <div />; }`;
const accepted = [
  ["V01", "Native JSX", "export default function Wizard() { return <div>Welcome</div>; }"],
  ["V02", "Arrow and fragment", render("<><p>Step one</p><span>Details</span></>")],
  ["V03", "React default import", 'import React from "react"; ' + render("<React.Fragment><div /></React.Fragment>")],
  ["V04", "Referenced function", "function Wizard() { return <section />; } export default Wizard;"],
  ["V05", "Referenced arrow and approved literal classes", 'const Wizard = () => <div className={"p-4 bg-white"} />; export default Wizard;'],
  ["V06", "Named component alias", `import { Button as Action } from "${design}"; ` + render('<Action variant="primary">Continue</Action>')],
  ["V07", "Frontend barrel", `import { Card, Input, Label } from "${frontendDesign}"; ` +
    render('<Card title="Contact"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></Card>')],
  ["V08", "Static options", `import { Select } from "${design}"; ` +
    render('<Select id="region" name="region" options={[{value: "n", label: "North"}]} />')],
  ["V09", "Native progress and exact classes", render('<progress value={1} max={2} className="w-full" aria-label="Wizard progress" />')],
  ["V10", "Local literal binding", 'const title = "Checklist"; export default () => <h2>{title}</h2>;'],
  ["V11", "Referenced export specifier", "const Wizard = () => <div />; export { Wizard as default };"],
  ["V12", "Named React Fragment", 'import { Fragment as Group } from "react"; ' + render("<Group><div /></Group>")],
  ["V13", "Static progress steps", `import { StepProgress } from "${design}"; ` +
    render('<StepProgress steps={[{id: 0, title: "Contact"}, "Review"]} currentStep={0} completedSteps={[]} />')]
];
const rejected = [
  ["M01", "eval", body('eval("0")'), "BLOCKED_IDENTIFIER"],
  ["M02", "fetch", body('fetch("/fixture")'), "BLOCKED_IDENTIFIER"],
  ["M03", "window.location", body("window.location"), "BLOCKED_IDENTIFIER"],
  ["M04", "document.cookie", body("document.cookie"), "BLOCKED_IDENTIFIER"],
  ["M05", "Dynamic import", body('import("react")'), "MODULE_ACCESS"],
  ["M06", "Function constructor", body('Function("return 0")'), "BLOCKED_IDENTIFIER"],
  ["M07", "Obfuscated computed member", body('window["ev" + "al"]'), "MEMBER_ACCESS"],
  ["M08", "String event prop", render('<div onClick="example" />'), "UNSAFE_JSX_PROP"],
  ["M09", "Raw HTML prop", render('<div dangerouslySetInnerHTML={{__html: "sample"}} />'), "UNSAFE_JSX_PROP"],
  ["M10", "Script tag", render("<script />"), "BLOCKED_JSX_TAG"],
  ["M11", "Iframe tag", render("<iframe />"), "BLOCKED_JSX_TAG"],
  ["M12", "Mixed-case entity-encoded JavaScript URL", render('<a href=" &#x4A;aVa&#x09;script&colon;sample">Link</a>'), "JAVASCRIPT_URL"],
  ["M13", "globalThis", body("globalThis"), "BLOCKED_IDENTIFIER"],
  ["M14", "localStorage", body("localStorage"), "BLOCKED_IDENTIFIER"],
  ["M15", "String timer", body('setTimeout("0", 0)'), "BLOCKED_IDENTIFIER"],
  ["M16", "Destructuring alias", body("const { location: alias } = window"), "UNSAFE_BINDING"],
  ["M17", "Indirect reference", body("const alias = fetch; alias()"), "BLOCKED_IDENTIFIER"],
  ["M18", "Template member access", body("window[`location`]"), "MEMBER_ACCESS"],
  ["M19", "Object tag", render("<object />"), "BLOCKED_JSX_TAG"],
  ["M20", "Embed tag", render("<embed />"), "BLOCKED_JSX_TAG"],
  ["M21", "JSX spread", render('<div {...{ title: "example" }} />'), "JSX_SPREAD"],
  ["M22", "Event callback", render("<div onClick={() => 0} />"), "UNSAFE_JSX_PROP"],
  ["M23", "JavaScript URL through a local literal", 'const url = "JaVa\\tscript:sample"; ' + render("<a href={url} />"), "JAVASCRIPT_URL"],
  ["M24", "Unknown global", body("self"), "UNAPPROVED_REFERENCE"],
  ["M25", "JavaScript URL in a template", render("<a href={`javascript:sample`} />"), "UNSAFE_SYNTAX"],
  ["M26", "JavaScript URL in a concatenation", render('<a href={"java" + "script:sample"} />'), "UNSAFE_SYNTAX"],
  ["R01", "Malformed JSX", "export default () => <div>", "SYNTAX_ERROR"],
  ["R02", "Unauthorized import", 'import X from "./other.js"; ' + render("<div />"), "UNAPPROVED_IMPORT"],
  ["R03", "Alternate import path", 'import { Button } from "../design-system/./index.js"; ' + render("<Button />"), "UNAPPROVED_IMPORT"],
  ["R04", "Unapproved design export", `import { Unknown } from "${design}"; ` + render("<Unknown />"), "UNAPPROVED_IMPORT"],
  ["R05", "Module metadata", body("import.meta"), "MODULE_ACCESS"],
  ["R06", "CommonJS load", body('require("react")'), "MODULE_ACCESS"],
  ["R07", "Missing default export", "const label = 'Text';", "DEFAULT_EXPORT_REQUIRED"],
  ["R08", "Additional export", "export const value = 1; " + render("<div />"), "ADDITIONAL_EXPORT"],
  ["R09", "Class component", "export default class Wizard {}", "INVALID_COMPONENT_EXPORT"],
  ["R10", "No JSX return", "export default () => null;", "MISSING_JSX_RETURN"],
  ["R11", "Top-level statement", "run(); " + render("<div />"), "TOP_LEVEL_STATEMENT"],
  ["R12", "Oversized UTF-8 source", render(`<div>${"é".repeat(MAX_SOURCE_BYTES / 2)}</div>`), "SOURCE_TOO_LARGE"],
  ["R13", "Excessive AST depth", render("<div>".repeat(80) + "</div>".repeat(80)), "AST_TOO_DEEP"],
  ["R14", "Unknown native element", render("<video />"), "UNAPPROVED_COMPONENT"],
  ["R15", "Unknown design component", render("<Button />"), "UNAPPROVED_COMPONENT"],
  ["R16", "Off-design Tailwind class", render('<div className="p-4 bg-fuchsia-950" />'), "UNAPPROVED_CLASS"],
  ["R17", "Dynamic class", 'const style = "p-4"; ' + render("<div className={style} />"), "UNAPPROVED_CLASS"],
  ["R18", "Shadowed design import", `import { Button } from "${design}"; export default (Button) => <Button />;`, "UNAPPROVED_COMPONENT"],
  ["R19", "Parser stack limit", "export default () => " + "(".repeat(8_000) + "<div />" + ")".repeat(8_000), "AST_TOO_DEEP"],
  ["R20", "Duplicate default", render("<div />") + render("<span />"), "SYNTAX_ERROR"],
  ["R21", "Unapproved option shape", `import { Select } from "${design}"; ` + render('<Select options="not a list" />'), "UNSAFE_PROP_VALUE"],
  ["R25", "Reserved React runtime binding", "export default (React) => <div />;", "INVALID_COMPONENT_EXPORT"]
];

for (const [id, category, source] of accepted) {
  test(`${id} ${category}`, () => assert.deepEqual(validate(source), { ok: true, errors: [] }));
}
for (const [id, category, source, expected] of rejected) {
  test(`${id} ${category}`, () => {
    const result = validate(source);
    assert.equal(result.ok, false);
    const issue = result.errors.find(({ code }) => code === expected);
    assert.ok(issue, JSON.stringify(result.errors));
    assert.deepEqual(Object.keys(issue), ["code", "message", "line", "column", "rule"]);
  });
}

test("R22 Parser coordinates use one-based lines and zero-based columns", () => {
  const result = validate("export default () => (\n  <div></span>\n);");
  assert.deepEqual([result.errors[0].line, result.errors[0].column], [2, 7]);
});
test("R23 Depth configuration and exact UTF-8 source limit", () => {
  const source = render("<div />");
  const exactLimit = source.padEnd(MAX_SOURCE_BYTES);
  assert.deepEqual(validate(exactLimit), { ok: true, errors: [] });
  assert.equal(validate(source, { maxDepth: 4 }).errors[0].code, "AST_TOO_DEEP");
  assert.equal(validate(source, { maxDepth: 0 }).errors[0].code, "INVALID_DEPTH_LIMIT");
});
test("R24 Compatibility adapter returns the original source or a typed error", () => {
  const source = render("<div />");
  assert.equal(validateComponentAst(source), source);
  assert.throws(() => validateComponentAst(""), (error) =>
    error instanceof ASTSecurityError && error.details.errors[0].code === "EMPTY_SOURCE");
});

function nextMessage(socket) {
  return once(socket, "message", { signal: AbortSignal.timeout(3_000) })
    .then(([data]) => JSON.parse(data.toString()));
}

async function connect(t, codeGenerator) {
  const server = createAuraGenServer({ port: 0, host: "127.0.0.1", cooldownMs: 0, codeGenerator });
  t.after(() => server.stop());
  const { port } = await server.start();
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  assert.equal((await nextMessage(socket)).type, "connected");
  return {
    port,
    async generate() {
      const response = nextMessage(socket);
      socket.send(JSON.stringify({
        type: "telemetry", sessionId: "audit", timestamp: Date.now(), cognitiveLoadScore: 90,
        activeField: "email", metrics: { mouseVelocity: 0, hesitationMs: 0, rageClicks: 0, clickErrorRate: 0 },
        formFields: [{ name: "email", label: "Email", type: "email" }]
      }));
      return response;
    }
  };
}

test("I01 WebSocket accepts approved raw JSX and rejects security and design violations", async (t) => {
  const good = render('<div className="p-4">Contact</div>');
  const responses = [body('eval("0")'), render('<div className="bg-fuchsia-950" />'), good, { code: good }];
  const client = await connect(t, () => responses.shift());
  for (const expected of ["BLOCKED_IDENTIFIER", "UNAPPROVED_CLASS"]) {
    const result = await client.generate();
    assert.equal(result.type, "error");
    assert.equal(result.code, "INVALID_COMPONENT");
    assert.ok(result.issues.some(({ code }) => code === expected));
    assert.ok(!JSON.stringify(result).includes("export default"));
  }
  assert.deepEqual(await client.generate(), { type: "component", code: good });
  assert.equal((await client.generate()).issues[0].code, "EMPTY_SOURCE");
  const metrics = await fetch(`http://127.0.0.1:${client.port}/api/sessions/audit/metrics`).then((res) => res.json());
  assert.equal(metrics.summary.generatedComponentsCount, 1);
  assert.equal(responses.length, 0);
});

test("I02 WebSocket rejects model JSX and off-design layout before rendering", async (t) => {
  const contents = [render("<script />"), '{"steps":[{"id":"contact","fields":[{"name":"email","component":"Button"}]}]}'];
  let calls = 0;
  const generator = createWizardGenerator({ invoke: async () => ({
    content: contents[calls++], response_metadata: { finish_reason: "stop" }
  }) });
  const client = await connect(t, generator.generateComponent);
  for (const index of [0, 1]) {
    const result = await client.generate();
    assert.equal(result.type, "error");
    assert.equal(result.code, "INVALID_OUTPUT");
    assert.equal(result.issues[0].code, ["LAYOUT_JSON", "LAYOUT_COMPONENT"][index]);
    assert.ok(!JSON.stringify(result).includes(contents[index]));
  }
  assert.equal(calls, 2);
});
