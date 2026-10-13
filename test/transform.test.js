import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeTokenTransfers, transformBlock } from '../src/lib/indexer/transform.js';
import { TOPICS } from '../src/lib/abi.js';

const pad = (hex) => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`;
const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x3333333333333333333333333333333333333333';
const hx = (n) => `0x${BigInt(n).toString(16)}`;

test('decodes ERC-20, ERC-721 and ERC-1155 transfers', () => {
  const erc20 = decodeTokenTransfers({ address: TOKEN, logIndex: '0x1', topics: [TOPICS.TRANSFER, pad(A), pad(B)], data: pad('3e8') });
  assert.deepEqual(erc20.map((t) => [t.tokenType, t.from, t.to, t.value]), [['ERC20', A, B, '1000']]);

  const erc721 = decodeTokenTransfers({ address: TOKEN, logIndex: '0x2', topics: [TOPICS.TRANSFER, pad(A), pad(B), pad('7')], data: '0x' });
  assert.deepEqual(erc721.map((t) => [t.tokenType, t.tokenId, t.value]), [['ERC721', '7', '1']]);

  const single = decodeTokenTransfers({ address: TOKEN, logIndex: '0x3', topics: [TOPICS.TRANSFER_SINGLE, pad(A), pad(A), pad(B)], data: `0x${pad('5').slice(2)}${pad('a').slice(2)}` });
  assert.deepEqual(single.map((t) => [t.tokenType, t.tokenId, t.value, t.operator]), [['ERC1155', '5', '10', A]]);

  // TransferBatch(ids=[1,2], values=[100,200])
  const data = `0x${[pad('40'), pad('a0'), pad('2'), pad('1'), pad('2'), pad('2'), pad('64'), pad('c8')].map((w) => w.slice(2)).join('')}`;
  const batch = decodeTokenTransfers({ address: TOKEN, logIndex: '0x4', topics: [TOPICS.TRANSFER_BATCH, pad(A), pad('0'), pad(B)], data });
  assert.deepEqual(batch.map((t) => [t.batchIndex, t.tokenId, t.value]), [[0, '1', '100'], [1, '2', '200']]);

  // Non-standard event sharing the Transfer topic is ignored.
  assert.deepEqual(decodeTokenTransfers({ address: TOKEN, logIndex: '0x5', topics: [TOPICS.TRANSFER, pad(A)], data: '0x' }), []);
});

test('transformBlock computes fees, burns, contract creations and withdrawals', () => {
  const baseFee = 10n * 10n ** 9n;
  const block = {
    number: hx(100), hash: `0x${'aa'.repeat(32)}`, parentHash: `0x${'bb'.repeat(32)}`, timestamp: hx(1_700_000_000),
    miner: '0x9999999999999999999999999999999999999999', gasUsed: hx(42_000 + 100_000), gasLimit: hx(30_000_000), baseFeePerGas: hx(baseFee),
    size: hx(1234), extraData: '0x', stateRoot: '0x', transactionsRoot: '0x', receiptsRoot: '0x', logsBloom: '0x',
    withdrawals: [{ index: hx(7), validatorIndex: hx(42), address: A, amount: hx(32_000_000_000) }],
    transactions: [
      { hash: `0x${'01'.repeat(32)}`, from: A, to: B, value: hx(10n ** 18n), gas: hx(21_000), gasPrice: hx(12n * 10n ** 9n), maxFeePerGas: hx(20n * 10n ** 9n), maxPriorityFeePerGas: hx(2n * 10n ** 9n), input: '0x', nonce: hx(0), transactionIndex: hx(0), type: '0x2', chainId: '0x1' },
      { hash: `0x${'02'.repeat(32)}`, from: A, to: null, value: '0x0', gas: hx(200_000), gasPrice: hx(11n * 10n ** 9n), input: '0x6080', nonce: hx(1), transactionIndex: hx(1), type: '0x0' },
    ],
  };
  const receipts = [
    { transactionHash: block.transactions[0].hash, status: '0x1', gasUsed: hx(21_000), cumulativeGasUsed: hx(21_000), effectiveGasPrice: hx(12n * 10n ** 9n), logs: [] },
    { transactionHash: block.transactions[1].hash, status: '0x1', gasUsed: hx(100_000), cumulativeGasUsed: hx(121_000), effectiveGasPrice: hx(11n * 10n ** 9n), contractAddress: TOKEN, logs: [{ address: TOKEN, logIndex: '0x0', topics: [TOPICS.TRANSFER, pad('0'), pad(A)], data: pad('64') }] },
  ];
  const out = transformBlock(block, receipts, null);
  const [t1, t2] = out.transactions;
  assert.equal(t1.fee, (21_000n * 12n * 10n ** 9n).toString());
  assert.equal(t1.burntFee, (21_000n * baseFee).toString());
  assert.equal(out.block.burntFees, (121_000n * baseFee).toString());
  assert.equal(out.block.priorityFees, (21_000n * 2n * 10n ** 9n + 100_000n * 1n * 10n ** 9n).toString());
  assert.equal(t2.contractAddress, TOKEN);
  assert.equal(out.addresses.get(TOKEN).creator, A);
  assert.equal(out.tokens.get(TOKEN), 'ERC20');
  assert.equal(out.tokenTransfers.length, 1);
  assert.equal(out.withdrawals[0].amount, (32n * 10n ** 18n).toString());
  assert.equal(out.block.withdrawalCount, 1);
  assert.ok(out.balanceTouches.has(B));
  assert.equal(t1.methodId, null);
  assert.equal(t2.methodId, null);
});

test('transformBlock rejects missing receipts', () => {
  const block = { number: '0x1', hash: '0x01', parentHash: '0x00', timestamp: '0x1', miner: A, gasUsed: '0x0', gasLimit: '0x0', transactions: [{ hash: '0xff', from: A, to: B, value: '0x0', gas: '0x0', input: '0x', nonce: '0x0', transactionIndex: '0x0' }] };
  assert.throws(() => transformBlock(block, [], null), /missing receipt/);
});
