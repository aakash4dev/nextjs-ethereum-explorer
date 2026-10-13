import { withApi, json, CACHE } from '@/lib/api';
import { getParam, normalizeAddress, parsePagination } from '@/lib/validation';
import { listTokenTransfers } from '@/lib/services/tokens';

export const dynamic = 'force-dynamic';

/** GET /api/token/:address/transfers?a=<holder>&tokenId= */
export const GET = withApi(async (req, { params }) => {
  const sp = new URL(req.url).searchParams;
  const holder = getParam(sp, 'a') ? normalizeAddress(getParam(sp, 'a')) : undefined;
  const tokenId = getParam(sp, 'tokenId') ?? undefined;
  return json(await listTokenTransfers({ ...parsePagination(sp), token: normalizeAddress(params.address), address: holder, tokenId }), { cache: CACHE.short });
});
