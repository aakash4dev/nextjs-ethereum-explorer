import Link from 'next/link';
import { notFound } from 'next/navigation';
import Chart from '@/components/client/Chart';
import { Card, Container, PageHeader, Stat } from '@/components/ui';
import { CHARTS, getChartSeries } from '@/lib/services/stats';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { metric } = await params;
  return { title: CHARTS[metric]?.title ?? 'Chart' };
}

const RANGES = [['30', '1M'], ['90', '3M'], ['180', '6M'], ['365', '1Y'], ['3650', 'All']];

export default async function ChartPage({ params, searchParams }) {
  const { metric } = await params;
  const { days = '365' } = await searchParams;
  if (!CHARTS[metric]) notFound();
  await dbConnect();
  const s = await getChartSeries(metric, Math.min(3650, Math.max(1, Number.parseInt(days, 10) || 365)));
  const values = s.points.map((p) => p.value);
  const unit = s.unit === 'native' ? config.nativeSymbol : s.unit;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const maxIdx = values.indexOf(Math.max(...values));
  const minIdx = values.indexOf(Math.min(...values));
  return (
    <Container>
      <PageHeader title={s.title} subtitle={s.description}>
        <Link href="/charts" className="text-sm text-muted hover:text-primary">← All charts</Link>
      </PageHeader>
      <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Time range">
        {RANGES.map(([d, l]) => (
          <Link key={d} href={`/chart/${metric}?days=${d}`} className={`rounded-md px-3 py-1 text-sm ${String(days) === d ? 'bg-primary text-white' : 'bg-surface-3 hover:text-primary'}`}>{l}</Link>
        ))}
        <a href={`/api/charts/${metric}?days=${days}`} className="ml-auto text-xs text-muted hover:text-primary">Download JSON</a>
      </div>
      <Card className="mt-3">
        <div className="grid gap-4 border-b border-line p-4 sm:grid-cols-3">
          <Stat label="Average" value={`${formatNumber(avg, 2)} ${unit}`} />
          <Stat label="Highest" value={values.length ? `${formatNumber(values[maxIdx], 2)} ${unit}` : '-'} sub={s.points[maxIdx]?.date} />
          <Stat label="Lowest" value={values.length ? `${formatNumber(values[minIdx], 2)} ${unit}` : '-'} sub={s.points[minIdx]?.date} />
        </div>
        <div className="p-4">
          <Chart type={s.points.length < 20 ? 'bar' : 'area'} height={360} title={s.title} unit={unit} points={s.points.map((p) => ({ label: p.date, value: p.value }))} />
        </div>
      </Card>
    </Container>
  );
}
