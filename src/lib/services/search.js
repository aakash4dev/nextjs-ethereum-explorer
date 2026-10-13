import { Block, Contract, Token, Transaction } from '../models.js';
import { searchLabels } from '../labels.js';
import { isAddress, isHash } from '../validation.js';
import { rpc } from '../rpc.js';
import { chainId } from './common.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Classify a query and return where it should go. A 32-byte hash can be a
 * transaction or a block hash, so both are checked (DB first, then node).
 */
export async function resolveQuery(raw) {
  const q = String(raw ?? '').trim();
  if (!q) return null;
  if (/^\d{1,12}$/.test(q.replace(/,/g, ''))) return { type: 'block', path: `/block/${q.replace(/,/g, '')}` };
  if (isAddress(q)) {
    const token = await Token.exists({ address: q.toLowerCase() });
    return { type: token ? 'token' : 'address', path: token ? `/token/${q}` : `/address/${q}` };
  }
  if (isHash(q)) {
    const h = q.toLowerCase();
    if (await Transaction.exists({ hash: h })) return { type: 'transaction', path: `/tx/${h}` };
    if (await Block.exists({ hash: h })) return { type: 'block', path: `/block/${h}` };
    const tx = await rpc('eth_getTransactionByHash', [h]).catch(() => null);
    if (tx) return { type: 'transaction', path: `/tx/${h}` };
    const block = await rpc('eth_getBlockByHash', [h, false]).catch(() => null);
    if (block) return { type: 'block', path: `/block/${h}` };
    return { type: 'transaction', path: `/tx/${h}` };
  }
  return null;
}

/** Autocomplete suggestions: tokens, verified contracts, name tags. */
export async function suggest(raw, limit = 8) {
  const q = String(raw ?? '').trim();
  if (q.length < 2) return [];
  const direct = await resolveQuery(q);
  if (direct) return [{ kind: direct.type, title: q, path: direct.path }];
  const re = { $regex: `^${escapeRe(q)}`, $options: 'i' };
  const [tokens, contracts, cid] = await Promise.all([
    Token.find({ $or: [{ symbol: re }, { name: re }] }).sort({ holdersCount: -1 }).limit(limit).select({ address: 1, name: 1, symbol: 1, type: 1, _id: 0 }).lean(),
    Contract.find({ name: re }).limit(4).select({ address: 1, name: 1, _id: 0 }).lean(),
    chainId(),
  ]);
  return [
    ...tokens.map((t) => ({ kind: 'token', title: `${t.name ?? 'Unnamed'} (${t.symbol ?? '?'})`, subtitle: t.address, badge: t.type, path: `/token/${t.address}` })),
    ...contracts.map((c) => ({ kind: 'contract', title: c.name, subtitle: c.address, badge: 'Verified', path: `/address/${c.address}` })),
    ...searchLabels(q, cid, 4).map((l) => ({ kind: 'label', title: l.name, subtitle: l.address, path: `/address/${l.address}` })),
  ].slice(0, limit);
}
