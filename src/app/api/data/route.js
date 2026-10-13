import { withApi, json, CACHE } from '@/lib/api';
import { latestBlocks } from '@/lib/services/blocks';
import { latestTransactions } from '@/lib/services/transactions';

export const dynamic = 'force-dynamic';

/** GET /api/data — latest blocks and transactions (home page feed). */
export const GET = withApi(async (req) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(new URL(req.url).searchParams.get('limit') ?? '10', 10) || 10));
  const [blocks, transactions] = await Promise.all([latestBlocks(limit), latestTransactions(limit)]);
  return json({ blocks, transactions }, { cache: CACHE.short });
});
