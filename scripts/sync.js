#!/usr/bin/env node
/**
 * Indexer worker: keeps MongoDB in sync with the chain and refreshes daily
 * statistics. Run exactly one or more instances; the database lock guarantees
 * only one indexes at a time (the others act as hot standbys).
 *
 *   npm run sync                 # continuous
 *   npm run sync -- --once       # single batch then exit (cron style)
 */
import './load-env.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set (see .env.example)');
  process.exit(1);
}
if (!process.env.ETHEREUM_RPC_URL) {
  console.error('ETHEREUM_RPC_URL is not set (see .env.example)');
  process.exit(1);
}

const { runIndexer, startContinuousSync, stopContinuousSync, releaseLock } = await import('../src/lib/indexer/index.js');
const { dbDisconnect } = await import('../src/lib/db.js');

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nReceived ${signal}, finishing the current batch...`);
  stopContinuousSync();
  // Hard stop if the batch does not finish in time; the lock lease expires anyway.
  setTimeout(() => process.exit(0), 30_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

try {
  if (process.argv.includes('--once')) {
    const result = await runIndexer();
    console.log(JSON.stringify(result));
  } else {
    await startContinuousSync();
  }
} catch (err) {
  console.error('Indexer failed:', err);
  process.exitCode = 1;
} finally {
  await releaseLock().catch(() => {});
  await dbDisconnect().catch(() => {});
}
