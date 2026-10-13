import { Badge, Card, Container, DetailRow, Notice, PageHeader, Progress } from '@/components/ui';
import TimeAgo from '@/components/client/TimeAgo';
import AutoRefresh from '@/components/client/AutoRefresh';
import { getSyncStatus } from '@/lib/indexer/index.js';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Indexer Status' };

export default async function StatusPage() {
  let s = null;
  let error = null;
  try {
    await dbConnect();
    s = await getSyncStatus();
  } catch (err) {
    error = err.message;
  }
  return (
    <Container>
      <AutoRefresh intervalMs={5000} />
      <PageHeader title="Indexer Status" subtitle="Health of the background indexer that keeps this explorer in sync with the chain" />
      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
      {s && (
        <>
          {s.syncError && <Notice tone="danger" className="mt-4">Last error: {s.syncError}</Notice>}
          <Card className="mt-4">
            <DetailRow label="State">
              {s.blocksBehind !== null && s.blocksBehind <= 2 ? <Badge tone="success">In sync</Badge> : s.isSyncing ? <Badge tone="warning">Catching up</Badge> : <Badge tone="danger">Idle / behind</Badge>}
              {s.isSyncing && <span className="ml-2 text-xs text-muted">A worker currently holds the indexing lock</span>}
            </DetailRow>
            <DetailRow label="Last Indexed Block">{formatNumber(s.lastProcessedBlock)}</DetailRow>
            <DetailRow label="Chain Head">{s.headBlock !== null ? formatNumber(s.headBlock) : '-'}</DetailRow>
            <DetailRow label="Blocks Behind">{s.blocksBehind !== null ? formatNumber(s.blocksBehind) : '-'}</DetailRow>
            <DetailRow label="Progress">
              <div className="max-w-md">
                <div className="mb-1 text-sm">{s.syncProgress.toFixed(2)}% since start block {formatNumber(s.startBlock)}</div>
                <Progress value={s.syncProgress} tone="success" />
              </div>
            </DetailRow>
            <DetailRow label="Last Batch">{s.lastSyncedAt ? <><TimeAgo value={s.lastSyncedAt} />{s.lastBatchMs ? <span className="text-muted"> · took {formatNumber(s.lastBatchMs)} ms</span> : null}</> : '-'}</DetailRow>
            <DetailRow label="Trace Mode" hint="How internal transactions are collected.">{s.traceMode ?? config.traceMode}</DetailRow>
            <DetailRow label="Confirmations" hint="Blocks the indexer stays behind the head to avoid reorgs.">{s.confirmations}</DetailRow>
            <DetailRow label="Reorgs Handled">{formatNumber(s.reorgCount)}{s.lastReorgAt ? <span className="text-muted"> · last <TimeAgo value={s.lastReorgAt} /></span> : null}</DetailRow>
            <DetailRow label="Daily Stats Refreshed">{s.lastStatsAt ? <TimeAgo value={s.lastStatsAt} /> : '-'}</DetailRow>
          </Card>
        </>
      )}
    </Container>
  );
}
