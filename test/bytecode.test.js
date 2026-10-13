import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auxdataRanges, compareRuntime, extractConstructorArgs, linkLibraries, maskRanges, splitMetadata } from '../src/lib/verification/bytecode.js';

const meta = (seed) => `a2646970667358221220${seed.repeat(64).slice(0, 64)}64736f6c63430008140033`;
const code = (body, seed = 'a') => `0x${body}${meta(seed)}`;

test('splitMetadata separates CBOR auxdata', () => {
  const [exec, m] = splitMetadata(code('6080604052', 'b'));
  assert.equal(exec, '6080604052');
  assert.equal(m, meta('b'));
  assert.deepEqual(splitMetadata('0x6080'), ['6080', '']);
});

test('compareRuntime: full, partial and mismatch', () => {
  assert.equal(compareRuntime(code('6080604052'), { deployedBytecode: code('6080604052').slice(2) }).match, 'full');
  assert.equal(compareRuntime(code('6080604052', 'c'), { deployedBytecode: code('6080604052', 'd').slice(2) }).match, 'partial');
  assert.equal(compareRuntime(code('6080604053'), { deployedBytecode: code('6080604052').slice(2) }).match, null);
});

test('compareRuntime masks immutables', () => {
  const onchain = code(`60${'ff'.repeat(32)}52`);
  const compiled = code(`60${'00'.repeat(32)}52`).slice(2);
  assert.equal(compareRuntime(onchain, { deployedBytecode: compiled, immutableReferences: { 5: [{ start: 1, length: 32 }] } }).match, 'full');
  assert.equal(compareRuntime(onchain, { deployedBytecode: compiled }).match, null);
});

test('partial match with embedded child metadata (factories)', () => {
  const onchain = `0x6000${meta('1')}6001${meta('2')}`;
  const local = `6000${meta('3')}6001${meta('4')}`;
  assert.equal(auxdataRanges(local).length, 2);
  assert.equal(compareRuntime(onchain, { deployedBytecode: local }).match, 'partial');
});

test('library linking auto-detects addresses from on-chain code', () => {
  const lib = 'ab'.repeat(20);
  const placeholder = `__$${'0'.repeat(34)}$__`;
  const compiled = `73${placeholder}50`;
  const { code: linked, libraries } = linkLibraries(compiled, { 'L.sol': { Lib: [{ start: 1, length: 20 }] } }, `0x73${lib}50`);
  assert.equal(linked, `73${lib}50`);
  assert.equal(libraries['L.sol:Lib'], `0x${lib}`);
});

test('extractConstructorArgs strips creation code', () => {
  const creation = code('60806040', 'e');
  assert.equal(extractConstructorArgs(`${creation}${'00'.repeat(31)}01`, creation), `${'00'.repeat(31)}01`);
  assert.equal(extractConstructorArgs('0xdeadbeef', creation), null);
  assert.equal(maskRanges('0xaabbcc', [{ start: 1, length: 1 }]), 'aa00cc');
});
