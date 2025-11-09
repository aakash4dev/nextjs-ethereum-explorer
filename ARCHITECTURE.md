# Architecture & Technical Documentation

This document provides detailed technical information about the Ethereum Explorer architecture, API endpoints, database schema, and advanced configuration.

---

## 📡 API Endpoints

### Indexer
- `GET /api/indexer` - Get sync status
- `POST /api/indexer` - Trigger manual sync

### Data
- `GET /api/data?limit=10&page=1` - Get latest blocks and transactions
- `GET /api/stats` - Get overall statistics

### Blocks
- `GET /api/blocks?page=1&limit=20` - Get paginated blocks
- `GET /api/block/[number]` - Get specific block with transactions

### Transactions
- `GET /api/transactions?page=1&limit=20&address=0x...` - Get paginated transactions
- `GET /api/transaction/[hash]` - Get specific transaction

### Addresses
- `GET /api/address/[address]?page=1&limit=20` - Get address details with transactions

---

## 🗂️ Database Schema

### Blocks Collection

```javascript
{
  number: Number,              // Block number (indexed, unique)
  hash: String,                // Block hash (indexed, unique)
  parentHash: String,           // Parent block hash (indexed)
  timestamp: Date,              // Block timestamp (indexed)
  miner: String,                // Miner address (indexed)
  gasUsed: String,              // Gas used
  gasLimit: String,             // Gas limit
  baseFeePerGas: String,        // Base fee per gas (EIP-1559)
  extraData: String,            // Extra data
  difficulty: String,           // Block difficulty
  totalDifficulty: String,      // Total difficulty
  size: Number,                 // Block size in bytes
  transactionCount: Number,    // Number of transactions
  transactionsRoot: String,     // Transactions root
  stateRoot: String,            // State root
  receiptsRoot: String,         // Receipts root
  sha3Uncles: String,          // SHA3 of uncles
  nonce: String,               // Block nonce
  mixHash: String,              // Mix hash
  logsBloom: String,            // Logs bloom filter
  indexedAt: Date,              // When block was indexed (indexed)
  createdAt: Date,             // Document creation time
  updatedAt: Date              // Document update time
}
```

**Indexes:**
- `number` (unique, ascending)
- `hash` (unique, ascending)
- `parentHash` (ascending)
- `timestamp` (ascending)
- `miner` (ascending)
- `indexedAt` (ascending)

### Transactions Collection

```javascript
{
  hash: String,                 // Transaction hash (indexed, unique)
  blockNumber: Number,          // Block number (indexed)
  blockHash: String,            // Block hash (indexed)
  transactionIndex: Number,     // Transaction index in block
  from: String,                 // Sender address (indexed)
  to: String,                   // Recipient address (indexed, nullable)
  value: String,                // Value in wei
  gas: String,                  // Gas limit
  gasPrice: String,             // Gas price
  maxFeePerGas: String,         // Max fee per gas (EIP-1559)
  maxPriorityFeePerGas: String, // Max priority fee (EIP-1559)
  nonce: Number,                // Transaction nonce (indexed)
  input: String,                // Input data
  status: Number,               // Status: 1 = success, 0 = failure (indexed)
  contractAddress: String,      // Contract address if creation (indexed)
  cumulativeGasUsed: String,    // Cumulative gas used
  effectiveGasPrice: String,    // Effective gas price
  gasUsed: String,              // Gas used
  logsBloom: String,            // Logs bloom filter
  type: Number,                 // Transaction type (0 = legacy, 2 = EIP-1559)
  chainId: Number,              // Chain ID
  v: String,                    // Signature v
  r: String,                    // Signature r
  s: String,                    // Signature s
  indexedAt: Date,               // When transaction was indexed (indexed)
  createdAt: Date,              // Document creation time
  updatedAt: Date               // Document update time
}
```

**Indexes:**
- `hash` (unique, ascending)
- `blockNumber` (ascending)
- `blockHash` (ascending)
- `from` (ascending)
- `to` (ascending)
- `status` (ascending)
- `contractAddress` (ascending)
- `nonce` (ascending)
- `indexedAt` (ascending)

