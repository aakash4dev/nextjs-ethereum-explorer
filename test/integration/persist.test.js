/**
 * Integration test for the persistence layer against a real MongoDB.
 * Runs only when TEST_MONGODB_URI is set (CI provides a mongo service), e.g.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/explorer_test npm test
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const uri = process.env.TEST_MONGODB_URI;
const skip = uri ? false : 'TEST_MONGODB_URI not set';

let persistBatch;
let rollbackAbove;
let transformBlock;
let models;
let TOPICS;

const hx = (n) => `0x${BigInt(n).toString(16)}`;
const pad = (h) => `0x${h.replace(/^0x/, '').padStart(64, '0')}`;
const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const NFT = '0x4444444444444444444444444444444444444444';

function block(n, parent, txs) {
  const hash = pad(hx(1000 + n));
  return {
    raw: {
      number: hx(n), hash, parentHash: parent, timestamp: hx(1_700_000_000 + n * 12), miner: A, gasUsed: hx(50_000), gasLimit: hx(30_000_000),
      baseFeePerGas: hx(1_000_000_000), transactions: txs.map((t, i) => ({ ...t, transactionIndex: hx(i), blockNumber: hx(n), blockHash: hash })),
    },
    hash,
  };
}

before(async () => {
  if (skip) return;
  process.env.MONGODB_URI = uri;
  ({ persistBatch, rollbackAbove } = await import('../../src/lib/indexer/persist.js'));
  ({ transformBlock } = await import('../../src/lib/indexer/transform.js'));
  ({ TOPICS } = await import('../../src/lib/abi.js'));
  models = await import('../../src/lib/models.js');
  await mongoose.connect(uri);
  await mongoose.connection.db.dropDatabase();
  for (const m of models.ALL_MODELS) await m.syncIndexes();
});

after(async () => {
  if (skip) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('persist is idempotent and rollback removes orphaned data', { skip }, async () => {
  const txHash = (i) => pad(hx(0xabc000 + i));
  const nftTransfer = (to, id, logIndex) => ({ address: NFT, logIndex: hx(logIndex), topics: [TOPICS.TRANSFER, pad(A), pad(to), pad(hx(id))], data: '0x' });
  const b1 = block(1, pad('0'), [{ hash: txHash(1), from: A, to: NFT, value: '0x0', gas: hx(100_000), gasPrice: hx(2e9), input: '0x23b872dd', nonce: '0x0', type: '0x0' }]);
  const b2 = block(2, b1.hash, [{ hash: txHash(2), from: A, to: NFT, value: '0x0', gas: hx(100_000), gasPrice: hx(2e9), input: '0x23b872dd', nonce: '0x1', type: '0x0' }]);
  const receipt = (h, logs) => ({ transactionHash: h, status: '0x1', gasUsed: hx(50_000), cumulativeGasUsed: hx(50_000), effectiveGasPrice: hx(2e9), logs });
  const docs1 = transformBlock(b1.raw, [receipt(txHash(1), [nftTransfer(A, 7, 0)])]);
  const docs2 = transformBlock(b2.raw, [receipt(txHash(2), [nftTransfer(B, 7, 0)])]);

  await persistBatch([docs1, docs2]);
  await persistBatch([docs1, docs2]); // replay must not duplicate anything
  assert.equal(await models.Block.countDocuments(), 2);
  assert.equal(await models.Transaction.countDocuments(), 2);
  assert.equal(await models.TokenTransfer.countDocuments(), 2);
  assert.equal((await models.Token.findOne({ address: NFT }).lean()).type, 'ERC721');
  assert.equal((await models.NftInstance.findOne({ token: NFT, tokenId: '7' }).lean()).owner, B);

  // Replaying an older block must not move ownership backwards.
  await persistBatch([docs1]);
  assert.equal((await models.NftInstance.findOne({ token: NFT, tokenId: '7' }).lean()).owner, B);

  const addr = await models.Address.findOne({ address: A }).lean();
  assert.equal(addr.firstSeenBlock, 1);
  assert.equal(addr.lastSeenBlock, 2);

  const orphans = await rollbackAbove(1);
  assert.equal(orphans.length, 1);
  assert.equal(await models.Block.countDocuments(), 1);
  assert.equal(await models.Transaction.countDocuments({ blockNumber: 2 }), 0);
  assert.equal(await models.TokenTransfer.countDocuments({ blockNumber: 2 }), 0);
  assert.equal((await models.NftInstance.findOne({ token: NFT, tokenId: '7' }).lean()).lastSeq, -1);
});
