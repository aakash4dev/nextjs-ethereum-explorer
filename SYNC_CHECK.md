# How to Check if Blockchain is Syncing

## Quick Status Check

### 1. Web Interface (Easiest)
Visit: **http://localhost:3000**

Look for:
- **"Indexed Blocks"** counter - should increase
- **"Sync Status"** - shows "Syncing..." when active
- **Latest Blocks** table - should populate with block data
- **Latest Transactions** table - should show transaction data

### 2. API Endpoints

#### Check Sync Status
```bash
curl http://localhost:3000/api/indexer | python3 -m json.tool
```

**Key fields to check:**
- `isSyncing`: `true` = actively syncing, `false` = not syncing
- `lastProcessedBlock`: Last block number that was indexed
- `totalBlocksIndexed`: Total blocks successfully indexed
- `totalTransactionsIndexed`: Total transactions indexed
- `blocksBehind`: How many blocks behind the latest
- `syncProgress`: Percentage of sync completion

#### Check Database Statistics
```bash
curl http://localhost:3000/api/stats | python3 -m json.tool
```

**Key fields:**
- `overview.totalBlocks`: Total blocks in database
- `overview.totalTransactions`: Total transactions in database
- `overview.totalAddresses`: Total addresses tracked

#### Check Latest Data
```bash
curl "http://localhost:3000/api/data?limit=5" | python3 -m json.tool
```

This shows the latest blocks and transactions that have been indexed.

### 3. Trigger Manual Sync

```bash
curl -X POST http://localhost:3000/api/indexer
```

This will start a sync cycle (processes `INDEXER_BATCH_SIZE` blocks).

### 4. Continuous Monitoring

Use the monitoring script:
```bash
/tmp/monitor-sync.sh
```

Or create your own:
```bash
watch -n 5 'curl -s http://localhost:3000/api/indexer | python3 -m json.tool'
```

## Understanding Sync Status

### ✅ Syncing is Working When:
- `isSyncing: true` (during active sync)
- `totalBlocksIndexed` increases over time
- `lastProcessedBlock` increases
- Blocks appear in `/api/data`
- Dashboard shows increasing numbers

### ❌ Not Syncing When:
- `isSyncing: false` AND `totalBlocksIndexed: 0`
- `lastProcessedBlock: -1` (never started)
- No blocks in database
- Dashboard shows zeros

### ⚠️ Potential Issues:

1. **Starting from Genesis (Block 0)**
   - Very slow (millions of blocks to sync)
   - May have issues with early blocks
   - **Solution**: Set `START_BLOCK` to a recent block number

2. **RPC Rate Limiting**
   - Public RPC endpoints have rate limits
   - **Solution**: Use a dedicated RPC (Infura, Alchemy) or reduce `INDEXER_BATCH_SIZE`

3. **MongoDB Connection Issues**
   - Check MongoDB is running
   - Verify `MONGODB_URI` in `.env`

4. **Network Issues**
   - Check RPC endpoint is accessible
   - Verify `ETHEREUM_RPC_URL` in `.env`

## Recommended Settings

For faster initial sync, update `.env`:

```env
# Start from a recent block (not genesis)
START_BLOCK=23756000

# Process more blocks per cycle (if RPC allows)
INDEXER_BATCH_SIZE=20

# Sync more frequently
SYNC_INTERVAL=3000
```

## Background Sync Service

For continuous syncing, run the background service:

```bash
npm run sync
```

Or with PM2:
```bash
pm2 start src/lib/sync-service.js --name ethereum-indexer
pm2 logs ethereum-indexer  # View logs
```

## Troubleshooting

### Check Server Logs
Look at the terminal where `npm run dev` is running for error messages.

### Test RPC Connection
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://ethereum-rpc.publicnode.com
```

### Test MongoDB Connection
```bash
# If MongoDB is local
mongosh mongodb://localhost:27017/ethereum_indexer
```

### Reset Indexer State
If sync gets stuck, you can reset the indexer state in MongoDB:
```javascript
// In MongoDB shell or via API
db.indexerstates.updateOne(
  { key: "sync_state" },
  { $set: { lastProcessedBlock: -1, isSyncing: false } }
)
```

## Quick Test Commands

```bash
# 1. Check current status
curl http://localhost:3000/api/indexer | python3 -m json.tool

# 2. Trigger sync
curl -X POST http://localhost:3000/api/indexer

# 3. Wait 5 seconds, then check again
sleep 5 && curl http://localhost:3000/api/indexer | python3 -m json.tool

# 4. Check if blocks were saved
curl http://localhost:3000/api/stats | python3 -m json.tool | grep totalBlocks
```

