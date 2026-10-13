import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAddress, isHash, isBlockNumber, normalizeAddress, parsePagination, HttpError } from '../src/lib/validation.js';

test('address / hash / block validation', () => {
  assert.ok(isAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'));
  assert.ok(!isAddress('0x123'));
  assert.ok(isHash(`0x${'a'.repeat(64)}`));
  assert.ok(!isHash(`0x${'g'.repeat(64)}`));
  assert.ok(isBlockNumber('12345'));
  assert.ok(!isBlockNumber('-1'));
  assert.equal(normalizeAddress('0xABCDEF0123456789abcdef0123456789ABCDEF01'), '0xabcdef0123456789abcdef0123456789abcdef01');
  assert.throws(() => normalizeAddress('nope'), HttpError);
});

test('parsePagination clamps limit and result window', () => {
  assert.deepEqual(parsePagination(new URLSearchParams('page=2&limit=10')), { page: 2, limit: 10, skip: 10, maxPage: 1000 });
  assert.equal(parsePagination(new URLSearchParams('limit=100000')).limit, 100);
  assert.equal(parsePagination(new URLSearchParams('page=999999&limit=100')).page, 100);
  assert.equal(parsePagination({ p: '3', ps: '50' }).skip, 100);
  assert.equal(parsePagination(new URLSearchParams('page=abc')).page, 1);
});