### Addresses Collection

```javascript
{
  address: String,              // Ethereum address (indexed, unique)
  balance: String,              // Current balance in wei
  transactionCount: Number,     // Total transaction count
  firstSeen: Date,             // First seen timestamp
  lastSeen: Date,              // Last seen timestamp
  isContract: Boolean,          // Is contract address (indexed)
  contractCode: String,         // Contract bytecode (if contract)
  indexedAt: Date,             // When address was indexed (indexed)
  createdAt: Date,              // Document creation time
  updatedAt: Date               // Document update time
}
```

**Indexes:**
- `address` (unique, ascending)
- `isContract` (ascending)
- `indexedAt` (ascending)

### Indexer States Collection

```javascript
{
  key: String,                  // State key (default: "sync_state") (unique)
  lastProcessedBlock: Number,   // Last processed block number (indexed)
  lastSyncedAt: Date,          // Last sync timestamp
  isSyncing: Boolean,          // Is currently syncing
  syncError: String,           // Last sync error (if any)
  totalBlocksIndexed: Number,  // Total blocks indexed
  totalTransactionsIndexed: Number, // Total transactions indexed
  createdAt: Date,              // Document creation time
  updatedAt: Date               // Document update time
}
```

**Indexes:**
- `key` (unique, ascending)
- `lastProcessedBlock` (ascending)

---

## 🏗️ System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Homepage   │  │ Block Pages  │  │  Tx Pages    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Address Pages│  │ Search       │  │  Stats       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              API Routes (Next.js API)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/    ││
│  │ indexer  │  │ blocks   │  │ trans    │  │ address  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    MongoDB Database                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Blocks   │  │Transact.  │  │ Addresses│  │ Indexer  ││
│  │          │  │           │  │          │  │ State    ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
┌─────────────────────────────────────────────────────────┐
│              Background Sync Service                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Indexer (src/lib/indexer.js)                      │ │
│  │  - Fetches blocks from Ethereum RPC                │ │
│  │  - Processes transactions                           │ │
│  │  - Updates database                                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Ethereum RPC Endpoint                        │
│              (Web3.js via HTTP/WebSocket)                │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Indexing Flow:**
   - Sync service calls `runIndexer()`
   - Fetches blocks from Ethereum RPC
   - Processes each block and its transactions
   - Saves to MongoDB
   - Updates indexer state

2. **Frontend Flow:**
   - User requests page
   - Next.js server component fetches from API
   - API queries MongoDB
   - Data returned to frontend
   - Rendered with React

3. **Search Flow:**
   - User enters search query
   - Frontend validates format
   - Routes to appropriate page
   - Page fetches data from API
   - Displays results

---

## 🔧 Advanced Configuration

### Indexer Configuration

The indexer can be configured via environment variables:

```env
# Start from a specific block
START_BLOCK=23756000

# Process more blocks per cycle (if RPC allows)
INDEXER_BATCH_SIZE=20

# Sync more frequently
SYNC_INTERVAL=3000
```

### Performance Tuning

**For Fast RPC Endpoints:**
```env
INDEXER_BATCH_SIZE=50
SYNC_INTERVAL=2000
```

**For Rate-Limited RPCs:**
```env
INDEXER_BATCH_SIZE=5
SYNC_INTERVAL=10000
```

**For Initial Sync:**
```env
START_BLOCK=<recent_block_number>
INDEXER_BATCH_SIZE=20
```

---

## 📊 Performance Considerations

### Database Indexing

The application creates indexes on:
- Block numbers and hashes
- Transaction hashes and block numbers
- Address fields
- Timestamps

**Query Optimization:**
- Use indexed fields in queries
- Limit result sets with pagination
- Use aggregation pipelines for complex queries

### RPC Rate Limits

- Adjust `INDEXER_BATCH_SIZE` based on your RPC provider's rate limits
- Use a dedicated RPC endpoint for production
- Consider using multiple RPC endpoints with failover
- Implement request queuing for high-volume scenarios

### MongoDB Optimization

