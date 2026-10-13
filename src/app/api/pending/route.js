import { withApi, json } from '@/lib/api';
import { getPendingTransactions } from '@/lib/services/transactions';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json(await getPendingTransactions(), { cache: 'public, max-age=3' }), { db: false });
