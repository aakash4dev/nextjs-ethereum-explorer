#!/usr/bin/env node
import './load-env.js';
import { processVerificationJob } from '../src/lib/verification/verify.js';
import { dbDisconnect } from '../src/lib/db.js';
import { createLogger } from '../src/lib/logger.js';
const log = createLogger('verify-worker');
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
try {
  while (!stopping) {
    let worked = false;
    try { worked = await processVerificationJob(); } catch (err) { log.error('job cycle failed', { err }); }
    if (!worked && !stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
} finally { await dbDisconnect(); }