- Use MongoDB Atlas for production with appropriate instance size
- Enable connection pooling
- Monitor query performance and add indexes as needed
- Use read replicas for read-heavy workloads
- Implement caching for frequently accessed data

### Frontend Optimization

- Server-side rendering for initial page load
- Client-side caching with Next.js cache
- Pagination to limit data transfer
- Lazy loading for images and components

---

## 🎯 Local Development Usage

### Starting from a Specific Block

**Important**: Starting from block 0 (genesis) will take a very long time. For local testing, use a recent block:

```env
# In .env
START_BLOCK=23756000  # Recent block (faster sync)
```

To find the current Ethereum block:
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://ethereum-rpc.publicnode.com
```

### Adjusting Batch Size

For faster syncing (if your RPC allows):

```env
INDEXER_BATCH_SIZE=20  # Process more blocks per cycle
```

### Checking Sync Status Locally

```bash
# Quick status check
curl http://localhost:3000/api/indexer

# Detailed stats
curl http://localhost:3000/api/stats | python3 -m json.tool

# View indexed blocks
curl "http://localhost:3000/api/data?limit=10" | python3 -m json.tool
```

### Filtering Transactions by Address

```bash
curl "http://localhost:3000/api/transactions?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

---

## 🐛 Troubleshooting

### Indexer Not Syncing
```bash
# 1. Check if MongoDB is running
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# 2. Test MongoDB connection
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.stats()"

# 3. Check RPC endpoint
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://ethereum-rpc.publicnode.com

# 4. Check sync status
curl http://localhost:3000/api/indexer

# 5. Check server logs (Terminal 1 where npm run dev is running)
```

### Sync Service Error: "Cannot find package '@/lib'"
**Fixed!** The issue was resolved by:
- Adding `"type": "module"` to `package.json`
- Changing import in `indexer.js` to use relative path `./mongodb.js`
- Adding `dotenv` package for environment variable loading
- Creating wrapper script `scripts/sync.js` to load env vars first

If you still see this error:
```bash
npm install  # Reinstall dependencies
npm run sync  # Try again
```

### Error: "Cast to Number failed for value '537n' (type bigint)"
**Fixed!** This happens when Web3.js returns BigInt values. The indexer now converts BigInt to Number automatically.

If you still see this error:
```bash
# Make sure you have the latest code
git pull  # If using git
npm install  # Reinstall dependencies
npm run sync  # Restart sync
```

### "Indexer is already running" (Stuck State)
The indexer state is stuck. Reset it:

```bash
# Reset the stuck state
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.indexerstates.updateOne({ key: 'sync_state' }, { \$set: { isSyncing: false } })"

# Then restart sync
npm run sync
```

Or complete reset:
```bash
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.indexerstates.updateOne({ key: 'sync_state' }, { \$set: { lastProcessedBlock: -1, isSyncing: false } })"
```

### Slow Performance
- Reduce `INDEXER_BATCH_SIZE` to 5-10 for public RPCs
- Increase `SYNC_INTERVAL` to 10000 (10 seconds)
- Use a dedicated RPC endpoint (Infura, Alchemy)
- Check MongoDB is running locally and not on network

### Missing Data
```bash
# Check what's in the database
mongosh mongodb://localhost:27017/ethereum_indexer

# Then run:
db.blocks.countDocuments()
db.transactions.countDocuments()
db.indexerstates.findOne({ key: "sync_state" })

# If needed, reset indexer state:
db.indexerstates.updateOne(
  { key: "sync_state" },
  { $set: { lastProcessedBlock: -1, isSyncing: false } }
)
```

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Reset Database (Fresh Start)

**Option 1: Using NPM Script (Recommended)**
```bash
# Stop sync service first (Ctrl+C)
npm run reset-db
```

