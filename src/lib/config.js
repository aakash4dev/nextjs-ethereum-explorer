/**
 * Centralised, validated runtime configuration.
 *
 * Every module reads settings from here instead of touching process.env
 * directly, so defaults and parsing rules live in one place. Values are read
 * lazily (getters) because the worker loads .env after module evaluation in
 * some entry points, and because `next build` must not fail when secrets are
 * absent.
 */

function str(name, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v.trim();
}

function int(name, fallback, { min = -Infinity, max = Infinity } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function list(name) {
  return str(name)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  get rpcUrls() {
    const urls = [...list('ETHEREUM_RPC_URL'), ...list('ETHEREUM_RPC_FALLBACK_URLS')];
    return urls.length ? [...new Set(urls)] : ['http://127.0.0.1:8545'];
  },
  get rpcTimeoutMs() {
    return int('RPC_TIMEOUT_MS', 20_000, { min: 1000 });
  },
  get rpcBatchSize() {
    return int('RPC_BATCH_SIZE', 50, { min: 1, max: 1000 });
  },
  get mongoUri() {
    return str('MONGODB_URI');
  },
  get chainId() {
    const v = int('CHAIN_ID', 0);
    return v > 0 ? v : null;
  },
  get chainName() {
    return str('NEXT_PUBLIC_CHAIN_NAME', str('CHAIN_NAME', 'Ethereum'));
  },
  get nativeSymbol() {
    return str('NEXT_PUBLIC_NATIVE_SYMBOL', str('NATIVE_SYMBOL', 'ETH'));
  },
  get siteUrl() {
    return str('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000').replace(/\/$/, '');
  },

  // Indexer
  get startBlock() {
    return int('START_BLOCK', 0, { min: 0 });
  },
  get batchSize() {
    return int('INDEXER_BATCH_SIZE', 10, { min: 1, max: 1000 });
  },
  get fetchConcurrency() {
    return int('INDEXER_CONCURRENCY', 4, { min: 1, max: 64 });
  },
  get syncIntervalMs() {
    return int('SYNC_INTERVAL', 5000, { min: 250 });
  },
  get confirmations() {
    return int('INDEXER_CONFIRMATIONS', 0, { min: 0, max: 1000 });
  },
  get maxReorgDepth() {
    return int('INDEXER_MAX_REORG_DEPTH', 64, { min: 1, max: 10_000 });
  },
  /** auto | callTracer | parity | off */
  get traceMode() {
    const v = str('TRACE_MODE', 'auto');
    return ['auto', 'callTracer', 'parity', 'off'].includes(v) ? v : 'auto';
  },
  get trackBalances() {
    return bool('TRACK_BALANCES', true);
  },
  get trackTokenBalances() {
    return bool('TRACK_TOKEN_BALANCES', true);
  },
  get statsIntervalMs() {
    return int('STATS_INTERVAL', 60_000, { min: 5000 });
  },
  get lockTtlMs() {
    return int('INDEXER_LOCK_TTL_MS', 120_000, { min: 10_000 });
  },

  // HTTP / security
  get adminApiKey() {
    return str('ADMIN_API_KEY');
  },
  get rateLimitPerMinute() {
    return int('API_RATE_LIMIT_PER_MINUTE', 120, { min: 0 });
  },
  get trustProxy() {
    return bool('TRUST_PROXY', true);
  },
  get maxPageSize() {
    return int('API_MAX_PAGE_SIZE', 100, { min: 10, max: 10_000 });
  },
  get maxResultWindow() {
    return int('API_MAX_RESULT_WINDOW', 10_000, { min: 100 });
  },

  // External services
  get priceProvider() {
    return str('PRICE_PROVIDER', 'coingecko');
  },
  get priceCoinId() {
    return str('PRICE_COIN_ID', 'ethereum');
  },
  get signatureLookup() {
    return bool('SIGNATURE_LOOKUP', true);
  },
  get solcCacheDir() {
    return str('SOLC_CACHE_DIR', '.solc-cache');
  },
  get solcBinariesUrl() {
    return str('SOLC_BINARIES_URL', 'https://binaries.soliditylang.org/bin').replace(/\/$/, '');
  },
  get logLevel() {
    return str('LOG_LEVEL', process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  },
};

export default config;
