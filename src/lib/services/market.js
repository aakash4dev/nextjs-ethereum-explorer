import config from '../config.js';
import { createLogger } from '../logger.js';
import { cached } from './common.js';

const log = createLogger('market');

/**
 * Native coin price (USD) from CoinGecko, cached for 60s. Returns null when
 * disabled (PRICE_PROVIDER=off, e.g. testnets) or unavailable; the UI then
 * hides fiat values instead of showing zeros.
 */
export async function getNativePrice() {
  if (config.priceProvider !== 'coingecko') return null;
  return cached('price', 60_000, async () => {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(config.priceCoinId)}&vs_currencies=usd,btc&include_market_cap=true&include_24hr_change=true`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json())?.[config.priceCoinId];
      if (!data?.usd) return null;
      return { usd: data.usd, btc: data.btc ?? null, marketCap: data.usd_market_cap ?? null, change24h: data.usd_24h_change ?? null, updatedAt: new Date().toISOString() };
    } catch (err) {
      log.debug('price unavailable', { err: err.message });
      return null;
    }
  });
}
