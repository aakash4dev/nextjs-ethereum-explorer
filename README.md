# Ethereum Indexer MVP

A simple Ethereum block explorer built with Next.js (App Router), MongoDB, and Web3.js. It automatically clears and indexes the latest 10 blocks on page load, with live UI updates.

---

## Features
- **Automated Indexing:** Clears and indexes the latest 10 Ethereum blocks on initial page load.
- **Live UI Updates:** Data tables update in near real-time as the indexer runs.
- **Manual Sync:** A "Sync" button with an icon allows for manual re-indexing.
- **No Popups:** User feedback is handled through loading states and console logs instead of popups.
- **Modern Frontend:** Built with Next.js App Router and Tailwind CSS.
- **Detailed Views:** Pages for individual block and transaction details.
- **Branded Footer:** A consistent footer with your profile and social media links on all pages.
- **Reliable RPC:** Uses the free [publicnode Ethereum RPC](https://ethereum-rpc.publicnode.com).

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
npm install react-icons
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
- The app will be available at [http://localhost:3000](http://localhost:3000).
- The app will automatically start syncing the latest 10 blocks. You will see them appear in the UI one by one.
- You can click the **"Sync" button** at any time to re-run the process.

---

## Troubleshooting

### BigInt/Number Errors
- If you see errors like `Cast to Number failed for value "11n" (type bigint)`, ensure all fields defined as `Number` in your Mongoose schema are converted from BigInt to Number before saving.
- All large numeric fields (like `gasUsed`, `gasPrice`, `value`) are stored as strings. Use `.toString()` before saving.

### No Data in Frontend
- Make sure MongoDB is running and accessible.
- Check your `.env.local` values.
- Check the browser console and server logs for errors.
- Click the "Sync" button to re-run the indexer.

---

## Project Structure

```
ethereum-indexer/
├── src/
│   ├── app/
│   │   ├── api/           # API routes (data, indexer, clear)
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
- You can change the number of blocks indexed by editing `blocksToIndex` in `src/lib/indexer.js`.
- To use a different Ethereum RPC, update `ETHEREUM_RPC_URL` in your `.env.local`.
- To use MongoDB Atlas, update `MONGODB_URI` in your `.env.local`.

---

## Footer & Social Links
This project includes a footer with your details and social media links:
- [Profile](https://www.aakash4dev.com)
- [GitHub](https://github.com/aakash4dev)
- [LinkedIn](https://linkedin.com/in/aakash4dev)
- [Twitter](https://twitter.com/aakash4dev)
- [YouTube](https://www.youtube.com/@aakash4dev)
- [Medium](https://medium.com/@aakash4dev)

---

## License
MIT
