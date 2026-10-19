import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownedHealth, probeExplorer } from '../scripts/devnet/runtime.js';

const checks = { database: { ok: true }, rpc: { ok: true }, indexer: { ok: true } };
const response = (body, options) => async () => Response.json(body, options);

test('devnet recognises healthy and degraded explorers but not unrelated services', async () => {
  assert.deepEqual(await probeExplorer('http://localhost', response({ status: 'ok', checks })), { healthy: true });
  assert.deepEqual(await probeExplorer('http://localhost', response({ status: 'degraded', checks: { ...checks, indexer: { ok: false } } }, { status: 503 })), { healthy: false });
  assert.equal(await probeExplorer('http://localhost', response({ status: 'ok' })), null);
  assert.equal(await probeExplorer('http://localhost', async () => { throw new Error('offline'); }), null);
});

test('readiness only accepts a healthy response from the web child it launched', async () => {
  const url = 'http://localhost/api/health';
  await ownedHealth(url, 'new-run', response({ status: 'ok' }, { headers: { 'x-devnet-instance': 'new-run' } }));
  await assert.rejects(ownedHealth(url, 'new-run', response({ status: 'ok' })), /different web process/);
  await assert.rejects(ownedHealth(url, 'new-run', response({ status: 'ok' }, { headers: { 'x-devnet-instance': 'old-run' } })), /different web process/);
  await assert.rejects(ownedHealth(url, 'new-run', response({ status: 'degraded' }, { status: 503, headers: { 'x-devnet-instance': 'new-run' } })), /HTTP 503/);
});
