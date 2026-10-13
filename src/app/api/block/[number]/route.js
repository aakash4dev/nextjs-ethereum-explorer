import { withApi, json, CACHE } from '@/lib/api';
import { HttpError, isHash, parseBlockNumber, parsePagination } from '@/lib/validation';
import { getBlock, getBlockTransactions, getBlockWithdrawals } from '@/lib/services/blocks';

export const dynamic = 'force-dynamic';

/** GET /api/block/:numberOrHash */
export const GET = withApi(async (req, { params }) => {
  const id = isHash(params.number) ? params.number.toLowerCase() : parseBlockNumber(params.number);
  const data = await getBlock(id);
  if (!data) throw new HttpError(404, 'Block not found');
  const { page, limit } = parsePagination(new URL(req.url).searchParams, { defaultLimit: 50 });
  const [txs, withdrawals] = data.source === 'db'
    ? await Promise.all([getBlockTransactions(data.block.number, { page, limit }), getBlockWithdrawals(data.block.number)])
    : [{ transactions: data.rpcTransactions, pagination: null }, []];
  const deep = data.confirmations !== null && data.confirmations > 64;
  return json(
    { block: data.block, source: data.source, confirmations: data.confirmations, navigation: data.navigation, transactions: txs.transactions, pagination: txs.pagination, withdrawals },
    { cache: deep ? CACHE.long : CACHE.short },
  );
});
