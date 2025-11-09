# How to Verify Sync is Working

## Quick Verification Commands

### 1. Check Sync Status
```bash
curl http://localhost:3000/api/indexer | python3 -m json.tool
```

Look for:
- `isSyncing`: Should be `true` when actively syncing
- `lastProcessedBlock`: Should increase over time
- `totalBlocksIndexed`: Should increase
- `totalTransactionsIndexed`: Should increase

### 2. Check Database Statistics
```bash
curl http://localhost:3000/api/stats | python3 -m json.tool
```

Check:
- `overview.totalBlocks`: Number of blocks in database
- `overview.totalTransactions`: Number of transactions
- `indexer.lastProcessedBlock`: Last block processed

### 3. View Latest Indexed Blocks
```bash
curl "http://localhost:3000/api/data?limit=5" | python3 -m json.tool
```

Should show blocks if syncing is working.

### 4. Check MongoDB Directly
```bash
mongosh mongodb://localhost:27017/ethereum_indexer
```

Then run:
```javascript
// Check indexer state
db.indexerstates.findOne({ key: "sync_state" })

// Count blocks
db.blocks.countDocuments()

// Count transactions
db.transactions.countDocuments()

// View latest blocks
db.blocks.find().sort({ number: -1 }).limit(5).pretty()
```

### 5. Watch Sync Progress in Real-Time
```bash
# Watch sync status every 2 seconds
watch -n 2 'curl -s http://localhost:3000/api/indexer | python3 -m json.tool'
```

### 6. Check Sync Service Logs
Look at the terminal where `npm run sync` is running. You should see:
- "Syncing from block X to Y"
- "Block X saved with N transactions"
- "Indexing complete. Indexed N blocks..."

## Fix "Indexer is already running" Issue

If you see "Indexer is already running" repeatedly, the indexer state is stuck. Reset it:

### Option 1: Via MongoDB
```bash
mongosh mongodb://localhost:27017/ethereum_indexer
```

```javascript
// Reset indexer state
db.indexerstates.updateOne(
  { key: "sync_state" },
  { $set: { isSyncing: false } }
)

// Or reset completely
db.indexerstates.updateOne(
  { key: "sync_state" },
  { $set: { lastProcessedBlock: -1, isSyncing: false } }
)
```

### Option 2: Via API (if frontend is running)
```bash
# This will trigger a new sync cycle
curl -X POST http://localhost:3000/api/indexer
```

## How to Stop Sync

### Method 1: Stop the Sync Service (Recommended)
In the terminal where `npm run sync` is running:
- Press `Ctrl+C` to stop gracefully

### Method 2: Kill the Process
```bash
# Find the process
ps aux | grep "sync.js"

# Kill it (replace PID with actual process ID)
kill <PID>

# Or kill all node processes (be careful!)
pkill -f "sync.js"
```

### Method 3: Reset Indexer State (if stuck)
```bash
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.indexerstates.updateOne({ key: 'sync_state' }, { \$set: { isSyncing: false } })"
```

## Expected Behavior

### When Sync is Working:
- Terminal shows: "Syncing from block X to Y"
- `lastProcessedBlock` increases
- Blocks appear in database
- API returns blocks and transactions

### When Sync is NOT Working:
- "Indexer is already running" (stuck state)
- No new blocks being processed
- `lastProcessedBlock` doesn't change
- Database count stays the same

## Troubleshooting

### Sync Not Starting
1. Check MongoDB is running: `sudo systemctl status mongod`
2. Check .env has correct values
3. Reset indexer state (see above)
4. Restart sync service: `npm run sync`

### Sync Too Slow
- Increase `INDEXER_BATCH_SIZE` in .env
- Use a faster RPC endpoint
- Check RPC rate limits

### Sync Stopped Unexpectedly
- Check sync service logs
- Check MongoDB connection
- Verify RPC endpoint is accessible