**Option 2: Using MongoDB Shell**
```bash
# Delete all collections
mongosh mongodb://localhost:27017/ethereum_indexer --eval "
  db.blocks.deleteMany({});
  db.transactions.deleteMany({});
  db.addresses.deleteMany({});
  db.indexerstates.deleteMany({});
  print('✅ All data deleted');
"

# Reset indexer state to start from START_BLOCK
mongosh mongodb://localhost:27017/ethereum_indexer --eval "
  db.indexerstates.updateOne(
    { key: 'sync_state' },
    { \$set: { lastProcessedBlock: 14, isSyncing: false, totalBlocksIndexed: 0, totalTransactionsIndexed: 0 } }
  );
  print('✅ Indexer state reset');
"
```

**Option 3: Drop Entire Database**
```bash
# WARNING: This deletes the entire database
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.dropDatabase()"
```

**After Reset:**
```bash
# Restart sync service
npm run sync
```

---

## 📝 Development

### Project Structure
```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── indexer/      # Indexer endpoints
│   │   ├── block/         # Block endpoints
│   │   ├── blocks/        # Blocks list endpoint
│   │   ├── transaction/   # Transaction endpoints
│   │   ├── transactions/  # Transactions list endpoint
│   │   ├── address/       # Address endpoints
│   │   ├── data/          # Data aggregation endpoint
│   │   └── stats/         # Statistics endpoint
│   ├── address/           # Address pages
│   ├── block/             # Block pages
│   ├── transaction/       # Transaction pages
│   ├── blocks/            # All blocks page
│   ├── transactions/      # All transactions page
│   └── components/        # React components
└── lib/
    ├── indexer.js         # Indexer logic
    ├── mongodb.js         # Database models
    └── sync-service.js    # Background sync service
scripts/
├── sync.js                # Sync service wrapper
└── reset-database.js      # Database reset script
```

### Adding New Features

1. **Update Database Schemas**
   - Edit `src/lib/mongodb.js`
   - Add new fields to existing schemas or create new schemas
   - Add appropriate indexes

2. **Add API Endpoints**
   - Create new route file in `src/app/api/`
   - Follow existing patterns for error handling
   - Add pagination if returning lists

3. **Create Frontend Pages**
   - Add new page in `src/app/`
   - Use server components for data fetching
   - Follow existing UI patterns

4. **Update Indexer**
   - Modify `src/lib/indexer.js` if needed
   - Add new data extraction logic
   - Update address tracking if needed

### Code Patterns

**API Route Pattern:**
```javascript
import dbConnect, { Model } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    await dbConnect();
    // Your logic here
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Server Component Pattern:**
```javascript
async function getData() {
  const res = await fetch('/api/endpoint', { next: { revalidate: 10 } });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default async function Page() {
  const data = await getData();
  // Render component
}
```

---

## 🔐 Security Considerations

### Environment Variables
- Never commit `.env` file to version control
- Use strong MongoDB passwords
- Rotate RPC API keys regularly
- Use environment-specific configurations

### API Security
- Implement rate limiting for production
- Add authentication for admin endpoints
- Validate and sanitize all inputs
- Use HTTPS in production

### Database Security
- Use MongoDB authentication
- Whitelist IP addresses
- Enable MongoDB encryption at rest
- Regular backups

---

## 📈 Scaling Considerations

### Horizontal Scaling
- Deploy multiple frontend instances
- Use load balancer
- Share MongoDB database
- Separate sync service instances

### Vertical Scaling
- Increase MongoDB instance size
- Use faster RPC endpoints
- Increase batch sizes
- Optimize database queries

### Caching Strategy
- Cache frequently accessed blocks
- Cache address balances
- Use Redis for session data
- Implement CDN for static assets

---

## 🔄 Monitoring & Logging

### Key Metrics to Monitor
- Blocks indexed per hour
- Transactions indexed per hour
- Sync lag (blocks behind)
- API response times
- Database query performance
- Error rates

### Logging
- Indexer logs sync progress
- API logs errors and slow queries
- Frontend logs user interactions
- Use structured logging for production

---

## 🧪 Testing

### Manual Testing
- Test sync with different START_BLOCK values
- Verify pagination works correctly
- Test search functionality
- Check error handling

### Database Testing
- Test with empty database
- Test with large datasets
- Verify indexes are used
- Test concurrent access

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [Ethereum JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/)

---

For quick start and basic usage, see [README.md](README.md).

