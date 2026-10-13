import config from '../config.js';
import { Block, Contract, InternalTx, Log, Token, TokenTransfer, Transaction } from '../models.js';
import { rpc } from '../rpc.js';
import { transformBlock } from '../indexer/transform.js';
import { buildCallTree, normalizeCallFrame, normalizeParity } from '../indexer/traces.js';
import { resolveTraceMode } from '../indexer/fetch.js';
import { decodeInput, decodeLog, decodeRevert } from '../decoder.js';
import { NO_ID, addressMeta, boundedCount, cached, paginate, safeHead } from './common.js';
import { TX_LIST_FIELDS, decorateTransactions } from './blocks.js';

export async function listTransactions({ page = 1, limit = 25, block, address } = {}) {
  const filter = {};
  if (block !== undefined && block !== null) filter.blockNumber = block;
  if (address) filter.$or = [{ from: address }, { to: address }, { contractAddress: address }];
  const sort = { blockNumber: -1, transactionIndex: -1 };
  const [txs, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).select(TX_LIST_FIELDS).lean(),
    Object.keys(filter).length ? boundedCount(Transaction, filter) : cached('txCount', 5000, () => Transaction.estimatedDocumentCount()),
  ]);
  return { transactions: await decorateTransactions(txs), pagination: paginate(total, page, limit) };
}

async function abiFor(address) {
  if (!address) return null;
  const c = await Contract.findOne({ address }).select({ abi: 1, _id: 0 }).lean();
  return c?.abi ?? null;
}

/** Load a transaction from the node when it is not (yet) indexed. */
async function txFromRpc(hash) {
  const tx = await rpc('eth_getTransactionByHash', [hash]);
  if (!tx) return null;
  if (!tx.blockNumber) {
    return { pending: true, transaction: { hash, from: tx.from?.toLowerCase(), to: tx.to?.toLowerCase() ?? null, value: BigInt(tx.value).toString(), nonce: Number(BigInt(tx.nonce)), gas: Number(BigInt(tx.gas)), gasPrice: tx.gasPrice ? BigInt(tx.gasPrice).toString() : null, maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas).toString() : null, maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas).toString() : null, input: tx.input, type: Number(BigInt(tx.type ?? '0x0')), status: null } };
  }
  const [receipt, header] = await Promise.all([rpc('eth_getTransactionReceipt', [hash]), rpc('eth_getBlockByNumber', [tx.blockNumber, false])]);
  if (!receipt || !header) return null;
  const docs = transformBlock({ ...header, transactions: [tx] }, [receipt], null);
  return { pending: false, transaction: docs.transactions[0], logs: docs.logs, tokenTransfers: docs.tokenTransfers, block: docs.block };
}

/** Full transaction detail for the transaction page / API. */
export async function getTransaction(hash) {
  let tx = await Transaction.findOne({ hash }).select(NO_ID).lean();
  let logs;
  let transfers;
  let block;
  let source = 'db';
  if (tx) {
    [logs, transfers, block] = await Promise.all([
      Log.find({ txHash: hash }).sort({ logIndex: 1 }).select(NO_ID).lean(),
      TokenTransfer.find({ txHash: hash }).sort({ logIndex: 1, batchIndex: 1 }).select(NO_ID).lean(),
      Block.findOne({ number: tx.blockNumber }).select({ ...NO_ID, number: 1, timestamp: 1, baseFeePerGas: 1, hash: 1, miner: 1 }).lean(),
    ]);
  } else {
    const live = await txFromRpc(hash).catch(() => null);
    if (!live) return null;
    if (live.pending) return { pending: true, transaction: live.transaction, source: 'mempool' };
    ({ transaction: tx, logs, tokenTransfers: transfers, block } = live);
    source = 'rpc';
  }

  const target = tx.to ?? tx.contractAddress;
  const [head, targetAbi, tokenDocs, internal] = await Promise.all([
    safeHead(),
    abiFor(tx.to),
    Token.find({ address: { $in: [...new Set(transfers.map((t) => t.token))] } }).select({ ...NO_ID, address: 1, name: 1, symbol: 1, decimals: 1, type: 1 }).lean(),
    InternalTx.find({ txHash: hash }).select(NO_ID).lean(),
  ]);

  const emitterAbis = new Map();
  await Promise.all(
    [...new Set(logs.map((l) => l.address))].map(async (a) => emitterAbis.set(a, a === tx.to ? targetAbi : await abiFor(a))),
  );
  const [decodedInput, decodedLogs] = await Promise.all([
    decodeInput(tx.input, { abi: targetAbi }),
    Promise.all(logs.map((l) => decodeLog(l, { abi: emitterAbis.get(l.address) }))),
  ]);
  const tokenByAddr = new Map(tokenDocs.map((t) => [t.address, t]));
  const meta = await addressMeta([tx.from, target, block?.miner, ...logs.map((l) => l.address), ...transfers.flatMap((t) => [t.from, t.to]), ...internal.flatMap((i) => [i.from, i.to])]);

  return {
    pending: false,
    source,
    transaction: tx,
    block,
    confirmations: head === null ? null : Math.max(0, head - tx.blockNumber + 1),
    decodedInput,
    logs: logs.map((l, i) => ({ ...l, decoded: decodedLogs[i] })),
    tokenTransfers: transfers.map((t) => ({ ...t, tokenInfo: tokenByAddr.get(t.token) ?? null })),
    internalTransactions: internal.sort((a, b) => a.traceAddress.localeCompare(b.traceAddress, undefined, { numeric: true })),
    meta,
  };
}

