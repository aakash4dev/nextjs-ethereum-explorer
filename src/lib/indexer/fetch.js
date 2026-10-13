import config from '../config.js';
import { rpc, supports, toHex } from '../rpc.js';
import { createLogger } from '../logger.js';
import { normalizeCallTracer, normalizeParity } from './traces.js';

const log = createLogger('fetch');

export async function getHeadNumber() {
  return Number(BigInt(await rpc('eth_blockNumber')));
}

export async function getRawBlock(number, full = true) {
  return rpc('eth_getBlockByNumber', [toHex(number), full]);
}

async function getReceipts(block) {
  const tag = block.number;
  const canBatch = await supports('eth_getBlockReceipts', () => rpc('eth_getBlockReceipts', [tag]));
  if (canBatch) {
    const receipts = await rpc('eth_getBlockReceipts', [tag]);
    if (Array.isArray(receipts) && receipts.length === block.transactions.length) return receipts;
  }
  // Fallback: one receipt per transaction; the transport batches these.
  return Promise.all(block.transactions.map((tx) => rpc('eth_getTransactionReceipt', [tx.hash])));
}

let resolvedTraceMode = null;

/** Resolve TRACE_MODE=auto into the first trace API the node supports. */
export async function resolveTraceMode() {
  if (resolvedTraceMode) return resolvedTraceMode;
  const wanted = config.traceMode;
  if (wanted !== 'auto') return (resolvedTraceMode = wanted);
  try {
    // Probe a recent block: some clients refuse to trace genesis.
    if (await supports('debug_traceBlockByNumber', () => rpc('debug_traceBlockByNumber', ['latest', { tracer: 'callTracer', timeout: '30s' }]))) {
      return (resolvedTraceMode = 'callTracer');
    }
    if (await supports('trace_block', () => rpc('trace_block', ['latest']))) return (resolvedTraceMode = 'parity');
  } catch (err) {
    log.warn('trace capability probe failed; internal transactions disabled for now', { err });
    return 'off';
  }
  return (resolvedTraceMode = 'off');
}

async function getTraces(block, mode) {
  if (mode === 'off' || !block.transactions.length) return mode === 'off' ? null : [];
  try {
    if (mode === 'callTracer') {
      const res = await rpc('debug_traceBlockByNumber', [block.number, { tracer: 'callTracer', timeout: '60s' }]);
      return normalizeCallTracer(res, block.transactions.map((t) => t.hash));
    }
    if (mode === 'parity') return normalizeParity(await rpc('trace_block', [block.number]));
  } catch (err) {
    log.warn('trace fetch failed; block indexed without internal transactions', { block: Number(block.number), err });
  }
  return null;
}

/** Fetch everything the transformer needs for one block. */
export async function fetchBlockBundle(number, traceMode) {
  const block = await getRawBlock(number, true);
  if (!block) return null;
  const [receipts, frames] = await Promise.all([getReceipts(block), getTraces(block, traceMode)]);
  if (receipts.some((r) => !r)) throw new Error(`receipts not yet available for block ${number}`);
  return { block, receipts, frames };
}
