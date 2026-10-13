import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatEther, formatGwei, groupDecimal, timeAgo, truncateMiddle, txTypeLabel, gasUsedPercent, toBigInt } from '../src/lib/format.js';

test('formatEther keeps full wei precision', () => {
  assert.equal(formatEther('1'), '0.000000000000000001');
  assert.equal(formatEther('123456789012345678901234567'), '123,456,789.012345678901234567');
  assert.equal(formatEther('1500000000000000000', 4), '1.5');
  assert.equal(formatEther(0), '0');
});

test('formatGwei', () => {
  assert.equal(formatGwei('30000000000'), '30');
  assert.equal(formatGwei('1234567', 3), '0.001');
});

test('groupDecimal groups thousands and trims trailing zeros', () => {
  assert.equal(groupDecimal('1234567.8900'), '1,234,567.89');
  assert.equal(groupDecimal('-1000'), '-1,000');
});

test('timeAgo', () => {
  const now = Date.UTC(2024, 0, 1, 12, 0, 0);
  assert.equal(timeAgo(new Date(now - 5000), now), '5 secs ago');
  assert.equal(timeAgo(new Date(now - 3_720_000), now), '1 hr 2 mins ago');
  assert.equal(timeAgo(new Date(now - 2 * 86_400_000 - 3_600_000), now), '2 days 1 hr ago');
});

test('misc helpers', () => {
  assert.equal(truncateMiddle('0x1234567890abcdef1234567890abcdef12345678', 6, 4), '0x1234...5678');
  assert.equal(txTypeLabel(2), 'EIP-1559 (Type 2)');
  assert.equal(gasUsedPercent(15_000_000, 30_000_000), 50);
  assert.equal(toBigInt('0x10'), 16n);
  assert.equal(toBigInt('garbage'), 0n);
});
