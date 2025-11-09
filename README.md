# Ethereum Blockchain Explorer - Industrial Grade

A comprehensive, production-ready Ethereum blockchain explorer built with Next.js, MongoDB, and Web3.js. This industrial-grade explorer provides real-time blockchain indexing, comprehensive transaction tracking, address analytics, and a modern, professional user interface.

🌐 **Live Demo**: [https://nextjs-ethereum-explorer.vercel.app/](https://nextjs-ethereum-explorer.vercel.app/)

> **Note**: The live demo has sync disabled to manage database costs. For full functionality, run the explorer locally or deploy with your own database.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (local or Atlas)
- **Ethereum RPC Endpoint** (public RPC or your own node)

### Installation

1. **Clone and install:**
   ```bash
   git clone https://github.com/aakash4dev/nextjs-ethereum-explorer.git
   cd nextjs-ethereum-explorer
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .example.env .env
   ```
   
   Edit `.env` with your settings:
   ```env
   ETHEREUM_RPC_URL=https://ethereum-rpc.publicnode.com
   MONGODB_URI=mongodb://localhost:27017/ethereum_indexer
   START_BLOCK=23756000  # Recent block for faster sync
   INDEXER_BATCH_SIZE=10
   SYNC_INTERVAL=5000
   ```

3. **Setup MongoDB:**
   
   **Ubuntu/Debian:**
   ```bash
   curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   sudo apt-get update && sudo apt-get install -y mongodb-org
   sudo systemctl start mongod && sudo systemctl enable mongod
   ```
   
   **macOS:**
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   ```
   
   **Windows:** Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   
   **Or use MongoDB Atlas:** See [MongoDB Atlas setup guide](https://www.mongodb.com/cloud/atlas/register)

4. **Run the application:**
   
   **Terminal 1 - Frontend:**
   ```bash
   npm run dev
   ```
   
   **Terminal 2 - Indexer:**
   ```bash
   npm run sync
   ```

5. **Verify it's working:**
   ```bash
   curl http://localhost:3000/api/indexer
   curl http://localhost:3000/api/stats
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the explorer!

### Screenshots

<div align="center">
  <img src="./public/homepage.png" alt="Homepage" width="800" style="border-radius: 8px; margin: 10px;" />
  <img src="./public/blockpage.png" alt="Block Page" width="800" style="border-radius: 8px; margin: 10px;" />
  <img src="./public/transactionpage.png" alt="Transaction Page" width="800" style="border-radius: 8px; margin: 10px;" />
</div>

---

## ✨ Features

- **Real-time Blockchain Indexing** - Continuous synchronization with configurable start block
- **Comprehensive Data Tracking** - Blocks, transactions, addresses, and contract interactions
- **Advanced Search** - Search by block number, transaction hash, or Ethereum address
- **Address Analytics** - Balance tracking, transaction history, and statistics
- **Modern UI** - Professional, dark-themed interface with real-time stats
- **Production Ready** - Robust error handling, batch processing, and database optimization

See [ROADMAP.md](ROADMAP.md) for detailed features and future plans.

---

## 🔧 Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `START_BLOCK` | Block number to start indexing from | `0` |
| `INDEXER_BATCH_SIZE` | Blocks processed per sync cycle | `10` |
| `SYNC_INTERVAL` | Milliseconds between sync cycles | `5000` |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | Required |
| `MONGODB_URI` | MongoDB connection string | Required |

---

## 🚀 Deployment

### Vercel (Frontend)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in **Settings → Environment Variables**:
   - `MONGODB_URI` (MongoDB Atlas connection string)
   - `ETHEREUM_RPC_URL`
   - `START_BLOCK`
   - `INDEXER_BATCH_SIZE`
   - `SYNC_INTERVAL`
4. Deploy

**Note:** Vercel uses environment variables from its dashboard, not from `.env` file.

### Background Sync Service

Deploy the sync service separately (VPS, AWS EC2, etc.):
```bash
pm2 start src/lib/sync-service.js --name ethereum-indexer
pm2 logs ethereum-indexer
pm2 save
pm2 startup
```

---

## 🐛 Troubleshooting

### Indexer Not Syncing
```bash
# Check MongoDB
sudo systemctl status mongod
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.stats()"

# Check sync status
curl http://localhost:3000/api/indexer
```

### Reset Database
```bash
npm run reset-db
# Or manually:
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.dropDatabase()"
```

### "Indexer is already running" (Stuck)
```bash
mongosh mongodb://localhost:27017/ethereum_indexer --eval "db.indexerstates.updateOne({ key: 'sync_state' }, { \$set: { isSyncing: false } })"
npm run sync
```

For detailed troubleshooting, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detailed architecture, API endpoints, database schema
- **[ROADMAP.md](ROADMAP.md)** - Current features and future roadmap
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[VERIFY_SYNC.md](VERIFY_SYNC.md)** - Sync verification guide
- **[SYNC_CHECK.md](SYNC_CHECK.md)** - Sync monitoring guide

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Blockchain**: Web3.js v4
- **Icons**: React Icons

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