/**
 * Full call tree for a transaction from the node's trace API (not stored).
 * Returns { supported, tree, flat, revertReason }.
 */
export async function getTransactionTrace(hash) {
  return cached(`trace:${hash}`, 60_000, async () => {
    const mode = await resolveTraceMode().catch(() => 'off');
    let frames = null;
    try {
      if (mode === 'callTracer') frames = normalizeCallFrame(await rpc('debug_traceTransaction', [hash, { tracer: 'callTracer', timeout: '30s' }]), hash);
      else if (mode === 'parity') frames = normalizeParity(await rpc('trace_transaction', [hash]));
    } catch {
      frames = null;
    }
    if (!frames) return { supported: mode !== 'off', tree: null, flat: [] };
    const root = frames.find((f) => f.depth === 0);
    let revertReason = root?.revertReason ?? null;
    if (!revertReason && root?.error && root.output) revertReason = await decodeRevert(root.output, { abi: await abiFor(root.to) });
    const meta = await addressMeta(frames.flatMap((f) => [f.from, f.to]));
    const flat = frames.map((f) => ({ ...f, input: f.input?.length > 2048 ? `${f.input.slice(0, 2048)}…` : f.input, output: f.output?.length > 2048 ? `${f.output.slice(0, 2048)}…` : f.output }));
    return { supported: true, tree: buildCallTree(flat), flat, revertReason: revertReason ?? root?.error ?? null, meta };
  });
}

export async function listInternalTransactions({ page = 1, limit = 25, address, block } = {}) {
  const filter = {};
  if (address) filter.$or = [{ from: address }, { to: address }];
  if (block !== undefined && block !== null) filter.blockNumber = block;
  const [rows, total] = await Promise.all([
    InternalTx.find(filter).sort({ blockNumber: -1, txHash: 1, traceAddress: 1 }).skip((page - 1) * limit).limit(limit).select(NO_ID).lean(),
    Object.keys(filter).length ? boundedCount(InternalTx, filter) : InternalTx.estimatedDocumentCount(),
  ]);
  const meta = await addressMeta(rows.flatMap((r) => [r.from, r.to]));
  return { internalTransactions: rows, meta, pagination: paginate(total, page, limit) };
}

export async function latestTransactions(n = 6) {
  const txs = await Transaction.find().sort({ blockNumber: -1, transactionIndex: -1 }).limit(n).select(TX_LIST_FIELDS).lean();
  return decorateTransactions(txs);
}

/** Pending transactions from the node's mempool (if exposed). */
export async function getPendingTransactions(limit = 50) {
  return cached('pending', 3000, async () => {
    try {
      const block = await rpc('eth_getBlockByNumber', ['pending', true]);
      const txs = (block?.transactions ?? []).slice(0, limit).map((t) => ({
        hash: t.hash,
        from: t.from?.toLowerCase(),
        to: t.to?.toLowerCase() ?? null,
        value: BigInt(t.value).toString(),
        nonce: Number(BigInt(t.nonce)),
        gas: Number(BigInt(t.gas)),
        gasPrice: BigInt(t.maxFeePerGas ?? t.gasPrice ?? 0).toString(),
        methodId: t.input?.length >= 10 ? t.input.slice(0, 10) : null,
      }));
      return { supported: true, transactions: txs };
    } catch {
      return { supported: false, transactions: [] };
    }
  });
}

export const traceEnabled = () => config.traceMode !== 'off';
