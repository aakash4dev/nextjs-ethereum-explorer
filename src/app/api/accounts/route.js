import { withApi, json, CACHE } from '@/lib/api';
import { parsePagination } from '@/lib/validation';
import { getTopAccounts } from '@/lib/services/addresses';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req) => json(await getTopAccounts(parsePagination(new URL(req.url).searchParams)), { cache: CACHE.medium }));
