import { withApi, json, isAdmin } from '@/lib/api';
import { HttpError } from '@/lib/validation';
import { getSyncStatus, runIndexer } from '@/lib/indexer/index.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET /api/indexer — public sync status. */
export const GET = withApi(async () => json(await getSyncStatus()));

/**
 * POST /api/indexer — run one indexing batch (for serverless/cron deployments
 * without a worker). Requires `Authorization: Bearer $ADMIN_API_KEY`.
 */
export const POST = withApi(async (req) => {
  if (!isAdmin(req)) throw new HttpError(401, 'Unauthorized');
  return json(await runIndexer());
}, { cost: 0 });
