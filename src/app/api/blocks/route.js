import { withApi, json, CACHE } from '@/lib/api';
import { parsePagination } from '@/lib/validation';
import { listBlocks } from '@/lib/services/blocks';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req) => {
  const { page, limit } = parsePagination(new URL(req.url).searchParams);
  return json(await listBlocks({ page, limit }), { cache: CACHE.short });
});
