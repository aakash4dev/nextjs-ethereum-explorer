import { getClient, getChainId } from '../rpc.js';
import { Contract, Token } from '../models.js';
import { getLabel } from '../labels.js';

export const NO_ID = { _id: 0 };

const memo = globalThis.__svcMemo ?? (globalThis.__svcMemo = new Map());

/** Tiny in-process TTL cache with request coalescing. */
export async function cached(key, ttlMs, fn) {
  const hit = memo.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value;
  if (hit?.pending) return hit.pending;
  const pending = fn()
    .then((value) => {
      memo.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      memo.delete(key);
      throw err;
    });
  memo.set(key, { ...(hit ?? {}), pending, expires: hit?.expires ?? 0 });
  if (memo.size > 5000) memo.delete(memo.keys().next().value);
  return pending;
}

export async function getHead() {
  return cached('head', 2000, async () => Number(await getClient().getBlockNumber()));
}

export async function safeHead() {
  try {
    return await getHead();
  } catch {
    return null;
  }
}

export async function chainId() {
  return cached('chainId', 3600_000, () => getChainId()).catch(() => null);
}

/**
 * Attach display metadata (name tags, verified contract names, token info)
 * for a set of addresses in one round-trip each.
 */
export async function addressMeta(addresses) {
  const list = [...new Set(addresses.filter(Boolean).map((a) => a.toLowerCase()))];
  const meta = {};
  if (!list.length) return meta;
  const [cid, contracts, tokens] = await Promise.all([
    chainId(),
    Contract.find({ address: { $in: list } }).select({ address: 1, name: 1, _id: 0 }).lean(),
    Token.find({ address: { $in: list } }).select({ address: 1, name: 1, symbol: 1, type: 1, decimals: 1, _id: 0 }).lean(),
  ]);
  for (const a of list) {
    const label = getLabel(a, cid);
    if (label) meta[a] = { label };
  }
  for (const c of contracts) meta[c.address] = { ...(meta[c.address] ?? {}), verified: true, contractName: c.name };
  for (const t of tokens) {
    meta[t.address] = { ...(meta[t.address] ?? {}), token: { name: t.name, symbol: t.symbol, type: t.type, decimals: t.decimals } };
  }
  return meta;
}

export function paginate(total, page, limit) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** countDocuments with a time cap; large counts fall back to an estimate marker. */
export async function boundedCount(model, filter, cap = 500_000) {
  try {
    return await model.countDocuments(filter).limit(cap).maxTimeMS(3000);
  } catch {
    return cap;
  }
}
