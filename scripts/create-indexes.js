#!/usr/bin/env node
/**
 * Build / reconcile MongoDB indexes for every model. Run on deploy:
 *   npm run db:indexes
 * (In production autoIndex is disabled so app boots never trigger index builds.)
 */
import './load-env.js';

const { dbConnect, dbDisconnect } = await import('../src/lib/db.js');
const models = await import('../src/lib/models.js');

await dbConnect();
for (const model of models.ALL_MODELS) {
  const dropped = await model.syncIndexes();
  console.log(`${model.collection.name}: indexes in sync${dropped?.length ? ` (dropped ${dropped.join(', ')})` : ''}`);
}
await dbDisconnect();
