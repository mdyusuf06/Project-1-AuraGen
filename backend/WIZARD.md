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

Telemetry errors retain `type: "error"`, a display message, and the validation error list. Generation errors retain `type`, `message` and `details`, and include a stable `code` such as `OPENAI_AUTH`, `OPENAI_TIMEOUT`, `OPENAI_RATE_LIMIT`, `OPENAI_QUOTA`, `OPENAI_TOKEN_LIMIT`, `INVALID_OUTPUT`, or `GENERATION_BUSY`.

## Operation and privacy

- Set `USE_TEAMMATE_CODEGEN=true` and `OPENAI_API_KEY` in `backend/.env` to enable the reused LangChain ChatOpenAI integration. The default model is `gpt-4o` and the default temperature is 0.2. With the flag off, the backend groups fields by section locally. An enabled provider failure returns a structured error.
- The provider uses strict JSON Schema and a 3,500-token output limit. The total deadline defaults to 24 seconds and can be configured with `REQUEST_TIMEOUT_MS`. An attempt can run for up to 8 seconds. Transient failures receive up to two retries with jitter and provider retry hints within the deadline. Up to four jobs run concurrently. Excess work gets a busy response.
- WebSocket frames are capped at 32 KiB with compression disabled. Defaults permit up to 100 connections, 16 per IP, and 60 upgrade attempts per IP per minute. Message budgets are 300 per connection and 2,400 per IP per minute. Generation is capped at 30 requests per IP per minute. Cooldowns and in-flight state apply to each connection.
- Development permits browser origins on local port 3000 and originless tools. In production set `WS_ALLOWED_ORIGINS` to comma-separated exact browser origins. The production backend binds to loopback by default and requires an Origin header. Where access requires authentication, enforce the browser session at the reverse proxy or supply the synchronous `authorizeUpgrade(request)` hook when embedding the server. The rate limiter uses the socket peer address, so clients behind one proxy share its IP budget.
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
