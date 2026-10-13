/**
 * Block indexer.
 *
 *  - Fetches blocks concurrently (INDEXER_CONCURRENCY) and commits them in order.
 *  - Detects chain reorganisations via parentHash linkage, rolls back to the
 *    common ancestor and re-indexes.
 *  - Uses a lease-based lock in MongoDB so that only one worker indexes at a
 *    time and a crashed worker never leaves the indexer stuck.
 *  - Never skips a block: a failure stops the batch at the last contiguous
 *    block and the next cycle retries.
 */
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import config from '../config.js';
import { dbConnect } from '../db.js';
import { Block, IndexerState, SCHEMA_VERSION } from '../models.js';
import { createLogger } from '../logger.js';
import { fetchBlockBundle, getHeadNumber, getRawBlock, resolveTraceMode } from './fetch.js';
import { transformBlock } from './transform.js';
import { persistBatch, rollbackAbove } from './persist.js';
import { enrichBatch, refreshNftOwners, refreshTokenBalances, refreshHolderCounts } from './enrich.js';
import { refreshDailyStats } from './stats.js';

const log = createLogger('indexer');
const STATE_KEY = 'sync_state';
const OWNER = `${os.hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error }),
      );
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function ensureState() {
  await IndexerState.updateOne(
    { key: STATE_KEY },
    { $setOnInsert: { key: STATE_KEY, lastProcessedBlock: config.startBlock - 1, schemaVersion: SCHEMA_VERSION } },
    { upsert: true },
  );
  return IndexerState.findOne({ key: STATE_KEY }).lean();
}

export async function acquireLock(owner = OWNER) {
  const now = new Date();
  return IndexerState.findOneAndUpdate(
    { key: STATE_KEY, $or: [{ lockOwner: null }, { lockExpiresAt: { $lt: now } }, { lockOwner: owner }] },
    { $set: { lockOwner: owner, lockExpiresAt: new Date(now.getTime() + config.lockTtlMs) } },
    { new: true },
  ).lean();
}

export async function releaseLock(owner = OWNER) {
  await IndexerState.updateOne({ key: STATE_KEY, lockOwner: owner }, { $set: { lockOwner: null, lockExpiresAt: null } });
}

async function setState(update) {
  await IndexerState.updateOne({ key: STATE_KEY }, { $set: update });
}

/** Walk back from `from` until the stored hash matches the canonical chain. */
async function findCommonAncestor(from) {
  const floor = Math.max(config.startBlock - 1, from - config.maxReorgDepth);
  for (let n = from; n > floor; n--) {
    const stored = await Block.findOne({ number: n }).select({ hash: 1 }).lean();
    if (!stored) continue;
    const canonical = await getRawBlock(n, false);
    if (canonical && canonical.hash.toLowerCase() === stored.hash) return n;
  }
  return floor;
}

async function handleReorg(lastProcessed) {
  const ancestor = await findCommonAncestor(lastProcessed);
  log.warn('chain reorganisation detected; rolling back', { from: lastProcessed, to: ancestor, depth: lastProcessed - ancestor });
  const orphans = await rollbackAbove(ancestor);
  await IndexerState.updateOne(
    { key: STATE_KEY },
    { $set: { lastProcessedBlock: ancestor, lastReorgAt: new Date() }, $inc: { reorgCount: 1 } },
  );
  // Token state touched by orphaned blocks must be re-read from the canonical chain.
  try {
    if (ancestor >= 0 && orphans.length) {
      const pairs = orphans.flatMap((t) => [
        { token: t.token, holder: t.from, tokenId: t.tokenId, tokenType: t.tokenType },
        { token: t.token, holder: t.to, tokenId: t.tokenId, tokenType: t.tokenType },
      ]);
      if (config.trackTokenBalances) {
        await refreshTokenBalances(pairs, ancestor);
        await refreshHolderCounts([...new Set(orphans.map((t) => t.token))]);
      }
      const nfts = orphans.filter((t) => t.tokenType === 'ERC721').map((t) => ({ token: t.token, tokenId: t.tokenId }));
      await refreshNftOwners(nfts, ancestor);
    }
  } catch (err) {
    log.warn('post-reorg refresh failed', { err });
  }
  return ancestor;
}

/**
 * Index one batch. Returns a summary. Safe to call concurrently from multiple
 * processes: only the lock holder does work.
 */
export async function runIndexer({ maxBlocks = config.batchSize } = {}) {
  await dbConnect();
  let state = await ensureState();
  if (state.schemaVersion && state.schemaVersion < SCHEMA_VERSION) {
    throw new Error(`Database schema v${state.schemaVersion} is older than v${SCHEMA_VERSION}. Run "npm run reset-db" and re-index.`);
  }

  const locked = await acquireLock();
  if (!locked) return { status: 'locked', message: 'Another indexer instance holds the lock' };
  state = locked;

  const started = Date.now();
  try {
    const traceMode = await resolveTraceMode();
    const head = await getHeadNumber();
    const target = head - config.confirmations;
    let last = Math.max(state.lastProcessedBlock, config.startBlock - 1);
    if (last !== state.lastProcessedBlock) await setState({ lastProcessedBlock: last });

    if (last >= target) {
      // Chain head moved backwards (node resync / deep reorg on a dev chain).
      if (last > head) last = await handleReorg(Math.min(last, head));
      await setState({ headBlock: head, lastSyncedAt: new Date(), syncError: null, traceMode });
      return { status: 'synced', head, lastProcessedBlock: last };
    }

    const from = last + 1;
    const to = Math.min(target, last + maxBlocks);
    const numbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const fetched = await mapLimit(numbers, config.fetchConcurrency, (n) => fetchBlockBundle(n, traceMode));

    // Keep the contiguous successful prefix.
    const bundles = [];
    let failure = null;
    for (let i = 0; i < fetched.length; i++) {
      if (!fetched[i].ok || !fetched[i].value) {
        failure = fetched[i].error ?? new Error(`block ${numbers[i]} not available yet`);
        break;
      }
      bundles.push(fetched[i].value);
    }

    // Reorg check against the stored parent, then linkage inside the batch.
    if (bundles.length && last >= 0) {
      const parent = await Block.findOne({ number: last }).select({ hash: 1 }).lean();
      if (parent && parent.hash !== bundles[0].block.parentHash.toLowerCase()) {
        const ancestor = await handleReorg(last);
        return { status: 'reorg', rolledBackTo: ancestor };
      }
    }
    let linked = bundles.length;
    for (let i = 1; i < bundles.length; i++) {
      if (bundles[i].block.parentHash.toLowerCase() !== bundles[i - 1].block.hash.toLowerCase()) {
        linked = i; // the chain changed while we were fetching; stop here
        break;
      }
    }

    const transformed = bundles.slice(0, linked).map((b) => transformBlock(b.block, b.receipts, b.frames));
    if (!transformed.length) {
      if (failure) throw failure;
      return { status: 'idle', head, lastProcessedBlock: last };
    }

    await persistBatch(transformed);
    const newLast = transformed[transformed.length - 1].block.number;
    await setState({
      lastProcessedBlock: newLast,
      headBlock: head,
      lastSyncedAt: new Date(),
      lastBatchMs: Date.now() - started,
      syncError: failure ? String(failure.message ?? failure).slice(0, 500) : null,
      traceMode,
      lockExpiresAt: new Date(Date.now() + config.lockTtlMs),
    });

    await enrichBatch(transformed, { trackBalances: config.trackBalances, trackTokenBalances: config.trackTokenBalances });

    const txCount = transformed.reduce((s, b) => s + b.transactions.length, 0);
    log.info('indexed batch', { from, to: newLast, blocks: transformed.length, txs: txCount, head, behind: head - newLast, ms: Date.now() - started });
    return { status: 'indexed', from, to: newLast, blocks: transformed.length, transactions: txCount, head, behind: head - newLast };
  } catch (err) {
    await setState({ syncError: String(err?.shortMessage ?? err?.message ?? err).slice(0, 500), lastSyncedAt: new Date() });
    throw err;
  } finally {
    await releaseLock();
  }
}

let stopping = false;
export function stopContinuousSync() {
  stopping = true;
}

/** Long-running sync loop used by `npm run sync` (the worker process). */
export async function startContinuousSync() {
  log.info('continuous sync started', { owner: OWNER, rpc: config.rpcUrls.map((u) => u.replace(/\/\/([^@/]*@)?([^/]+).*/, '//$2')), startBlock: config.startBlock });
  let lastStats = 0;
  let backoff = 1000;
  while (!stopping) {
    let result;
    try {
      result = await runIndexer();
      backoff = 1000;
    } catch (err) {
      log.error('sync cycle failed', { err });
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60_000);
      continue;
    }

    if (Date.now() - lastStats > config.statsIntervalMs) {
      try {
        const days = await refreshDailyStats();
        await setState({ lastStatsAt: new Date() });
        log.debug('daily stats refreshed', { days });
      } catch (err) {
        log.warn('daily stats refresh failed', { err });
      }
      lastStats = Date.now();
    }

    // Catching up: loop immediately. At the head: wait for the next block.
    const caughtUp = !result || result.status !== 'indexed' || result.behind <= 0;
    if (caughtUp && !stopping) await sleep(config.syncIntervalMs);
  }
  log.info('continuous sync stopped');
}

export async function getSyncStatus() {
  await dbConnect();
  const state = await ensureState();
  let head = state.headBlock;
  try {
    head = await getHeadNumber();
  } catch {
    /* fall back to last observed head */
  }
  const behind = head === null || head === undefined ? null : Math.max(0, head - state.lastProcessedBlock);
  const span = head - (config.startBlock - 1);
  return {
    lastProcessedBlock: state.lastProcessedBlock,
    headBlock: head,
    blocksBehind: behind,
    syncProgress: span > 0 ? Math.min(100, ((state.lastProcessedBlock - config.startBlock + 1) / span) * 100) : 100,
    isSyncing: Boolean(state.lockOwner && state.lockExpiresAt && new Date(state.lockExpiresAt) > new Date()),
    lastSyncedAt: state.lastSyncedAt ?? null,
    lastBatchMs: state.lastBatchMs ?? null,
    syncError: state.syncError ?? null,
    traceMode: state.traceMode ?? null,
    reorgCount: state.reorgCount ?? 0,
    lastReorgAt: state.lastReorgAt ?? null,
    lastStatsAt: state.lastStatsAt ?? null,
    startBlock: config.startBlock,
    confirmations: config.confirmations,
  };
}
