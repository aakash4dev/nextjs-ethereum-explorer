import { withApi, json } from '@/lib/api';
import { getParam } from '@/lib/validation';
import { resolveQuery, suggest } from '@/lib/services/search';

export const dynamic = 'force-dynamic';

/** GET /api/search?q=...&resolve=1 */
export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = (getParam(sp, 'q') ?? '').slice(0, 128);
  if (getParam(sp, 'resolve')) return json({ result: await resolveQuery(q) });
  return json({ results: await suggest(q) }, { cache: 'public, max-age=10' });
});
