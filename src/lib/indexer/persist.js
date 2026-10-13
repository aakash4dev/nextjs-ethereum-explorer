import {
  Address,
  Block,
  InternalTx,
  Log,
  NftInstance,
  Token,
  TokenTransfer,
  Transaction,
  Withdrawal,
} from '../models.js';

const CHUNK = 1000;

async function bulk(model, ops) {
  for (let i = 0; i < ops.length; i += CHUNK) {
    await model.bulkWrite(ops.slice(i, i + CHUNK), { ordered: false });
  }
}

const upsertBy = (keyFn) => (doc) => ({ updateOne: { filter: keyFn(doc), update: { $set: doc }, upsert: true } });

/**
 * Persist the documents of a batch of transformed blocks. Children are
 * written before the block row, so a block document only exists once its
 * contents are complete; the block row therefore acts as the commit marker.
 */
export async function persistBatch(batch) {
  const all = (k) => batch.flatMap((b) => b[k]);

  await Promise.all([
    bulk(Transaction, all('transactions').map(upsertBy((d) => ({ hash: d.hash })))),
    bulk(Log, all('logs').map(upsertBy((d) => ({ blockNumber: d.blockNumber, logIndex: d.logIndex })))),
    bulk(TokenTransfer, all('tokenTransfers').map(upsertBy((d) => ({ blockNumber: d.blockNumber, logIndex: d.logIndex, batchIndex: d.batchIndex })))),
    bulk(InternalTx, all('internalTxs').map(upsertBy((d) => ({ txHash: d.txHash, traceAddress: d.traceAddress })))),
    bulk(Withdrawal, all('withdrawals').map(upsertBy((d) => ({ index: d.index })))),
  ]);

  // Addresses: first/last seen are monotonic ($min/$max) so replays are safe.
  const addrOps = [];
  for (const b of batch) {
    for (const [address, info] of b.addresses) {
      const set = {};
      if (info.isContract) set.isContract = true;
      if (info.creator) {
        set.creator = info.creator;
        set.creationTxHash = info.creationTxHash;
        set.creationBlock = info.creationBlock;
      }
      addrOps.push({
        updateOne: {
          filter: { address },
          update: {
            $min: { firstSeenBlock: b.block.number },
            $max: { lastSeenBlock: b.block.number },
            ...(Object.keys(set).length ? { $set: set } : {}),
            $setOnInsert: { address },
          },
          upsert: true,
        },
      });
    }
  }
  await bulk(Address, addrOps);

  // Tokens discovered in this batch.
  const tokenOps = [];
  for (const b of batch) {
    for (const [address, type] of b.tokens) {
      tokenOps.push({
        updateOne: {
          filter: { address },
          update: { $setOnInsert: { address, type }, $min: { firstSeenBlock: b.block.number }, $max: { lastTransferBlock: b.block.number } },
          upsert: true,
        },
      });
    }
  }
  await bulk(Token, tokenOps);

  // NFT ownership: last transfer wins, guarded by a monotonic sequence number.
  const nftOps = [];
  for (const t of all('tokenTransfers')) {
    if (t.tokenType === 'ERC20') continue;
    const seq = t.blockNumber * 1e6 + t.logIndex;
    nftOps.push({
      updateOne: {
        filter: { token: t.token, tokenId: t.tokenId },
        update: { $setOnInsert: { token: t.token, tokenId: t.tokenId, tokenType: t.tokenType, lastSeq: -1 } },
        upsert: true,
      },
    });
    if (t.tokenType === 'ERC721') {
      nftOps.push({
        updateOne: {
          filter: { token: t.token, tokenId: t.tokenId, lastSeq: { $lt: seq } },
          update: { $set: { owner: t.to, lastSeq: seq } },
        },
      });
    }
  }
  // Ordered: the upsert must land before the conditional owner update.
  for (let i = 0; i < nftOps.length; i += CHUNK) {
    await NftInstance.bulkWrite(nftOps.slice(i, i + CHUNK), { ordered: true });
  }

  await bulk(Block, batch.map((b) => upsertBy((d) => ({ number: d.number }))(b.block)));
}

/**
 * Remove every document above `ancestor` (reorg rollback). Returns the token
 * holders / NFT instances whose state must be refreshed afterwards.
 */
export async function rollbackAbove(ancestor) {
  const filter = { blockNumber: { $gt: ancestor } };
  const orphanTransfers = await TokenTransfer.find(filter).select({ token: 1, tokenType: 1, from: 1, to: 1, tokenId: 1 }).lean();
  await Block.deleteMany({ number: { $gt: ancestor } });
  await Promise.all([
    Transaction.deleteMany(filter),
    Log.deleteMany(filter),
    TokenTransfer.deleteMany(filter),
    InternalTx.deleteMany(filter),
    Withdrawal.deleteMany(filter),
  ]);
  await NftInstance.updateMany({ lastSeq: { $gt: ancestor * 1e6 + 999_999 } }, { $set: { lastSeq: -1 } });
  return orphanTransfers;
}
