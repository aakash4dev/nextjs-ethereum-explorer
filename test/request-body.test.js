import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBody } from '../src/lib/request-body.js';
const req = (body, type = 'application/json', headers = {}) => new Request('http://localhost/api', { method: 'POST', body, headers: { 'content-type': type, ...headers } });

test('request parser accepts JSON objects and URL encoded forms', async () => {
  assert.deepEqual(await readBody(req('{"args":["1"]}')), { args: ['1'] });
  assert.deepEqual(await readBody(req('module=contract&sourceCode=hello', 'application/x-www-form-urlencoded')), { module: 'contract', sourceCode: 'hello' });
});
test('request parser rejects null, arrays, invalid JSON, unsupported content and oversized bodies', async () => {
  for (const body of ['null', '[]', '"hello"', '{']) await assert.rejects(readBody(req(body)), (e) => e.status === 400);
  await assert.rejects(readBody(req('hello', 'text/plain')), (e) => e.status === 415);
  await assert.rejects(readBody(req('{"value":"too large"}'), { maxBytes: 10 }), (e) => e.status === 413);
  await assert.rejects(readBody(req('{}', 'application/json', { 'content-length': '100' }), { maxBytes: 10 }), (e) => e.status === 413);
});
