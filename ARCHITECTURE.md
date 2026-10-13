# Architecture

```
            ┌──────────────┐  JSON-RPC (batched, retried, failover)  ┌──────────────────┐
            │ EVM node(s)  │◀────────────────────────────────────────│ Indexer worker   │
            │ eth_/debug_/ │                                          │ scripts/sync.js  │
            │ trace_       │◀──────────┐                              └────────┬─────────┘
            └──────────────┘           │ live reads (balances, code,           │ bulk upserts
                                       │ eth_call, traces, fallbacks)          ▼
┌─────────┐  HTML / JSON   ┌───────────┴───────────┐   queries    ┌──────────────────┐
│ Browser │───────────────▶│ Next.js (App Router)  │─────────────▶│     MongoDB      │
│ wallet  │                │ pages + /api routes   │              └──────────────────┘
└─────────┘                │ solc worker threads   │──▶ binaries.soliditylang.org (cached)
                           └───────────────────────┘──▶ CoinGecko, openchain/4byte (optional)
```

Two processes share `src/lib`:

| Process | Entry | Responsibility |
|---|---|---|
| Web | `next start` / `server.js` | Server-rendered pages, REST + Etherscan-compatible APIs, contract verification |
| Worker | `scripts/sync.js` | Indexing, reorg handling, enrichment, daily statistics |

`src/lib` uses relative ESM imports (`./x.js`) so the same modules run under Next.js, plain Node (the worker) and `node:test`.

## Source layout

```
src/lib/
  config.js            validated env configuration (single source of truth)
  db.js, models.js     Mongo connection + schemas/indexes
  rpc.js               viem client: batching, retries, failover, capability probing
  indexer/
    fetch.js           block + receipts (+ eth_getBlockReceipts) + traces
    transform.js       pure: raw RPC payloads → documents (fees, logs, token transfers, ...)
    traces.js          pure: callTracer / parity traces → flat frames, call trees
    persist.js         idempotent bulk upserts; rollback for reorgs
    enrich.js          token metadata, balances (Multicall3), NFT owners, contract detection
    stats.js           daily aggregates for charts
    index.js           batch loop, lock, reorg detection, continuous sync
  verification/
    compiler.js        compiler download/cache/sha256, worker-thread compilation
    bytecode.js        pure: metadata/immutables/library handling, match type
    verify.js          verification flow + Etherscan-style async jobs
  services/            read models used by pages and API routes
  decoder.js           calldata, logs, revert reasons
  signatures*.js       selector dictionary (builtin → verified ABIs → remote)
  api.js               route wrapper: errors, rate limit, cache headers
src/app/               pages and /api route handlers
src/components/        server UI primitives + client components
workers/solc-worker.cjs  compiler worker thread
scripts/               sync worker, db scripts, devnet seeding
```

## Indexing pipeline

Each cycle (`runIndexer`):

1. **Lock**: acquire a lease in `indexerstates` (`lockOwner`, `lockExpiresAt`). A crashed worker's lease simply expires, so the indexer can never stay stuck in a "syncing" state.
2. **Range**: `from = lastProcessedBlock + 1`, `to = min(head - INDEXER_CONFIRMATIONS, from + INDEXER_BATCH_SIZE - 1)`.
3. **Fetch**: blocks are fetched concurrently (`INDEXER_CONCURRENCY`): `eth_getBlockByNumber(n, true)`, receipts via `eth_getBlockReceipts` (falling back to per-transaction receipts), and traces via `debug_traceBlockByNumber` (`callTracer`) or `trace_block` (parity). `TRACE_MODE=auto` probes the node once.
4. **Contiguity**: only the contiguous prefix of successfully fetched blocks is kept. A failure stops the batch; the next cycle retries, so **no block is ever skipped**.
5. **Reorg check**: the first block's `parentHash` must equal the stored hash of `from - 1`, and every block must link to the previous one. On a mismatch the indexer walks back (up to `INDEXER_MAX_REORG_DEPTH`) to the common ancestor, deletes everything above it, re-reads token balances and NFT owners touched by orphaned blocks, and re-indexes.
6. **Transform** (pure): transactions (fees, burnt fees, blob gas, method id), logs, ERC-20/721/1155 transfers (including `TransferBatch`), internal transactions (value transfers, CREATE/CREATE2, SELFDESTRUCT), withdrawals (gwei → wei), block burnt and priority fees, plus touched addresses and created contracts.
7. **Persist**: children are upserted first and the block row last, so a block row means its content is complete. All writes are keyed upserts (`hash`, `blockNumber+logIndex`, …), so replays after crashes or reorgs are safe. First/last-seen use `$min`/`$max`.
8. **Enrich**: `eth_getCode` for unknown transaction targets, token metadata (string and bytes32 `name`/`symbol`), `balanceOf` for touched holders (Multicall3 when deployed, batched `eth_call` otherwise), holder counts, and native balances, all pinned to the batch's last block.
9. **Stats**: every `STATS_INTERVAL` the worker recomputes today and yesterday (and backfills missing days) into `dailystats`.

