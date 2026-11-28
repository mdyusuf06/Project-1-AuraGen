import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import { CodeGeneratorService } from '../src/generator/CodeGeneratorService.js';

const schema = { formName: 'Contact', fields: [{ name: 'email', label: 'Email', type: 'email' }] };
const validCode = 'export default () => <input id="email" name="email" type="email" />;';

function output(componentCode, steps = [{ fields: ['email'] }]) {
  return JSON.stringify({
    componentName: 'ContactWizard', componentCode,
    steps,
    fieldMapping: { originalFieldCount: 1 },
    validationSummary: { isValid: true }
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test('I03 REST generation validates provider JSX before responding', { timeout: 15_000 }, async (t) => {
  const brokenJson = 'fixture upstream text';
  const replies = [
    output('export default () => <script />;'),
    output('export default () => <div className="bg-fuchsia-950" />;'),
    brokenJson,
    output(validCode, [null]),
    output(validCode)
  ];
  let providerCalls = 0;
  const provider = http.createServer((req, res) => {
    providerCalls++;
    req.resume();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'local-completion', object: 'chat.completion', created: 1, model: 'gpt-4o',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: replies.shift() } }]
    }));
  });
  t.after(() => close(provider));
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');
  const settings = {
    PORT: '0', WS_PORT: '0', OPENAI_API_KEY: 'sk-local-test-fixture',
    OPENAI_BASE_URL: `http://127.0.0.1:${provider.address().port}/v1`
  };
  for (const [name, value] of Object.entries(settings)) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
  const { server, wss } = await import('../src/server.js');
  t.after(() => Promise.all([close(server), close(wss)]));
  if (!server.listening) await once(server, 'listening');
  const generate = () => fetch(`http://127.0.0.1:${server.address().port}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schema })
  });

  for (const code of ['BLOCKED_JSX_TAG', 'UNAPPROVED_CLASS', undefined, undefined]) {
    const response = await generate();
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.equal(result.success, false);
    assert.equal(result.data, undefined);
    assert.equal(result.issues?.[0].code, code);
    assert.ok(!JSON.stringify(result).includes(brokenJson));
  }
  const response = await generate();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.componentCode, validCode);
  assert.equal(providerCalls, 5);
});

test('I04 Legacy offline generation keeps supplied labels in serialized data', async () => {
  const label = 'Name "</script> {example}"';
  const result = await new CodeGeneratorService().generateWizard({
    schema: { formName: 'Contact Form', fields: [{ name: 'email', label, type: 'email' }] }
  });
  assert.equal(result.success, true);
  assert.equal(result.data.componentName, 'Contact_FormWizard');
  assert.ok(result.data.componentCode.includes('JSON.parse('));
  assert.ok(result.data.componentCode.includes('\\u003c/script\\u003e'));
  assert.ok(!result.data.componentCode.includes('</script>'));
  assert.ok(result.data.steps[0].fields.includes('email'));
});
