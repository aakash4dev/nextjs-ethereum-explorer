import mongoose from 'mongoose';
import config from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('db');

// Cache the connection across hot reloads in development and across
// invocations in serverless runtimes.
const cached = globalThis.__mongoose ?? (globalThis.__mongoose = { conn: null, promise: null });

export class DatabaseConfigError extends Error {}

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  const uri = config.mongoUri;
  if (!uri) {
    throw new DatabaseConfigError('MONGODB_URI is not configured. Copy .env.example to .env and set it.');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: Number.parseInt(process.env.MONGODB_POOL_SIZE || '20', 10),
        serverSelectionTimeoutMS: 10_000,
        // Indexes are built explicitly with `npm run db:indexes` in production
        // so that a deploy never triggers an unplanned index build.
        autoIndex: process.env.NODE_ENV !== 'production' || process.env.MONGODB_AUTO_INDEX === 'true',
      })
      .then((m) => {
        log.info('connected');
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

export async function dbPing() {
  await dbConnect();
  const started = Date.now();
  await mongoose.connection.db.admin().ping();
  return Date.now() - started;
}

export async function dbDisconnect() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

export default dbConnect;
