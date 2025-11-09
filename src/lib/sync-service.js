/**
 * Background Sync Service
 * 
 * This service runs continuously to keep the blockchain indexer in sync.
 * Run this as a separate process or use a process manager like PM2.
 * 
 * Usage:
 *   npm run sync
 * 
 * Or with PM2:
 *   pm2 start src/lib/sync-service.js --name ethereum-indexer
 */

// Environment variables are loaded by the wrapper script (scripts/sync.js)
// This file assumes env vars are already loaded
import { startContinuousSync } from './indexer.js';
import dbConnect from './mongodb.js';

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start the sync service
async function main() {
  try {
    await dbConnect();
    console.log('Background sync service started');
    await startContinuousSync();
  } catch (error) {
    console.error('Failed to start sync service:', error);
    process.exit(1);
  }
}

main();

