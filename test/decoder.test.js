import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeFunctionData, parseAbi, toEventSelector } from 'viem';
import { decodeInput, decodeInputWithAbi, decodeLogWithAbi, decodeRevert } from '../src/lib/decoder.js';
import { builtinSignatureTable } from '../src/lib/signatures-builtin.js';

const abi = parseAbi(['function transfer(address to, uint256 amount)', 'event Transfer(address indexed from, address indexed to, uint256 value)', 'error NotOwner(address caller)']);
const A = '0x1111111111111111111111111111111111111111';

test('builtin signature table has correct selectors', () => {
  const t = builtinSignatureTable();
  assert.ok(t.get('0xa9059cbb')[0].startsWith('function transfer('));
  assert.ok(t.get('0x095ea7b3')[0].startsWith('function approve('));
  assert.ok(t.get(toEventSelector('Transfer(address,address,uint256)')).some((s) => s.startsWith('event Transfer')));
});

test('decodes calldata with an ABI and with the builtin table', async () => {
  const data = encodeFunctionData({ abi, functionName: 'transfer', args: [A, 5n] });
  const viaAbi = decodeInputWithAbi(abi, data);
  assert.equal(viaAbi.name, 'transfer');
  assert.equal(viaAbi.args[1].value, '5');
  const viaSig = await decodeInput(data);
  assert.equal(viaSig.source, 'signature');
  assert.equal(viaSig.args[0].value.toLowerCase(), A);
  assert.equal(await decodeInput('0x'), null);
});

test('decodes event logs', () => {
  const topics = [toEventSelector('Transfer(address,address,uint256)'), `0x${A.slice(2).padStart(64, '0')}`, `0x${A.slice(2).padStart(64, '0')}`];
  const decoded = decodeLogWithAbi(abi, { topics, data: encodeAbiParameters([{ type: 'uint256' }], [42n]) });
  assert.equal(decoded.name, 'Transfer');
  assert.deepEqual(decoded.args.map((a) => a.indexed), [true, true, false]);
  assert.equal(decoded.args[2].value, '42');
});

test('decodes revert reasons', async () => {
  const errorString = `0x08c379a0${encodeAbiParameters([{ type: 'string' }], ['nope']).slice(2)}`;
  assert.equal(await decodeRevert(errorString), 'nope');
  const panic = `0x4e487b71${encodeAbiParameters([{ type: 'uint256' }], [0x11n]).slice(2)}`;
  assert.equal(await decodeRevert(panic), 'Panic: Arithmetic overflow/underflow');
  const custom = encodeFunctionData({ abi: parseAbi(['function NotOwner(address caller)']), functionName: 'NotOwner', args: [A] });
  assert.match(await decodeRevert(custom, { abi }), /^NotOwner\(/);
});
