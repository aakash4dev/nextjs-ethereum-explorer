import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coerceContractArg, functionSignature } from '../src/lib/contract-args.js';

test('ABI tuples and nested arrays use canonical signatures and preserve integer precision', () => {
  const parameter = { type: 'tuple[]', components: [{ name: 'amount', type: 'uint256' }, { name: 'flags', type: 'bool[2]' }] };
  assert.equal(functionSignature({ name: 'sum', inputs: [parameter] }), 'sum((uint256,bool[2])[])');
  assert.deepEqual(coerceContractArg(parameter, '[{"amount":"9007199254740993","flags":[true,false]}]'), [[9007199254740993n, [true, false]]]);
  assert.deepEqual(coerceContractArg({ type: 'uint256[][]' }, '[["1","2"],["3"]]'), [[1n, 2n], [3n]]);
});

test('ABI coercion rejects invalid booleans, array lengths and unsafe numbers', () => {
  assert.throws(() => coerceContractArg({ type: 'bool' }, 'maybe'), /true or false/);
  assert.throws(() => coerceContractArg({ type: 'uint256' }, ''), /integer/);
  assert.throws(() => coerceContractArg({ type: 'uint256' }, 9007199254740992), /strings/);
  assert.throws(() => coerceContractArg({ type: 'uint256[2]' }, '["1"]'), /2 items/);
});
