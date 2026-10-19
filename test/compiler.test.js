import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVersion, compileStandardJson } from '../src/lib/verification/compiler.js';
import solc from 'solc';

test('compiler versions cannot contain trailing paths or malformed commit IDs', () => {
  assert.deepEqual(parseVersion('v0.8.37+commit.f401782d'), { short: '0.8.37', commit: 'f401782d' });
  for (const value of ['0.8.37/../../evil', 'v0.8.37+commit.bad', '0.8.37 anything']) assert.equal(parseVersion(value), null);
});
test('bundled compiler works offline in its worker thread', async () => {
  const result = await compileStandardJson({ language: 'Solidity', sources: { 'C.sol': { content: 'pragma solidity ^0.8.20; contract C { function n() external pure returns(uint) {return 7;} }' } }, settings: { outputSelection: { '*': { '*': ['abi'] } } } }, solc.version());
  assert(result.output.contracts['C.sol'].C.abi.some((f) => f.name === 'n'));
});
