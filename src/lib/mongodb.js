import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Enhanced Block Schema
const blockSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true, index: true },
  hash: { type: String, required: true, unique: true, index: true },
  parentHash: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  miner: { type: String, required: true, index: true },
  gasUsed: { type: String, required: true },
  gasLimit: { type: String, required: true },
  baseFeePerGas: { type: String },
  extraData: { type: String },
  difficulty: { type: String },
  totalDifficulty: { type: String },
  size: { type: Number },
  transactionCount: { type: Number, required: true, default: 0 },
  transactionsRoot: { type: String },
  stateRoot: { type: String },
  receiptsRoot: { type: String },
  sha3Uncles: { type: String },
  nonce: { type: String },
  mixHash: { type: String },
  logsBloom: { type: String },
  indexedAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: true
});

// Enhanced Transaction Schema
const transactionSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true, index: true },
  blockNumber: { type: Number, required: true, index: true },
  blockHash: { type: String, required: true, index: true },
  transactionIndex: { type: Number, required: true },
  from: { type: String, required: true, index: true },
  to: { type: String, index: true },
  value: { type: String, required: true },
  gas: { type: String, required: true },
  gasPrice: { type: String, required: true },
  maxFeePerGas: { type: String },
  maxPriorityFeePerGas: { type: String },
  nonce: { type: Number, required: true, index: true },
  input: { type: String },
  status: { type: Number, index: true }, // 1 = success, 0 = failure
  contractAddress: { type: String, index: true },
  cumulativeGasUsed: { type: String },
  effectiveGasPrice: { type: String },
  gasUsed: { type: String },
  logsBloom: { type: String },
  type: { type: Number, default: 0 }, // Transaction type (0 = legacy, 2 = EIP-1559)
  chainId: { type: Number },
  v: { type: String },
  r: { type: String },
  s: { type: String },
  indexedAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: true
});

// Address Schema for tracking addresses
const addressSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, index: true },
  balance: { type: String, default: '0' },
  transactionCount: { type: Number, default: 0 },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  isContract: { type: Boolean, default: false, index: true },
  contractCode: { type: String },
  indexedAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: true
});

// Indexer State Schema for tracking sync progress
const indexerStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'sync_state' },
  lastProcessedBlock: { type: Number, required: true, default: 0, index: true },
  lastSyncedAt: { type: Date, default: Date.now },
  isSyncing: { type: Boolean, default: false },
  syncError: { type: String },
  totalBlocksIndexed: { type: Number, default: 0 },
  totalTransactionsIndexed: { type: Number, default: 0 },
}, {
  timestamps: true
});

export const Block = mongoose.models.Block || mongoose.model('Block', blockSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);
export const IndexerState = mongoose.models.IndexerState || mongoose.model('IndexerState', indexerStateSchema);

export default dbConnect; 