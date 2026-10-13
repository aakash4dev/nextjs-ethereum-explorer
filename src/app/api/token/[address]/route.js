import { withApi, json, CACHE } from '@/lib/api';
import { HttpError, normalizeAddress } from '@/lib/validation';
import { getToken } from '@/lib/services/tokens';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (_req, { params }) => {
  const token = await getToken(normalizeAddress(params.address));
  if (!token) throw new HttpError(404, 'Token not found');
  return json(token, { cache: CACHE.medium });
});
