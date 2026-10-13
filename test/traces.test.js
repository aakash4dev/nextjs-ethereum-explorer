import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCallTree, normalizeCallTracer, normalizeParity, selectInternalTransactions } from '../src/lib/indexer/traces.js';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const C = '0x3333333333333333333333333333333333333333';

test('normalizes geth callTracer output and builds a tree', () => {
  const res = [{
    txHash: '0xAB',
    result: { type: 'CALL', from: A, to: B, value: '0x0', gas: '0x100', gasUsed: '0x50', input: '0x12345678', calls: [
      { type: 'CALL', from: B, to: C, value: '0xde0b6b3a7640000', gas: '0x10', gasUsed: '0x0', input: '0x' },
      { type: 'STATICCALL', from: B, to: C, gas: '0x10', gasUsed: '0x5', input: '0x', calls: [{ type: 'CREATE2', from: C, to: A, value: '0x0', gas: '0x1', gasUsed: '0x1', input: '0x60' }] },
    ] },
  }];
  const frames = normalizeCallTracer(res, []);
  assert.deepEqual(frames.map((f) => f.traceAddress), ['', '0', '1', '1.0']);
  assert.equal(frames[1].value, '1000000000000000000');
  assert.equal(frames[2].callType, 'staticcall');
  assert.equal(frames[3].type, 'create2');
  assert.deepEqual(selectInternalTransactions(frames).map((f) => f.traceAddress), ['0', '1.0']);
  const tree = buildCallTree(frames);
  assert.equal(tree.calls.length, 2);
  assert.equal(tree.calls[1].calls[0].type, 'create2');
});

test('normalizes parity trace_block output', () => {
  const frames = normalizeParity([
    { type: 'reward', action: {}, transactionHash: null },
    { type: 'call', transactionHash: '0xAA', traceAddress: [], action: { callType: 'call', from: A, to: B, value: '0x0', gas: '0x10', input: '0x' }, result: { gasUsed: '0x5' } },
    { type: 'create', transactionHash: '0xAA', traceAddress: [0], action: { from: B, value: '0x1', gas: '0x10', init: '0x60' }, result: { address: C, gasUsed: '0x5' } },
    { type: 'suicide', transactionHash: '0xAA', traceAddress: [1], action: { address: C, refundAddress: A, balance: '0x2' } },
  ]);
  assert.equal(frames.length, 3);
  assert.equal(frames[1].to, C);
  assert.equal(frames[2].type, 'selfdestruct');
  assert.equal(frames[2].value, '2');
  assert.equal(frames[0].txHash, '0xaa');
});
