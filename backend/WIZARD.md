# AuraGen wizard generation

The root development and test commands use `backend/`. This backend reads the bundled 21-field schema, section titles, and financial validation directly from the checked-in frontend source. Node may emit a one-time module format warning while loading the frontend schema. Include that schema file when packaging the backend.

## Component contracts

The [registry](src/config/designSystem.js) contains the prop types, required props, defaults, exact Tailwind class allowlists, and accessibility requirements. Its form controls and visual styles follow [FinancialForm.jsx](../frontend/src/components/FinancialForm.jsx). This checkout contains native controls in the financial form and has no separate Component Showcase or Wizard Demo definitions.

| Contract | Main props and defaults | Variants and accessibility |
| --- | --- | --- |
| Button | Requires text children. Type defaults to `button` and supports `submit`. | Primary and secondary. The visible text names the action. |
| Input | Requires ID, name, and type. Defaults to optional, empty, and unchecked. Supports text, email, tel, date, number, and checkbox. | Default, focused, and invalid. A visible Label and help or error references identify the field. |
| Select | Requires ID, name, and options. Defaults to optional with an empty selection. | Default, focused, and invalid. A visible Label and the option labels describe the choices. |
| Card | Requires renderer-owned content and the heading ID in `aria-labelledby`. | Default. The heading names the current step. |
| StepProgress | Requires current and total step counts. Accessible name defaults to “Wizard progress.” | Default. Native progress semantics accompany the visible step count. |
| Label | Requires visible text and a matching `htmlFor`. | Default. Required fields have a visible text marker. |

## Input and output

The optional `telemetry.formFields` is a flat array of 1 to 40 fields. Each field needs a unique name, a label, and a supported type. `required` is a boolean and defaults to `false` when omitted. Section and field identifiers are bounded to 64 characters, and schema text is bounded to 256 characters per string. Text fields accept `minLength` and `maxLength`. Number and date fields accept compatible `min`, `max`, and positive `step` values or `"any"`. Each constraint can appear on the field or in its `validation` object. Select fields take up to 30 unique options, with string entries supported for older schemas and an optional empty choice first.

The [versioned prompt](src/services/wizardPrompt.js) sends a separate user message with field names, labels, types, required flags, section IDs, and the active field. The model returns step IDs and field-to-component mappings. The [output validator](src/validators/wizardValidator.js) requires each input field exactly once, enforces the component for its type, and caps each step at eight fields. The backend supplies titles, styles, and accessibility props. Required status, options, help text, and supported validation come from the input schema. The bundled financial form also keeps its existing business validation.

`generateWizard()` returns validated JSON with the component name, active field, steps, and field definitions. The WebSocket adapter serializes that data into a fixed JSX template and returns the existing `{ type: "component", code }` response. The browser's drawer displays the source as text. Rendering the wizard live would require a frontend consumer for the structured layout or a trusted component integration.

## Generated source validation

