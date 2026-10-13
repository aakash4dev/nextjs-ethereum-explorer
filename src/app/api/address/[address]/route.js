import { withApi, json, CACHE } from '@/lib/api';
import { normalizeAddress, parsePagination } from '@/lib/validation';
import { getAddressOverview } from '@/lib/services/addresses';
import { listTransactions } from '@/lib/services/transactions';

export const dynamic = 'force-dynamic';

/** GET /api/address/:address — overview plus the first page of transactions. */
export const GET = withApi(async (req, { params }) => {
  const address = normalizeAddress(params.address);
  const { page, limit } = parsePagination(new URL(req.url).searchParams);
  const [overview, txs] = await Promise.all([getAddressOverview(address), listTransactions({ page, limit, address })]);
  return json({ address: overview, transactions: txs.transactions, pagination: txs.pagination }, { cache: CACHE.short });
});
