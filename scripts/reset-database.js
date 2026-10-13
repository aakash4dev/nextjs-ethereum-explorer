#!/usr/bin/env node
/**
 * Drop all indexed data and reset the sync cursor to START_BLOCK.
 * Verified contracts and learned signatures are kept unless --all is passed.
 *
 *   node scripts/reset-database.js --confirm [--all]
 */
import './load-env.js';

const confirm = process.argv.includes('--confirm');
const all = process.argv.includes('--all');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}
if (!confirm) {
  console.log('This deletes all indexed data. Re-run with --confirm (add --all to also drop verified contracts).');
  process.exit(0);
}

const { dbConnect, dbDisconnect } = await import('../src/lib/db.js');
const models = await import('../src/lib/models.js');

await dbConnect();
const keep = all ? [] : ['Contract', 'Signature'];
for (const model of models.ALL_MODELS) {
  if (keep.includes(model.modelName)) continue;
  const { deletedCount } = await model.deleteMany({});
  console.log(`${model.collection.name}: deleted ${deletedCount}`);
}
console.log(`Reset complete. The indexer will start from block ${process.env.START_BLOCK || 0}.`);
await dbDisconnect();
