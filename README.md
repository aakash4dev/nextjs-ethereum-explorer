# Ethereum Indexer MVP

A simple Ethereum block explorer built with Next.js (App Router), MongoDB, and Web3.js. Indexes the latest 100 blocks and their transactions from the Ethereum blockchain and displays them in a modern web UI.

---

## Features
- Indexes the latest 100 Ethereum blocks and their transactions
- Stores data in MongoDB (local or Atlas)
- Modern Next.js frontend (App Router, Tailwind CSS)
- View latest blocks and transactions
- View block and transaction details
- Uses the free [publicnode Ethereum RPC](https://ethereum-rpc.publicnode.com)

---

## Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) (for local development)

---

## Getting Started

### 1. Clone the Repository
```sh
# Clone your project (if not already)
git clone <your-repo-url>
cd ethereum-indexer
```

### 2. Install Dependencies
```sh
npm install
```

### 3. Set Up Environment Variables

#### For Local MongoDB (Recommended for development)
Create a file named `.env.local` in the project root:
```env
ETHEREUM_RPC_URL=https://ethereum-rpc.publicnode.com
MONGODB_URI=mongodb://localhost:27017/ethereum_indexer
```

#### For MongoDB Atlas (Production/Cloud)
See `.env.example` for the format. Replace with your Atlas connection string.

---

## Running the App

### 1. Start MongoDB (if using local)
```sh
mongod
```

### 2. Start the Next.js App
```sh
npm run dev
```
- The app will be available at [http://localhost:3000](http://localhost:3000)

### 3. Index Ethereum Data
- Open [http://localhost:3000](http://localhost:3000) in your browser
- Click the **"Run Indexer"** button at the top
- This will fetch and store the latest 100 blocks and their transactions
- The frontend will update automatically with the new data

---

## Troubleshooting

### BigInt/Number Errors
- If you see errors like `Cast to Number failed for value "11n" (type bigint)`, ensure all fields defined as `Number` in your Mongoose schema are converted from BigInt to Number before saving.
- All large numeric fields (like `gasUsed`, `gasPrice`, `value`) are stored as strings. Use `.toString()` before saving.

### No Data in Frontend
- Make sure MongoDB is running and accessible
- Check your `.env.local` values
- Check the browser console and server logs for errors
- Run the indexer again if needed

---

## Project Structure

```
ethereum-indexer/
├── src/
│   ├── app/
│   │   ├── api/           # API routes (blocks, transactions, indexer, etc)
│   │   ├── block/         # Block detail pages
│   │   ├── transaction/   # Transaction detail pages
│   │   └── page.js        # Main explorer page
│   └── lib/
│       ├── mongodb.js     # MongoDB connection and models
│       └── indexer.js     # Ethereum indexer logic
├── .env.local             # Your local environment variables (not committed)
├── .env.example           # Example env file for documentation
├── README.md
└── ...
```

---

## Customization
- You can change the number of blocks indexed by editing `blocksToIndex` in `src/lib/indexer.js`
- To use a different Ethereum RPC, update `ETHEREUM_RPC_URL` in your `.env.local`
- To use MongoDB Atlas, update `MONGODB_URI` in your `.env.local`

---

## License
MIT
