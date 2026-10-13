/**
 * Signature resolution: built-in dictionary → signatures learned from verified
 * contracts (MongoDB) → optional public lookup (openchain.xyz, 4byte.directory),
 * whose answers are cached in MongoDB.
 */
import { toEventSelector, toFunctionSelector } from 'viem';
import { formatAbiItem } from 'abitype';
import config from './config.js';
import { builtinSignatureTable } from './signatures-builtin.js';
import { Signature } from './models.js';
import { createLogger } from './logger.js';

const log = createLogger('signatures');
const missCache = globalThis.__sigMiss ?? (globalThis.__sigMiss = new Map());
const MISS_TTL_MS = 10 * 60 * 1000;

function prefix(type, sig) {
  return /^(function|event|error) /.test(sig) ? sig : `${type} ${sig}`;
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function remoteLookup(hash, type) {
  const kind = type === 'event' ? 'event' : 'function';
  const oc = await fetchJson(`https://api.openchain.xyz/signature-database/v1/lookup?${kind}=${hash}&filter=true`);
  const names = oc?.result?.[kind]?.[hash]?.map((r) => r.name).filter(Boolean);
  if (names?.length) return names;
  const path = type === 'event' ? 'event-signatures' : 'signatures';
  const fb = await fetchJson(`https://www.4byte.directory/api/v1/${path}/?hex_signature=${hash}&ordering=created_at`);
  return fb?.results?.map((r) => r.text_signature).filter(Boolean) ?? [];
}

/**
 * Resolve a 4-byte selector or 32-byte event topic to candidate human-readable
 * signatures, best candidate first.
 */
export async function lookupSignatures(hash, type = 'function') {
  if (!hash) return [];
  const key = hash.toLowerCase();
  const builtin = builtinSignatureTable().get(key);
  if (builtin?.length) return builtin.filter((s) => s.startsWith(type) || type !== 'event' && s.startsWith('error'));

  try {
    const rows = await Signature.find({ hash: key, type }).select({ signature: 1, source: 1 }).lean();
    if (rows.length) {
      rows.sort((a, b) => (a.source === 'verified' ? -1 : 0) - (b.source === 'verified' ? -1 : 0));
      return rows.map((r) => prefix(type, r.signature));
    }
  } catch (err) {
    log.debug('signature db lookup failed', { err });
  }

  if (!config.signatureLookup) return [];
  const missAt = missCache.get(key);
  if (missAt && Date.now() - missAt < MISS_TTL_MS) return [];

  const names = await remoteLookup(key, type);
  if (!names.length) {
    missCache.set(key, Date.now());
    return [];
  }
  try {
    await Signature.bulkWrite(
      names.slice(0, 5).map((signature) => ({
        updateOne: { filter: { hash: key, signature }, update: { $setOnInsert: { hash: key, signature, type, source: 'remote' } }, upsert: true },
      })),
      { ordered: false },
    );
  } catch {
    /* duplicate races are harmless */
  }
  return names.map((n) => prefix(type, n));
}

/** Persist every function/event/error signature from a verified ABI. */
export async function learnSignaturesFromAbi(abi) {
  const ops = [];
  for (const item of abi ?? []) {
    try {
      if (item.type === 'function' || item.type === 'error') {
        ops.push({ hash: toFunctionSelector(item), signature: formatAbiItem(item), type: item.type });
      } else if (item.type === 'event') {
        ops.push({ hash: toEventSelector(item), signature: formatAbiItem(item), type: 'event' });
      }
    } catch {
      /* skip malformed fragments */
    }
  }
  if (!ops.length) return 0;
  await Signature.bulkWrite(
    ops.map((o) => ({
      updateOne: {
        filter: { hash: o.hash, signature: o.signature },
        update: { $set: { source: 'verified', type: o.type }, $setOnInsert: { hash: o.hash, signature: o.signature } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return ops.length;
}

const nameOf = (sig) => sig.replace(/^(function|event|error) /, '').split('(')[0];

/**
 * Fast, local-only selector → method name resolution for list views (no
 * remote lookups). Unknown selectors map to the raw selector.
 */
export async function methodNames(selectors) {
  const unique = [...new Set(selectors.filter(Boolean).map((s) => s.toLowerCase()))];
  const out = {};
  const table = builtinSignatureTable();
  const missing = [];
  for (const s of unique) {
    const hit = table.get(s)?.find((x) => x.startsWith('function'));
    if (hit) out[s] = nameOf(hit);
    else missing.push(s);
  }
  if (missing.length) {
    try {
      const rows = await Signature.find({ hash: { $in: missing }, type: 'function' }).select({ hash: 1, signature: 1, source: 1 }).lean();
      rows.sort((a, b) => (a.source === 'verified' ? -1 : 1) - (b.source === 'verified' ? -1 : 1));
      for (const r of rows) out[r.hash] ??= nameOf(r.signature);
    } catch {
      /* best effort */
    }
  }
  return out;
}
