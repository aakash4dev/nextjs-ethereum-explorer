#!/usr/bin/env node
/**
 * Probe JSON-RPC endpoints for the capabilities this indexer actually needs,
 * and report which answer with no API key or authentication.
 *
 *   npm run check-rpc                  # the built-in public candidate list
 *   npm run check-rpc -- --env         # whatever .env currently points at
 *   npm run check-rpc -- https://my-rpc
 */
const DEFAULTS = [
  'https://eth.drpc.org',
  'https://eth.merkle.io',
  'https://api.zan.top/eth-mainnet',
  'https://eth-mainnet.public.blastapi.io',
  'https://ethereum.public.blockpi.network/v1/rpc/public',
  'https://0xrpc.io/eth',
  'https://eth.meowrpc.com',
  'https://public.1rpc.io/eth',
  'https://ethereum-json-rpc.stakely.io',
  'https://rpc.eth.gateway.fm',
  'https://eth.api.onfinality.io/public',
];

const args = process.argv.slice(2);

/** --env probes the endpoints this deployment is actually configured to use. */
async function fromEnv() {
  try {
    await import('./load-env.js');
  } catch (err) {
    console.error(`--env needs the project dependencies installed (npm install): ${err.message}`);
    process.exit(1);
  }
  const { default: config } = await import('../src/lib/config.js');
  const urls = config.rpcUrls;
  // config.js falls back to a local node when nothing is configured.
  if (urls.length === 1 && urls[0] === 'http://127.0.0.1:8545' && !process.env.ETHEREUM_RPC_URL) {
    console.error('ETHEREUM_RPC_URL is not set in .env — config.js is defaulting to http://127.0.0.1:8545');
  }
  return urls;
}

const urls = args.includes('--env')
  ? await fromEnv()
  : (args.length ? args : DEFAULTS);
const TIMEOUT_MS = 20_000;
const rpc = (method, params = [], id = 1) => ({ jsonrpc: '2.0', id, method, params });

/**
 * Undici reports almost everything as "fetch failed"; the actionable code
 * (ENOTFOUND, ECONNREFUSED, ETIMEDOUT, cert errors) is nested in err.cause,
 * and Happy-Eyeballs failures arrive as an AggregateError of several causes.
 */
function causeOf(err) {
  if (err.name === 'AbortError') return 'timeout';
  const seen = new Set();
  let deepest = err.message;
  let e = err;
  while (e && !seen.has(e)) {
    seen.add(e);
    if (e.code) return String(e.code);
    if (Array.isArray(e.errors) && e.errors.length) {
      const codes = [...new Set(e.errors.map((x) => x?.code).filter(Boolean))];
      if (codes.length) return codes.join('/');
    }
    // Some failures (blocked port, TLS) carry no code, only a message.
    if (e.message && e.message !== 'fetch failed') deepest = e.message;
    e = e.cause;
  }
  return String(deepest || err);
}

async function call(url, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON body */ }
    return { status: res.status, json, text, ms: Date.now() - started };
  } catch (err) {
    return { status: 0, json: null, text: causeOf(err), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

const AUTH_RE = /api[-_ ]?key|unauthori[sz]ed|forbidden|credential|project id|token|authenticat|subscription|plan/i;

/** Collapse a response into one short verdict word. */
function verdict(r) {
  if (r.status === 0) return `net:${r.text}`;
  if (r.status === 401 || r.status === 403) return 'AUTH';
  if (r.status === 429) return 'RATELIMIT';
  const err = r.json?.error;
  if (err) {
    const msg = String(err.message || '');
    if (AUTH_RE.test(msg)) return 'AUTH';
    if (err.code === -32601 || /not (found|supported|available|exist)|unsupported/i.test(msg)) return 'unsupported';
    if (/missing trie node|state.*not available|pruned|only.*recent/i.test(msg)) return 'no-archive';
    return `err:${err.code ?? '?'}`;
  }
  if (r.json?.result !== undefined) return 'ok';
  if (r.status >= 400) return `http${r.status}`;
  return 'unexpected';
}

async function probe(url) {
  const head = await call(url, rpc('eth_blockNumber'));
  const reachable = verdict(head);
  if (reachable !== 'ok') return { url, keyless: false, reachable };

  const [chain, receipts, batch, debugTrace, parityTrace, archive] = await Promise.all([
    call(url, rpc('eth_chainId')),
    call(url, rpc('eth_getBlockReceipts', ['latest'])),
    call(url, [rpc('eth_blockNumber', [], 1), rpc('eth_chainId', [], 2)]),
    call(url, rpc('debug_traceBlockByNumber', ['0x1', { tracer: 'callTracer' }])),
    call(url, rpc('trace_block', ['0x1'])),
    call(url, rpc('eth_getBalance', ['0xd8da6bf26964af9d7eed9e03e53415d37aa96045', '0xf4240'])),
  ]);

  const batched = Array.isArray(batch.json) && batch.json.length === 2
    && batch.json.every((x) => x?.result !== undefined);

  return {
    url,
    keyless: true,
    reachable,
    ms: head.ms,
    height: Number.parseInt(head.json.result, 16),
    chainId: chain.json?.result ? Number.parseInt(chain.json.result, 16) : null,
    receipts: verdict(receipts),
    batch: batched ? 'ok' : 'no',
    debug: verdict(debugTrace),
    parity: verdict(parityTrace),
    archive: verdict(archive),
  };
}

const rows = await Promise.all(urls.map(probe));

const pad = (s, n) => String(s ?? '-').padEnd(n);
console.log(
  pad('ENDPOINT', 52) + pad('ms', 6) + pad('CHAIN', 6) + pad('RECEIPTS', 12) +
  pad('BATCH', 7) + pad('DEBUG', 12) + pad('TRACE_', 12) + 'ARCHIVE',
);
console.log('-'.repeat(120));
for (const r of rows) {
  const name = r.url.replace(/^https:\/\//, '');
  if (!r.keyless) { console.log(pad(name, 52) + r.reachable); continue; }
  console.log(
    pad(name, 52) + pad(r.ms, 6) + pad(r.chainId, 6) + pad(r.receipts, 12) +
    pad(r.batch, 7) + pad(r.debug, 12) + pad(r.parity, 12) + r.archive,
  );
}

const keyless = rows.filter((r) => r.keyless);
console.log(`\n${keyless.length}/${rows.length} answered with no key or auth header.`);
const usable = keyless.filter((r) => r.chainId === 1 && r.receipts === 'ok' && r.batch === 'ok');
console.log(`${usable.length} of those also do mainnet + eth_getBlockReceipts + batching:`);
for (const r of usable) console.log(`  ${r.url}`);
