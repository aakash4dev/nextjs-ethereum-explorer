import { json } from '@/lib/api';
import { dbPing } from '@/lib/db';
import { getClient } from '@/lib/rpc';
import { IndexerState } from '@/lib/models';

export const dynamic = 'force-dynamic';

const MAX_LAG = Number.parseInt(process.env.HEALTH_MAX_BLOCK_LAG || '50', 10);

/**
 * GET /api/health — liveness/readiness for load balancers and uptime checks.
 * 200 when MongoDB and the RPC answer and the indexer lag is within
 * HEALTH_MAX_BLOCK_LAG; 503 otherwise. Add ?live=1 for a plain liveness probe.
 */
export async function GET(req) {
  const headers = process.env.NODE_ENV === 'development' && process.env.DEVNET_INSTANCE_ID ? { 'x-devnet-instance': process.env.DEVNET_INSTANCE_ID } : {};
  if (new URL(req.url).searchParams.get('live')) return json({ status: 'ok' }, { headers });
  const checks = {};
  const timed = async (name, fn) => {
    const t = Date.now();
    try {
      checks[name] = { ok: true, ...(await fn()), ms: Date.now() - t };
    } catch (err) {
      checks[name] = { ok: false, error: String(err?.shortMessage ?? err?.message ?? err).slice(0, 200), ms: Date.now() - t };
    }
  };
  await Promise.all([
    timed('database', async () => ({ pingMs: await dbPing() })),
    timed('rpc', async () => ({ head: Number(await getClient().getBlockNumber({ cacheTime: 0 })) })),
  ]);
  if (checks.database.ok) {
    await timed('indexer', async () => {
      const s = await IndexerState.findOne({ key: 'sync_state' }).lean();
      if (!Number.isSafeInteger(s?.lastProcessedBlock) || s.lastProcessedBlock < 0) throw new Error('indexer has not completed its first block');
      // RPC and database reads are not an atomic snapshot: a new block can be
      // indexed between them. Do not fail readiness on that harmless race.
      const lag = checks.rpc.ok ? Math.max(0, checks.rpc.head - s.lastProcessedBlock) : null;
      if (lag !== null && lag > MAX_LAG) throw new Error(`indexer is ${lag} blocks behind`);
      return { lastProcessedBlock: s?.lastProcessedBlock ?? null, lag, lastSyncedAt: s?.lastSyncedAt ?? null };
    });
  }
  const healthy = Object.values(checks).every((c) => c.ok);
  return json({ status: healthy ? 'ok' : 'degraded', checks, time: new Date().toISOString() }, { status: healthy ? 200 : 503, headers });
}
