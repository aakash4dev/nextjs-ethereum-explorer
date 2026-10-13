import { withApi, json, CACHE } from '@/lib/api';
import { normalizeHash } from '@/lib/validation';
import { getTransactionTrace } from '@/lib/services/transactions';

export const dynamic = 'force-dynamic';

/** Full call tree from the node's trace API (debug_traceTransaction / trace_transaction). */
export const GET = withApi(async (_req, { params }) => {
  return json(await getTransactionTrace(normalizeHash(params.hash, 'transaction hash')), { cache: CACHE.medium });
}, { cost: 5 });
