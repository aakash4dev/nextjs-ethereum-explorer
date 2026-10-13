import { createPublicClient, fallback, http, numberToHex } from 'viem';
import config from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('rpc');

const cache = globalThis.__rpc ?? (globalThis.__rpc = { client: null, chainId: null, capabilities: {} });

/**
 * Shared viem public client. Requests are JSON-RPC batched, retried with
 * backoff, and fail over across every URL in ETHEREUM_RPC_URL /
 * ETHEREUM_RPC_FALLBACK_URLS.
 */
export function getClient() {
  if (cache.client) return cache.client;
  const transports = config.rpcUrls.map((url) =>
    http(url, {
      batch: { batchSize: config.rpcBatchSize, wait: 5 },
      retryCount: 3,
      retryDelay: 300,
      timeout: config.rpcTimeoutMs,
    }),
  );
  cache.client = createPublicClient({
    transport: transports.length > 1 ? fallback(transports, { rank: false }) : transports[0],
    cacheTime: 2_000,
  });
  return cache.client;
}

/** Raw JSON-RPC request through the shared client. */
export function rpc(method, params = []) {
  return getClient().request({ method, params });
}

export async function getChainId() {
  if (config.chainId) return config.chainId;
  if (cache.chainId) return cache.chainId;
  cache.chainId = await getClient().getChainId();
  return cache.chainId;
}

export const toHex = (n) => numberToHex(BigInt(n));

/**
 * Probe once whether the node supports a method (e.g. eth_getBlockReceipts,
 * debug_traceBlockByNumber). The result is cached for the process lifetime.
 */
export async function supports(method, probe) {
  if (method in cache.capabilities) return cache.capabilities[method];
  try {
    await probe();
    cache.capabilities[method] = true;
  } catch (err) {
    const msg = String(err?.details || err?.shortMessage || err?.message || err);
    // Only a "method not found / not supported" answer is conclusive. Anything
    // else (timeouts, rate limits) is retried on the next call.
    if (/not (found|supported|available|exist)|unsupported|-32601|does not exist|unknown method|not allowed|disabled/i.test(msg)) {
      cache.capabilities[method] = false;
      log.warn(`node does not support ${method}`, { reason: msg.slice(0, 200) });
    } else {
      throw err;
    }
  }
  return cache.capabilities[method];
}

export function resetCapabilities() {
  cache.capabilities = {};
}
