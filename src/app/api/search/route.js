import { withApi, json } from '@/lib/api';
import { getParam } from '@/lib/validation';
import { resolveQuery, suggest } from '@/lib/services/search';

export const dynamic = 'force-dynamic';

/** GET /api/search?q=...&resolve=1 */
export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = (getParam(sp, 'q') ?? '').slice(0, 128);
  const filter = ['address', 'token', 'block', 'tx'].includes(getParam(sp, 'f')) ? getParam(sp, 'f') : 'all';
  if (getParam(sp, 'resolve')) return json({ result: await resolveQuery(q, filter) });
  return json({ results: await suggest(q, 8, filter) }, { cache: 'public, max-age=10' });
});
