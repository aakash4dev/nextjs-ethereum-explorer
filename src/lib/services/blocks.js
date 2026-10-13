import { Block, Transaction, Withdrawal } from '../models.js';
import { rpc, toHex } from '../rpc.js';
import { transformBlock } from '../indexer/transform.js';
import { methodNames } from '../signatures.js';
import { NO_ID, addressMeta, boundedCount, cached, paginate, safeHead } from './common.js';

const LIST_FIELDS = { ...NO_ID, number: 1, hash: 1, timestamp: 1, miner: 1, gasUsed: 1, gasLimit: 1, baseFeePerGas: 1, burntFees: 1, priorityFees: 1, transactionCount: 1, internalTxCount: 1, size: 1, blobGasUsed: 1, withdrawalCount: 1 };

export async function listBlocks({ page = 1, limit = 25 } = {}) {
  const [blocks, total] = await Promise.all([
    Block.find().sort({ number: -1 }).skip((page - 1) * limit).limit(limit).select(LIST_FIELDS).lean(),
    cached('blockCount', 5000, () => Block.estimatedDocumentCount()),
  ]);
  const meta = await addressMeta(blocks.map((b) => b.miner));
  return { blocks: blocks.map((b) => ({ ...b, minerMeta: meta[b.miner] ?? null })), pagination: paginate(total, page, limit) };
}

export async function latestBlocks(n = 6) {
  return Block.find().sort({ number: -1 }).limit(n).select(LIST_FIELDS).lean();
}

/** Fetch a block live from the node (used when it is not indexed yet). */
async function blockFromRpc(id) {
  const raw = typeof id === 'number' ? await rpc('eth_getBlockByNumber', [toHex(id), true]) : await rpc('eth_getBlockByHash', [id, true]);
  if (!raw) return null;
  let receipts;
  try {
    receipts = await rpc('eth_getBlockReceipts', [raw.number]);
  } catch {
    receipts = await Promise.all(raw.transactions.map((t) => rpc('eth_getTransactionReceipt', [t.hash])));
  }
  return transformBlock(raw, receipts, null);
}

/**
 * @param id block number (number) or block hash (string)
 */
export async function getBlock(id) {
  const filter = typeof id === 'number' ? { number: id } : { hash: id.toLowerCase() };
  let block = await Block.findOne(filter).select(NO_ID).lean();
  let source = 'db';
  let rpcTxs = null;
  if (!block) {
    const live = await blockFromRpc(id).catch(() => null);
    if (!live) return null;
    block = live.block;
    rpcTxs = live.transactions;
    source = 'rpc';
  }
  const [head, prev, next, meta] = await Promise.all([
    safeHead(),
    Block.exists({ number: block.number - 1 }),
    Block.exists({ number: block.number + 1 }),
    addressMeta([block.miner]),
  ]);
  return {
    block: { ...block, minerMeta: meta[block.miner] ?? null },
    source,
    confirmations: head === null ? null : Math.max(0, head - block.number + 1),
    navigation: {
      previous: block.number > 0 ? block.number - 1 : null,
      next: head === null || block.number < head ? block.number + 1 : null,
      previousIndexed: Boolean(prev),
      nextIndexed: Boolean(next),
    },
    rpcTransactions: rpcTxs,
  };
}

export async function decorateTransactions(txs) {
  const [names, meta] = await Promise.all([
    methodNames(txs.map((t) => t.methodId)),
    addressMeta(txs.flatMap((t) => [t.from, t.to, t.contractAddress])),
  ]);
  return txs.map((t) => ({
    ...t,
    method: !t.to ? 'Contract Creation' : t.methodId ? names[t.methodId] ?? t.methodId : 'Transfer',
    fromMeta: meta[t.from] ?? null,
    toMeta: meta[t.to] ?? (t.contractAddress ? meta[t.contractAddress] ?? null : null),
  }));
}

export const TX_LIST_FIELDS = { ...NO_ID, hash: 1, blockNumber: 1, timestamp: 1, transactionIndex: 1, from: 1, to: 1, value: 1, fee: 1, gasUsed: 1, gasPrice: 1, effectiveGasPrice: 1, methodId: 1, status: 1, contractAddress: 1, type: 1 };

export async function getBlockTransactions(number, { page = 1, limit = 50 } = {}) {
  const [txs, total] = await Promise.all([
    Transaction.find({ blockNumber: number }).sort({ transactionIndex: 1 }).skip((page - 1) * limit).limit(limit).select(TX_LIST_FIELDS).lean(),
    boundedCount(Transaction, { blockNumber: number }),
  ]);
  return { transactions: await decorateTransactions(txs), pagination: paginate(total, page, limit) };
}

export async function getBlockWithdrawals(number) {
  return Withdrawal.find({ blockNumber: number }).sort({ index: 1 }).select(NO_ID).lean();
}

export async function listWithdrawals({ page = 1, limit = 25, address } = {}) {
  const filter = address ? { address } : {};
  const [rows, total] = await Promise.all([
    Withdrawal.find(filter).sort({ index: -1 }).skip((page - 1) * limit).limit(limit).select(NO_ID).lean(),
    address ? boundedCount(Withdrawal, filter) : Withdrawal.estimatedDocumentCount(),
  ]);
  return { withdrawals: rows, pagination: paginate(total, page, limit) };
}

export async function getMinedBlocks(miner, { page = 1, limit = 25 } = {}) {
  const [blocks, total] = await Promise.all([
    Block.find({ miner }).sort({ number: -1 }).skip((page - 1) * limit).limit(limit).select(LIST_FIELDS).lean(),
    boundedCount(Block, { miner }),
  ]);
  return { blocks, pagination: paginate(total, page, limit) };
}

/** Closest indexed block at or before/after a unix timestamp (seconds). */
export async function getBlockByTime(ts, closest = 'before') {
  const date = new Date(ts * 1000);
  const q = closest === 'after' ? Block.findOne({ timestamp: { $gte: date } }).sort({ timestamp: 1 }) : Block.findOne({ timestamp: { $lte: date } }).sort({ timestamp: -1 });
  return q.select({ number: 1, timestamp: 1, _id: 0 }).lean();
}
