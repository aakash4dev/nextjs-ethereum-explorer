# Ethereum Blockchain Explorer - Industrial Grade

A comprehensive, production-ready Ethereum blockchain explorer built with Next.js, MongoDB, and Web3.js. This industrial-grade explorer provides real-time blockchain indexing, comprehensive transaction tracking, address analytics, and a modern, professional user interface.

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
- **MongoDB** (local installation or MongoDB Atlas account)
- **Ethereum RPC Endpoint** (public or private node)

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

Create a `.env.local` file in the project root:

```env
# Ethereum RPC URL
ETHEREUM_RPC_URL=https://ethereum-rpc.publicnode.com

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/ethereum_indexer

# Indexer Configuration
START_BLOCK=0                    # Block number to start indexing from (0 = genesis)
INDEXER_BATCH_SIZE=10            # Number of blocks to process per sync cycle
SYNC_INTERVAL=5000               # Sync interval in milliseconds (for background service)

# Optional: Site URL for server-side rendering
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**For Production:**
- Use a reliable RPC endpoint (Infura, Alchemy, or your own node)
- Use MongoDB Atlas or a managed MongoDB instance
- Set appropriate batch sizes based on your RPC rate limits

### 4. Setup MongoDB

You have two options:

#### Option A: MongoDB Atlas (Recommended - Cloud, Free Tier Available)

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free cluster (M0 tier)
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string and update `.env.local`:
```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ethereum_indexer?retryWrites=true&w=majority
```

#### Option B: Local MongoDB Installation

**For Ubuntu/Debian:**
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
sudo systemctl enable mongod  # Enable auto-start on boot

# Verify it's running
sudo systemctl status mongod
```

**For other Linux distributions**, see [MongoDB Installation Guide](https://www.mongodb.com/docs/manual/installation/)

**For macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**For Windows:**
Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### 5. Run the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🔄 Background Sync Service

For production deployments, run the background sync service to continuously index new blocks:

```bash
npm run sync
```

Or use a process manager like PM2:

```bash
pm2 start src/lib/sync-service.js --name ethereum-indexer
pm2 save
pm2 startup
```

The sync service will:
- Continuously monitor for new blocks
- Process blocks in batches
- Handle errors gracefully with retry logic
- Update sync status in the database

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

### Blocks
- Block number, hash, parent hash
- Timestamp, miner
- Gas information (used, limit, base fee)
- Transaction count
- Additional metadata (difficulty, size, etc.)

### Transactions
- Transaction hash, block number, index
- From/to addresses
- Value, gas information
- Transaction status (success/failure)
- Contract creation tracking
- EIP-1559 support (max fee, priority fee)

### Addresses
- Address, balance
- Transaction count
- Contract detection
- First/last seen timestamps

### Indexer State
- Last processed block
- Sync status
- Total indexed counts
- Error tracking

---

## 🎯 Usage Examples

### Starting from a Specific Block

To start indexing from block 18,000,000:

```env
START_BLOCK=18000000
```

### Adjusting Batch Size

For faster syncing (if your RPC allows):

```env
INDEXER_BATCH_SIZE=50
```

### Filtering Transactions by Address

```
GET /api/transactions?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

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

## 📊 Performance Considerations

### Database Indexing
The application creates indexes on:
- Block numbers and hashes
- Transaction hashes and block numbers
- Address fields
- Timestamps

### RPC Rate Limits
- Adjust `INDEXER_BATCH_SIZE` based on your RPC provider's rate limits
- Use a dedicated RPC endpoint for production
- Consider using multiple RPC endpoints with failover

### MongoDB Optimization
- Use MongoDB Atlas for production with appropriate instance size
- Enable connection pooling
- Monitor query performance and add indexes as needed

---

## 🐛 Troubleshooting

### Indexer Not Syncing
- Check RPC endpoint is accessible
- Verify MongoDB connection
- Check `START_BLOCK` configuration
- Review error logs in the database indexer state

### Slow Performance
- Reduce `INDEXER_BATCH_SIZE`
- Increase `SYNC_INTERVAL`
- Optimize MongoDB indexes
- Use a faster RPC endpoint

### Missing Data
- Ensure indexer has processed the required blocks
- Check sync status via `/api/indexer`
- Verify block range in database

---

## 🚀 Deployment

### Vercel (Recommended for Frontend)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### MongoDB Atlas
1. Create cluster
2. Get connection string
3. Add to environment variables
4. Whitelist IP addresses

### Background Sync Service
- Deploy sync service separately (VPS, AWS EC2, etc.)
- Use PM2 or similar process manager
- Set up monitoring and alerts

---

## 📝 Development

### Project Structure
```
src/
├── app/
│   ├── api/              # API routes
│   ├── address/          # Address pages
│   ├── block/            # Block pages
│   ├── transaction/      # Transaction pages
│   ├── blocks/           # All blocks page
│   ├── transactions/     # All transactions page
│   └── components/       # React components
└── lib/
    ├── indexer.js        # Indexer logic
    ├── mongodb.js        # Database models
    └── sync-service.js   # Background sync service
```

### Adding New Features
1. Update database schemas in `src/lib/mongodb.js`
2. Add API endpoints in `src/app/api/`
3. Create frontend pages in `src/app/`
4. Update indexer if needed in `src/lib/indexer.js`

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
