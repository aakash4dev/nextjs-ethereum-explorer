import { withApi, json, CACHE } from '@/lib/api';
import { getNetworkStats } from '@/lib/services/stats';
import { getSyncStatus } from '@/lib/indexer/index.js';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => {
  const [stats, indexer] = await Promise.all([getNetworkStats(), getSyncStatus().catch(() => null)]);
  return json({ ...stats, indexer }, { cache: CACHE.short });
});
