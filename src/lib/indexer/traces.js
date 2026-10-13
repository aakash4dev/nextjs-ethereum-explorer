/**
 * Normalise execution traces from the two common node APIs into a flat list
 * of internal calls:
 *   - geth-style `debug_traceBlockByNumber` with `callTracer` (geth, reth, anvil, erigon)
 *   - parity-style `trace_block` (erigon, nethermind, reth, anvil)
 *
 * Output entries: { txHash, traceAddress, depth, type, callType, from, to,
 * value, gas, gasUsed, input, output, error }
 */

const hexToNum = (h) => (h === undefined || h === null ? null : Number(BigInt(h)));
const hexToDec = (h) => (h === undefined || h === null ? '0' : BigInt(h).toString());
const lower = (a) => (a ? a.toLowerCase() : null);

function flattenCallFrame(frame, txHash, path, out) {
  const type = String(frame.type || 'CALL').toUpperCase();
  const isCreate = type === 'CREATE' || type === 'CREATE2';
  const isSelfDestruct = type === 'SELFDESTRUCT' || type === 'SUICIDE';
  out.push({
    txHash,
    traceAddress: path.join('.'),
    depth: path.length,
    type: isCreate ? type.toLowerCase() : isSelfDestruct ? 'selfdestruct' : 'call',
    callType: isCreate || isSelfDestruct ? null : type.toLowerCase(),
    from: lower(frame.from),
    to: lower(frame.to),
    value: hexToDec(frame.value),
    gas: hexToNum(frame.gas),
    gasUsed: hexToNum(frame.gasUsed),
    input: frame.input ?? '0x',
    output: frame.output ?? null,
    error: frame.error ?? null,
    revertReason: frame.revertReason ?? null,
  });
  (frame.calls ?? []).forEach((child, i) => flattenCallFrame(child, txHash, [...path, i], out));
}

/** @param results `debug_traceBlockByNumber` result array; @param txHashes in block order */
export function normalizeCallTracer(results, txHashes) {
  const out = [];
  (results ?? []).forEach((entry, i) => {
    const frame = entry?.result ?? entry;
    const txHash = lower(entry?.txHash) ?? lower(txHashes?.[i]);
    if (!frame || !txHash || entry?.error) return;
    flattenCallFrame(frame, txHash, [], out);
  });
  return out;
}

export function normalizeCallFrame(frame, txHash) {
  const out = [];
  if (frame) flattenCallFrame(frame, lower(txHash), [], out);
  return out;
}

/** @param traces `trace_block` / `trace_transaction` result */
export function normalizeParity(traces) {
  const out = [];
  for (const t of traces ?? []) {
    if (!t?.transactionHash || t.type === 'reward') continue;
    const a = t.action ?? {};
    const r = t.result ?? {};
    const type = t.type === 'suicide' ? 'selfdestruct' : t.type === 'create' ? (a.creationMethod === 'create2' ? 'create2' : 'create') : 'call';
    out.push({
      txHash: lower(t.transactionHash),
      traceAddress: (t.traceAddress ?? []).join('.'),
      depth: (t.traceAddress ?? []).length,
      type,
      callType: type === 'call' ? (a.callType ?? 'call').toLowerCase() : null,
      from: lower(type === 'selfdestruct' ? a.address : a.from),
      to: lower(type === 'selfdestruct' ? a.refundAddress : type.startsWith('create') ? r.address : a.to),
      value: hexToDec(type === 'selfdestruct' ? a.balance : a.value),
      gas: hexToNum(a.gas),
      gasUsed: hexToNum(r.gasUsed),
      input: (type.startsWith('create') ? a.init : a.input) ?? '0x',
      output: (type.startsWith('create') ? r.code : r.output) ?? null,
      error: t.error ?? null,
      revertReason: null,
    });
  }
  return out;
}

/**
 * Internal transactions worth persisting: nested frames (depth >= 1) that move
 * value or create/destroy contracts. Full call trees are fetched on demand for
 * the transaction page.
 */
export function selectInternalTransactions(frames) {
  return frames.filter(
    (f) => f.depth >= 1 && (f.value !== '0' || f.type === 'create' || f.type === 'create2' || f.type === 'selfdestruct'),
  );
}

/** Build a nested tree from a flat, ordered frame list (for UI rendering). */
export function buildCallTree(frames) {
  const byPath = new Map();
  let root = null;
  for (const f of frames) {
    const node = { ...f, calls: [] };
    byPath.set(f.traceAddress, node);
    if (f.depth === 0) root = node;
    else {
      const parent = byPath.get(f.traceAddress.split('.').slice(0, -1).join('.'));
      parent?.calls.push(node);
    }
  }
  return root;
}
