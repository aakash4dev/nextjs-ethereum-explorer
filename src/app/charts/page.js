import Link from 'next/link';
import { FaChartArea } from 'react-icons/fa';
import Chart from '@/components/client/Chart';
import { Card, Container, Notice, PageHeader } from '@/components/ui';
import { CHARTS, getChartSeries } from '@/lib/services/stats';
import { dbConnect } from '@/lib/db';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Charts & Statistics' };

const unitLabel = (u) => (u === 'native' ? config.nativeSymbol : u);

export default async function ChartsPage() {
  await dbConnect();
  const series = await Promise.all(Object.keys(CHARTS).map((m) => getChartSeries(m, 60)));
  const empty = series.every((s) => !s.points.length);
  return (
    <Container>
      <PageHeader icon={<FaChartArea className="text-muted" />} title={`${config.chainName} Charts & Statistics`} subtitle="Daily network metrics computed from indexed blocks (UTC days)" />
      {empty && <Notice tone="info" className="mt-4">Daily statistics are computed by the indexer worker (every STATS_INTERVAL ms). Start <code className="hash">npm run sync</code> and they will appear here.</Notice>}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {series.map((s) => (
          <Card key={s.metric} title={<Link className="link" href={`/chart/${s.metric}`}>{s.title}</Link>} action={<Link href={`/chart/${s.metric}`} className="text-xs text-muted hover:text-primary">View →</Link>}>
            <div className="p-3">
              <Chart type={s.points.length < 20 ? 'bar' : 'area'} height={160} title={s.title} unit={unitLabel(s.unit)} points={s.points.map((p) => ({ label: p.date, value: p.value }))} showTable={false} />
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
}
