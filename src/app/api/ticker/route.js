import { withApi, json } from '@/lib/api';
import { getGasOracle } from '@/lib/services/gas';
import { getNativePrice } from '@/lib/services/market';

export const dynamic = 'force-dynamic';

/** GET /api/ticker — tiny payload for the header: standard gas price and native price. */
export const GET = withApi(async () => {
  const [gas, price] = await Promise.all([getGasOracle().catch(() => null), getNativePrice().catch(() => null)]);
  return json({ gasPrice: gas?.standard?.gasPrice ?? null, price }, { cache: 'public, max-age=10, s-maxage=10' });
}, { db: false });
