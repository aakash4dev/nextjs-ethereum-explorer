import { withApi, json, CACHE } from '@/lib/api';
import { getGasEstimates, getGasGuzzlers, getGasOracle, getGasSpenders } from '@/lib/services/gas';
import { getNativePrice } from '@/lib/services/market';

export const dynamic = 'force-dynamic';

/** GET /api/gas — oracle tiers, base fee history, cost estimates, guzzlers. */
export const GET = withApi(async () => {
  const oracle = await getGasOracle();
  const [estimates, guzzlers, spenders, price] = await Promise.all([getGasEstimates(oracle), getGasGuzzlers(), getGasSpenders(), getNativePrice()]);
  return json({ ...oracle, estimates, guzzlers, spenders, price }, { cache: CACHE.short });
});
