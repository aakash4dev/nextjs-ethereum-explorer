import { withApi, json, CACHE } from '@/lib/api';
import { getParam, normalizeAddress, parseBlockNumber, parsePagination } from '@/lib/validation';
import { listTransactions } from '@/lib/services/transactions';

export const dynamic = 'force-dynamic';

/** GET /api/transactions?page=&limit=&address=&block= */
export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  const { page, limit } = parsePagination(sp);
  const address = getParam(sp, 'address') ? normalizeAddress(getParam(sp, 'address')) : undefined;
  const blockRaw = getParam(sp, 'block') ?? getParam(sp, 'blockNumber');
  const block = blockRaw ? parseBlockNumber(blockRaw) : undefined;
  return json(await listTransactions({ page, limit, address, block }), { cache: CACHE.short });
});
