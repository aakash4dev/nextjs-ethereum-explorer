import { Card, Container, Notice, PageHeader, Pagination } from '@/components/ui';
import { InternalTxTable } from '@/components/tables';
import { listInternalTransactions } from '@/lib/services/transactions';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getParam, isBlockNumber, parsePagination } from '@/lib/validation';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Internal Transactions' };

export default async function InternalTxsPage({ searchParams }) {
  const sp = await searchParams;
  const { page, limit } = parsePagination(sp, { defaultLimit: 50 });
  const blockRaw = getParam(sp, 'block');
  const block = blockRaw && isBlockNumber(blockRaw) ? Number.parseInt(blockRaw, 10) : undefined;
  await dbConnect();
  const { internalTransactions, meta, pagination } = await listInternalTransactions({ page, limit, block });
  return (
    <Container>
      <PageHeader title="Internal Transactions" subtitle={block !== undefined ? `For block #${formatNumber(block)}` : 'Value transfers and contract creations made by smart contracts'} />
      {config.traceMode === 'off' && <Notice tone="warning" className="mt-4">Tracing is disabled (TRACE_MODE=off), so internal transactions are not indexed.</Notice>}
      <Card className="mt-4">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted">{formatNumber(pagination.total)} internal transactions</span>
          <Pagination base="/txsInternal" params={{ block, ps: limit }} page={page} totalPages={pagination.totalPages} />
        </div>
        <InternalTxTable rows={internalTransactions} meta={meta} />
      </Card>
    </Container>
  );
}
