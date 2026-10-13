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
  if (new URL(req.url).searchParams.get('live')) return json({ status: 'ok' });
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
    timed('rpc', async () => ({ head: Number(await getClient().getBlockNumber()) })),
  ]);
  if (checks.database.ok) {
    await timed('indexer', async () => {
      const s = await IndexerState.findOne({ key: 'sync_state' }).lean();
      const lag = checks.rpc.ok && s ? checks.rpc.head - s.lastProcessedBlock : null;
      if (lag !== null && lag > MAX_LAG) throw new Error(`indexer is ${lag} blocks behind`);
      return { lastProcessedBlock: s?.lastProcessedBlock ?? null, lag, lastSyncedAt: s?.lastSyncedAt ?? null };
    });
  }
  const healthy = Object.values(checks).every((c) => c.ok);
  return json({ status: healthy ? 'ok' : 'degraded', checks, time: new Date().toISOString() }, { status: healthy ? 200 : 503 });
}
