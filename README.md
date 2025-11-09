# Ethereum Blockchain Explorer - Industrial Grade

A comprehensive, production-ready Ethereum blockchain explorer built with Next.js, MongoDB, and Web3.js. This industrial-grade explorer provides real-time blockchain indexing, comprehensive transaction tracking, address analytics, and a modern, professional user interface.

🌐 **Live Demo**: [https://nextjs-ethereum-explorer.vercel.app/](https://nextjs-ethereum-explorer.vercel.app/)

> **Note**: The live demo has sync disabled to manage database costs. For full functionality, run the explorer locally or deploy with your own database.

---

## ✨ Features

### Core Functionality
- **Real-time Blockchain Indexing**: Continuous synchronization with configurable start block
- **Comprehensive Data Tracking**: Blocks, transactions, addresses, and contract interactions
- **Advanced Search**: Search by block number, transaction hash, or Ethereum address
- **Detailed Views**: In-depth pages for blocks, transactions, and addresses
- **Pagination**: Efficient browsing of blocks and transactions
- **Address Analytics**: Balance tracking, transaction history, and statistics

### Industrial-Grade Features
- **Configurable Start Block**: Start indexing from any block number via environment variable
- **Batch Processing**: Efficient block processing with configurable batch sizes
- **Error Handling**: Robust error handling with retry logic and exponential backoff
- **Background Sync Service**: Continuous synchronization service for production deployments
- **Database Optimization**: Comprehensive indexing for fast queries
- **Real-time Updates**: Auto-refreshing data with sync status indicators
- **Performance Optimized**: Efficient database queries with pagination and caching

### User Interface
- **Modern Design**: Professional, dark-themed UI with smooth animations
- **Responsive Layout**: Fully responsive design for all device sizes
- **Real-time Stats**: Live statistics dashboard with sync progress
- **Navigation**: Easy navigation between blocks, transactions, and addresses
- **Status Indicators**: Visual indicators for transaction status and sync state

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Blockchain**: Web3.js for Ethereum interaction
- **Icons**: React Icons

---

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (local installation recommended for development)
- **Ethereum RPC Endpoint** (public RPC or your own node)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/aakash4dev/nextjs-ethereum-explorer.git
cd nextjs-ethereum-explorer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root (copy from `.example.env`):

```bash
cp .example.env .env
```

Edit `.env` with your configuration:

```env
# Ethereum RPC URL
ETHEREUM_RPC_URL=https://ethereum-rpc.publicnode.com

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/ethereum_indexer

# Indexer Configuration
START_BLOCK=23756000             # Start from recent block (faster than genesis)
INDEXER_BATCH_SIZE=10            # Number of blocks to process per sync cycle
SYNC_INTERVAL=5000               # Sync interval in milliseconds
```

**Important Notes:**
- **Environment File**: Use `.env` for both local development and production
- **For Local Development**: Use `mongodb://localhost:27017/ethereum_indexer`
- **For Production (Vercel)**: Set environment variables in Vercel dashboard (Settings → Environment Variables)
- **START_BLOCK**: Set to a recent block number (e.g., 23756000) for faster initial sync
- **Example Files**: `.example.env` and `.example.local.env` are provided as reference templates

### 4. Setup Local MongoDB

#### Ubuntu/Debian:
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
sudo systemctl status mongod
```

#### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Windows:
Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

**Alternative: MongoDB Atlas (Cloud)**
If you prefer cloud MongoDB, see the [MongoDB Atlas setup guide](https://www.mongodb.com/cloud/atlas/register) and update `MONGODB_URI` in `.env`

### 5. Run the Application Locally

**Step 1: Start the Frontend (Terminal 1)**
```bash
npm run dev
```

Wait for: `Ready on http://localhost:3000`

**Step 2: Start the Background Indexer (Terminal 2)**
```bash
npm run sync
```

This will continuously sync blocks in the background.

**Verify Everything is Working:**
```bash
# Check sync status
curl http://localhost:3000/api/indexer

# Check database stats
curl http://localhost:3000/api/stats

# View latest blocks
curl "http://localhost:3000/api/data?limit=5"
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🔄 Background Sync Service

For continuous syncing in local development, run the background sync service:

**Terminal 1: Frontend**
```bash
npm run dev
```

**Terminal 2: Background Indexer**
```bash
npm run sync
```

The sync service will:
- Continuously monitor for new blocks
- Process blocks in batches (configured by `INDEXER_BATCH_SIZE`)
- Handle errors gracefully with retry logic
- Update sync status in the database
- Log progress to console

**Monitor Sync Progress:**
```bash
# Check sync status
curl http://localhost:3000/api/indexer | python3 -m json.tool

# Watch sync in real-time
watch -n 2 'curl -s http://localhost:3000/api/indexer | python3 -m json.tool'
```

**For Production (PM2):**
```bash
pm2 start src/lib/sync-service.js --name ethereum-indexer
pm2 logs ethereum-indexer
pm2 save
pm2 startup
```

---

## ✅ Verifying Sync is Working

### Quick Verification Commands

**1. Check Sync Status:**
```bash
curl http://localhost:3000/api/indexer | python3 -m json.tool
```

Look for:
- `isSyncing`: `true` when actively syncing
- `lastProcessedBlock`: Should increase over time
- `totalBlocksIndexed`: Should increase
- `totalTransactionsIndexed`: Should increase

**2. Check Database Statistics:**
```bash
curl http://localhost:3000/api/stats | python3 -m json.tool
```

**3. View Latest Indexed Blocks:**
```bash
curl "http://localhost:3000/api/data?limit=5" | python3 -m json.tool
```

**4. Check MongoDB Directly:**
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
```

---

## 🛑 How to Stop Sync

### Method 1: Stop the Sync Service (Recommended)
In the terminal where `npm run sync` is running:
- Press `Ctrl+C` to stop gracefully

### Method 2: Kill the Process
```bash
# Find the process
ps aux | grep "sync.js"

# Kill it (replace PID with actual process ID)
kill <PID>

# Or kill all sync processes
pkill -f "sync.js"
```

### Method 3: Reset Indexer State (if stuck)
```bash
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.indexerstates.updateOne({ key: 'sync_state' }, { \$set: { isSyncing: false } })"
```

---

## 🚀 Deployment

### Vercel (Recommended for Frontend)

1. **Push code to GitHub**

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Add Environment Variables in Vercel**
   - Go to **Project Settings → Environment Variables**
   - Add each variable from your `.env` file:
     - `MONGODB_URI` (MongoDB Atlas connection string)
     - `ETHEREUM_RPC_URL`
     - `START_BLOCK`
     - `INDEXER_BATCH_SIZE`
     - `SYNC_INTERVAL`
   - Select all environments (Production, Preview, Development)
   - Click "Save"

4. **Deploy**
   - Vercel will automatically deploy on push
   - Or manually trigger a redeploy after adding env vars

**Important**: Vercel uses environment variables from its dashboard, not from `.env` file. The `.env` file is for local development only.

### MongoDB Atlas Setup
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user
3. Get connection string
4. Whitelist IP: `0.0.0.0/0` (or Vercel's IP ranges)
5. Add connection string to Vercel environment variables

### Background Sync Service
- Deploy sync service separately (VPS, AWS EC2, etc.)
- Use PM2 or similar process manager
- Set up monitoring and alerts

---

## 🔧 Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `START_BLOCK` | Block number to start indexing from | `0` |
| `INDEXER_BATCH_SIZE` | Blocks processed per sync cycle | `10` |
| `SYNC_INTERVAL` | Milliseconds between sync cycles | `5000` |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | Required |
| `MONGODB_URI` | MongoDB connection string | Required |

---

## 🐛 Quick Troubleshooting

### Indexer Not Syncing
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Test MongoDB connection
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.stats()"

# Check sync status
curl http://localhost:3000/api/indexer
```

### "Indexer is already running" (Stuck State)
```bash
# Reset the stuck state
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.indexerstates.updateOne({ key: 'sync_state' }, { \$set: { isSyncing: false } })"

# Then restart sync
npm run sync
```

### Reset Database (Fresh Start)
```bash
# Using NPM script
npm run reset-db

# Or manually via MongoDB
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.dropDatabase()"
```

For more detailed troubleshooting, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detailed architecture, API endpoints, database schema, and advanced topics
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guidelines for contributing to the project
- **[VERIFY_SYNC.md](VERIFY_SYNC.md)** - Detailed guide on verifying sync status
- **[SYNC_CHECK.md](SYNC_CHECK.md)** - Sync monitoring and troubleshooting guide

---

## 👤 About & Contact

<div align="center">
  <img src="./public/aakash_me.webp" alt="Aakash Singh Rajput" width="120" style="border-radius: 50%;" />
</div>

<div align="center">

**Aakash Singh Rajput** - Blockchain Developer

[Website](https://www.aakash4dev.com) | [GitHub](https://github.com/aakash4dev) | [LinkedIn](https://linkedin.com/in/aakash4dev) | [Twitter](https://twitter.com/aakash4dev)

</div>

### Custom Blockchain Explorers

This project demonstrates industrial-grade blockchain indexing and exploration. The architecture can be adapted for:
- Other EVM-compatible chains (Polygon, BSC, Avalanche, etc.)
- Custom blockchain networks
- Layer 2 solutions
- Private blockchain networks

**Available for contract work to build custom blockchain explorers and indexers.**

* **Email:** [aakash4dev.me@gmail.com](mailto:aakash4dev.me@gmail.com)

---

## 📄 License

This project is licensed under the MIT License.

### Copyright

Copyright (c) 2024 Aakash Singh Rajput

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Blockchain data via [Web3.js](https://web3js.readthedocs.io/)
- Database powered by [MongoDB](https://www.mongodb.com/)

---

## 🔄 Version History

### v2.0.0 - Industrial Grade Release
- Enhanced database schemas with comprehensive fields
- Configurable start block indexing
- Background sync service
- Address tracking and analytics
- Pagination support
- Improved error handling
- Modern UI/UX
- Performance optimizations

### v1.0.0 - Initial Release
- Basic block and transaction indexing
- Simple search functionality
- Basic UI
