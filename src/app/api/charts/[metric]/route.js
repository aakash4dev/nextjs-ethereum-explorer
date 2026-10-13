import { withApi, json, CACHE } from '@/lib/api';
import { HttpError, getParam } from '@/lib/validation';
import { CHARTS, getChartSeries } from '@/lib/services/stats';

export const dynamic = 'force-dynamic';

/** GET /api/charts/:metric?days=365 — metrics: see CHARTS in services/stats.js */
export const GET = withApi(async (req, { params }) => {
  const days = Math.min(3650, Math.max(1, Number.parseInt(getParam(new URL(req.url).searchParams, 'days') ?? '365', 10) || 365));
  const series = await getChartSeries(params.metric, days);
  if (!series) throw new HttpError(404, `Unknown metric. Available: ${Object.keys(CHARTS).join(', ')}`);
  return json(series, { cache: CACHE.long });
});
