import { withApi, json, CACHE } from '@/lib/api';
import { getParam, parsePagination } from '@/lib/validation';
import { listVerifiedContracts } from '@/lib/services/contracts';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  return json(await listVerifiedContracts({ ...parsePagination(sp), q: getParam(sp, 'q')?.slice(0, 64) }), { cache: CACHE.medium });
});
