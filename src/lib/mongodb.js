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

const blockSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true, index: true },
  hash: { type: String, required: true, unique: true },
  timestamp: { type: Date, required: true },
  miner: { type: String, required: true },
  gasUsed: { type: String, required: true },
  gasLimit: { type: String, required: true },
  baseFeePerGas: { type: String },
  transactionCount: { type: Number, required: true },
});

const transactionSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  blockNumber: { type: Number, required: true, index: true },
  from: { type: String, required: true, index: true },
  to: { type: String, index: true },
  value: { type: String, required: true },
  gas: { type: String, required: true },
  gasPrice: { type: String, required: true },
  nonce: { type: Number, required: true },
});

export const Block = mongoose.models.Block || mongoose.model('Block', blockSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default dbConnect; 