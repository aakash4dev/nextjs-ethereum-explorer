import { withApi, json, CACHE } from '@/lib/api';
import { HttpError, normalizeAddress, parsePagination } from '@/lib/validation';
import { getTokenHolders } from '@/lib/services/tokens';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req, { params }) => {
  const data = await getTokenHolders(normalizeAddress(params.address), parsePagination(new URL(req.url).searchParams));
  if (!data) throw new HttpError(404, 'Token not found');
  return json(data, { cache: CACHE.medium });
});
