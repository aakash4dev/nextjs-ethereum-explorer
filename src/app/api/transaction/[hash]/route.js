import { withApi, json, CACHE } from '@/lib/api';
import { HttpError, normalizeHash } from '@/lib/validation';
import { getTransaction } from '@/lib/services/transactions';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (_req, { params }) => {
  const data = await getTransaction(normalizeHash(params.hash, 'transaction hash'));
  if (!data) throw new HttpError(404, 'Transaction not found');
  const deep = data.confirmations !== null && data.confirmations > 64;
  return json(data, { cache: deep ? CACHE.long : CACHE.short });
});