The [AST validator](src/services/astValidator.js) exposes `validate(code, { maxDepth })`. It accepts JavaScript with JSX and returns `{ ok, errors }`. Each error contains a stable `code`, a `message`, a `rule`, a one-based `line`, and a zero-based `column`. Coordinates are `null` for issues without a source location. The validator checks the 20 KiB UTF-8 byte limit before parsing, measures AST depth before traversal, and returns at most 24 issues. Depth defaults to 64 AST nodes and can be configured from 1 to 128. [Babel parser](https://babeljs.io/docs/babel-parser), [Babel traversal](https://babeljs.io/docs/babel-traverse)

Raw generation supports a synchronous default function with a JSX return, simple literal constants, fragments, and imported AuraGen components. The [design checks](src/services/jsxDesignValidator.js) use the backend registry and the existing component and theme specification. Exact approved barrel imports are `../design-system/index.js` and `../components/design-system/index.js`, relative to the existing consumers. The raw source policy permits React default and Fragment imports, static JSX props, and literal Tailwind tokens drawn from the registries. It rejects hooks, calls, property access, dynamic classes, inline event handlers, and JSX spreads. Interactive behavior belongs in the checked-in renderer. Raw JSX approval is a static policy check. Runtime execution and live model behavior are outside this verification.

The active WebSocket server requests a JSON layout. The layout validator checks field preservation and design-system mappings before the checked-in renderer embeds the layout as data. The 20 KiB source limit applies to raw candidates. Internally generated wizard source can be larger when it includes a supported custom schema. Other generator callbacks supplying raw JSX receive the full AST check at the WebSocket boundary. The separate legacy `POST /api/generate` path checks raw provider JSX in its generation service. Its local fallback keeps field text in a serialized data block and renders it with checked-in code.

On rejection, WebSocket responses keep `type: "error"` and include `code: "INVALID_COMPONENT"` for raw JSX or `code: "INVALID_OUTPUT"` for invalid layouts. The `issues` array carries correction feedback. Layout issues also identify the JSON `path`. The legacy REST endpoint returns HTTP 400 with `success: false`, display `errors`, and structured `issues` for JSX validation failures. Rejection responses omit the candidate source. The tests exercise approved source, blocked content, output sanitization, and the retained success response shapes.

Telemetry errors retain `type: "error"`, a display message, and the validation error list. Generation errors retain `type`, `message` and `details`, and include a stable `code` such as `OPENAI_AUTH`, `OPENAI_TIMEOUT`, `OPENAI_RATE_LIMIT`, `OPENAI_QUOTA`, `OPENAI_TOKEN_LIMIT`, `INVALID_OUTPUT`, or `GENERATION_BUSY`.

## Operation and privacy

- Set `USE_TEAMMATE_CODEGEN=true` and `OPENAI_API_KEY` in `backend/.env` to enable the reused LangChain ChatOpenAI integration. The default model is `gpt-4o` and the default temperature is 0.2. With the flag off, the backend groups fields by section locally. An enabled provider failure returns a structured error.
- The provider uses strict JSON Schema and a 3,500-token output limit. The total deadline defaults to 24 seconds and can be configured with `REQUEST_TIMEOUT_MS`. An attempt can run for up to 8 seconds. Transient failures receive up to two retries with jitter and provider retry hints within the deadline. Up to four jobs run concurrently. Excess work gets a busy response.
- WebSocket frames are capped at 32 KiB with compression disabled. Defaults permit up to 100 connections, 16 per IP, and 60 upgrade attempts per IP per minute. Message budgets are 300 per connection and 2,400 per IP per minute. Generation is capped at 30 requests per IP per minute. Cooldowns and in-flight state apply to each connection.
- Development permits browser origins on local port 3000 and originless tools. In production set `WS_ALLOWED_ORIGINS` to comma-separated exact browser origins. HTTP CORS uses the same allowlist. The production backend binds to loopback by default and requires an Origin header for WebSocket upgrades. Where access requires authentication, enforce the browser session at the reverse proxy or supply the synchronous `authorizeUpgrade(request)` hook for WebSocket upgrades. The rate limiter uses the socket peer address, so clients behind one proxy share its IP budget.
- `userInput` is accepted for protocol compatibility and discarded before generation. Application values are supplied locally to the component through its `initialValues` prop. The provider receives form metadata only, so keep applicant data out of field labels and identifiers. The backend logs neither request contents nor upstream error details, requests `store: false`, and rejects enabled LangChain verbose logging or tracing in the provider configuration.
- The 21 known active fields plus an empty choice bound the bundled demo cache to 22 keys. Identical in-flight demo requests share one provider call, and validated demo layouts can be reused for 60 seconds. Custom schemas and applicant values are excluded from the shared cache.

See the [LangChain ChatOpenAI integration](https://docs.langchain.com/oss/javascript/integrations/chat/openai) and [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Verification and prompt refinement

Run `npm run test:backend` from the root. The [scenario fixture](tests/wizard-scenarios.js) defines exactly ten forms. The tests compare expected groups and preserved field definitions in local and mocked-provider modes. For prompt changes, edit the system prompt or its three examples, bump `PROMPT_VERSION`, and rerun the suite. The deterministic fixtures verify contract and preservation. Assess model grouping quality when live GPT-4o access and billing are confirmed.

`npm --prefix backend run benchmark` parses the same telemetry message and generates the bundled wizard 10,000 times per sample, after warm-up. On Node 24.11.0, the median of seven samples went from 137 ms with the placeholder to 241 ms with validation and the full wizard. Output grew from 3,425 to 17,727 bytes. The benchmark measures local CPU work. The mocked concurrency test separately verifies that two overlapping demo requests and a third within the cache lifetime use one provider call. A live-provider latency measurement is pending.

## Manual review records

| Reviewer | Status | Review evidence |
| --- | --- | --- |
| Pavilson | Pending | Record observations on the component contracts, three examples, and ten scenario results. |
| Jeevan | Pending | Record observations on field preservation, validation, and the WebSocket compatibility path. |

## Security verification audit

These results were observed on Node.js 24.11.0. The backend suite passed 93 tests, the root suite passed 19 tests, and the frontend suite passed all five telemetry checks. The Week 1 code-generation smoke test passed in mock mode, and the Next.js production build completed successfully. The REST integration used a loopback provider fixture.

Run from the repository root after installing locked root, backend, and frontend dependencies with `npm ci`, `npm --prefix backend ci`, and `npm --prefix frontend ci`.

```sh
npm run test:backend
npm test
npm run test:frontend
npm run test:codegen -- --mock
npm run build:frontend
```

Fixtures are in [the AST and WebSocket tests](tests/test-ast-validator.js) and [the legacy generation tests](../test/legacyGeneration.test.js).

| Test ID | Category | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| V01 | Native JSX | Accept | Accepted | Pass |
| V02 | Arrow and fragment | Accept | Accepted | Pass |
| V03 | React default import | Accept | Accepted | Pass |
| V04 | Referenced function | Accept | Accepted | Pass |
| V05 | Referenced arrow and approved literal classes | Accept | Accepted | Pass |
| V06 | Named component alias | Accept | Accepted | Pass |
| V07 | Frontend barrel | Accept | Accepted | Pass |
| V08 | Static options | Accept | Accepted | Pass |
| V09 | Native progress and exact classes | Accept | Accepted | Pass |
| V10 | Local literal binding | Accept | Accepted | Pass |
| V11 | Referenced export specifier | Accept | Accepted | Pass |
| V12 | Named React Fragment | Accept | Accepted | Pass |
| V13 | Static progress steps | Accept | Accepted | Pass |
| M01 | eval | Reject | Rejected | Pass |
| M02 | fetch | Reject | Rejected | Pass |
| M03 | window.location | Reject | Rejected | Pass |
| M04 | document.cookie | Reject | Rejected | Pass |
| M05 | Dynamic import | Reject | Rejected | Pass |
| M06 | Function constructor | Reject | Rejected | Pass |
| M07 | Obfuscated computed member | Reject | Rejected | Pass |
| M08 | String event prop | Reject | Rejected | Pass |
| M09 | Raw HTML prop | Reject | Rejected | Pass |
| M10 | Script tag | Reject | Rejected | Pass |
| M11 | Iframe tag | Reject | Rejected | Pass |
| M12 | Mixed-case entity-encoded JavaScript URL | Reject | Rejected | Pass |
| M13 | globalThis | Reject | Rejected | Pass |
| M14 | localStorage | Reject | Rejected | Pass |
| M15 | String timer | Reject | Rejected | Pass |
| M16 | Destructuring alias | Reject | Rejected | Pass |
| M17 | Indirect reference | Reject | Rejected | Pass |
| M18 | Template member access | Reject | Rejected | Pass |
| M19 | Object tag | Reject | Rejected | Pass |
| M20 | Embed tag | Reject | Rejected | Pass |
| M21 | JSX spread | Reject | Rejected | Pass |
| M22 | Event callback | Reject | Rejected | Pass |
| M23 | JavaScript URL through a local literal | Reject | Rejected | Pass |
| M24 | Unknown global | Reject | Rejected | Pass |
| M25 | JavaScript URL in a template | Reject | Rejected | Pass |
| M26 | JavaScript URL in a concatenation | Reject | Rejected | Pass |
| R01 | Malformed JSX | Reject | Rejected | Pass |
| R02 | Unauthorized import | Reject | Rejected | Pass |
| R03 | Alternate import path | Reject | Rejected | Pass |
| R04 | Unapproved design export | Reject | Rejected | Pass |
| R05 | Module metadata | Reject | Rejected | Pass |
| R06 | CommonJS load | Reject | Rejected | Pass |
| R07 | Missing default export | Reject | Rejected | Pass |
| R08 | Additional export | Reject | Rejected | Pass |
| R09 | Class component | Reject | Rejected | Pass |
| R10 | No JSX return | Reject | Rejected | Pass |
| R11 | Top-level statement | Reject | Rejected | Pass |
| R12 | Oversized UTF-8 source | Reject | Rejected | Pass |
| R13 | Excessive AST depth | Reject | Rejected | Pass |
| R14 | Unknown native element | Reject | Rejected | Pass |
| R15 | Unknown design component | Reject | Rejected | Pass |
| R16 | Off-design Tailwind class | Reject | Rejected | Pass |
| R17 | Dynamic class | Reject | Rejected | Pass |
| R18 | Shadowed design import | Reject | Rejected | Pass |
| R19 | Parser stack limit | Reject | Rejected | Pass |
| R20 | Duplicate default | Reject | Rejected | Pass |
| R21 | Unapproved option shape | Reject | Rejected | Pass |
| R22 | Parser coordinates | Line 2, column 7 | Line 2, column 7 | Pass |
| R23 | Depth and exact byte limit | Accept 20 KiB, enforce depth option | Accepted 20 KiB, enforced depth option | Pass |
| R24 | Compatibility adapter | Return source or typed error | Returned source or typed error | Pass |
| R25 | Reserved React runtime binding | Reject | Rejected | Pass |
| I01 | WebSocket raw JSX gate | Approve safe JSX, block unsafe and off-design JSX | Approved safe JSX, blocked rejected output and counted one approval | Pass |
| I02 | WebSocket model layout gate | Reject raw JSX and disallowed field mapping | Rejected both with structured layout issues | Pass |
| I03 | Legacy REST provider response | HTTP 200 for safe JSX and 400 for rejected source or malformed output | Returned 200 for safe JSX and 400 for invalid output without returning the rejected source | Pass |
| I04 | Legacy offline source serialization | Keep user text as data | Encoded markup in the serialized field data | Pass |

## Changed files

| Area | Files |
| --- | --- |
| AST and JSX validation | `backend/src/services/astValidator.js`, `backend/src/services/jsxDesignValidator.js` |
| WebSocket integration and structured errors | `backend/src/server.js`, `backend/src/services/codeGenService.js`, `backend/src/services/generationErrors.js`, `backend/src/validators/wizardValidator.js` |
| Telemetry and session compatibility | `backend/src/validators/telemetryValidator.js`, `backend/src/store/sessionStore.js` |
| Legacy REST and generator | `src/server.js`, `src/generator/CodeGeneratorService.js`, `src/validator/index.js` |
| Test fixtures and integration coverage | `backend/tests/test-ast-validator.js`, `backend/tests/test-ws-server.js`, `backend/tests/test-ws-hardening.js`, `test/legacyGeneration.test.js` |
| Dependency manifests and lockfiles | `backend/package.json`, `backend/package-lock.json`, `package.json`, `package-lock.json` |
| Documentation and audit | `README.md`, `backend/WIZARD.md` |
