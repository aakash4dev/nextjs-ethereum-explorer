import { withApi, json, CACHE } from '@/lib/api';
import { getParam, parseBlockNumber, parsePagination } from '@/lib/validation';
import { listInternalTransactions } from '@/lib/services/transactions';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  const block = getParam(sp, 'block') ? parseBlockNumber(getParam(sp, 'block')) : undefined;
  return json(await listInternalTransactions({ ...parsePagination(sp), block }), { cache: CACHE.short });
});
