import { withApi, json, CACHE } from '@/lib/api';
import { normalizeAddress, parsePagination } from '@/lib/validation';
import { getTokenInventory } from '@/lib/services/tokens';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req, { params }) => {
  return json(await getTokenInventory(normalizeAddress(params.address), parsePagination(new URL(req.url).searchParams, { defaultLimit: 24 })), { cache: CACHE.medium });
});