## Data model (MongoDB)

| Collection | Key | Notes |
|---|---|---|
| `blocks` | `number`, `hash` | gas, base fee, burnt/priority fees, blob gas, withdrawals root, … |
| `transactions` | `hash` | indexes: `(from, block)`, `(to, block)`, `(block, index)`, `contractAddress`, `timestamp` |
| `logs` | `(blockNumber, logIndex)` | `topic0..3` as separate indexed fields |
| `tokentransfers` | `(blockNumber, logIndex, batchIndex)` | ERC-20/721/1155; indexes by token, from, to, type |
| `tokens` | `address` | metadata, supply, holder count |
| `tokenbalances` | `(token, holder, tokenId)` | current balances (zero rows deleted) |
| `nftinstances` | `(token, tokenId)` | ERC-721 owner (guarded by a monotonic sequence) |
| `internaltxes` | `(txHash, traceAddress)` | value-moving / creating frames only; full trees are fetched live |
| `withdrawals` | `index` | beacon withdrawals |
| `addresses` | `address` | balance, contract flag, creator, first/last seen |
| `contracts` | `address` | verified sources, ABI, settings, match type |
| `verificationjobs` | `guid` | Etherscan-style async jobs (TTL 7 days) |
| `signatures` | `(hash, signature)` | selectors learned from verified ABIs and remote lookups |
| `dailystats` | `date` | chart series |
| `indexerstates` | `key` | cursor, lease, head, errors, reorg count |

Wei and token amounts are decimal **strings** (uint256 does not fit a double); a `*Num` double is stored alongside where sorting or charting needs it. Gas quantities are numbers.

In production `autoIndex` is disabled; run `npm run db:indexes` on deploy.

## Read path

Pages are React Server Components that call `src/lib/services/*` directly (no internal HTTP hop). API routes call the same services through `withApi` (validation, rate limiting, error mapping, cache headers). Blocks and transactions not yet indexed are served live from the node and flagged as "Live from node". Small TTL caches with request coalescing protect hot paths (head block, gas oracle, price, stats).

## Contract verification

1. Build a standard-JSON input (single file → one source; or the user's standard JSON with our output selection).
2. Resolve the compiler (`list.json`), download `soljson` once, check its sha256, cache it, and compile in a **worker thread** (timeout, max 2 parallel).
3. Compare the deployed runtime code with each candidate's `deployedBytecode`: mask immutables, link libraries (auto-detected from the on-chain code when not provided), handle library call protection. Identical bytes give a **full** match; identical bytes after masking the CBOR metadata (trailing and embedded in child creation code) give a **partial** match.
4. Recover constructor arguments from the indexed creation transaction.
5. Store sources, ABI and settings; learn function/event/error signatures for decoding everywhere.

The Etherscan-compatible `verifysourcecode` action queues a job, returns a GUID, and `checkverifystatus` reports it, which is the flow Hardhat and Foundry use.

## Security

- No unauthenticated destructive endpoints (the old `/api/clear` was removed). `POST /api/indexer` requires `ADMIN_API_KEY` (constant-time comparison).
- All path and query inputs are validated; pagination is capped (`API_MAX_PAGE_SIZE`, 10k result window).
- Per-IP rate limiting; expensive endpoints (trace, export, verify) cost more.
- Contract reads only encode ABI fragments from verified contracts; the Etherscan `proxy` module only allows read-only methods plus `eth_sendRawTransaction`.
- CSV export neutralises spreadsheet formula injection.
- Security headers (HSTS, frame denial, nosniff, referrer and permissions policies); `X-Powered-By` disabled.
- Write Contract never touches keys: transactions are signed by the user's wallet (EIP-1193).

## Scaling notes

- Indexer throughput is bounded by the RPC. Raise `INDEXER_CONCURRENCY` / `INDEXER_BATCH_SIZE` on a dedicated node, and disable `TRACK_BALANCES` / `TRACK_TOKEN_BALANCES` / traces if the node can't keep up.
- Web servers are stateless apart from in-process caches and rate-limit counters; for multiple replicas put a shared limiter (e.g. at the proxy/CDN) in front.
- Counts on very large result sets are bounded (`boundedCount`) to keep pages fast.
