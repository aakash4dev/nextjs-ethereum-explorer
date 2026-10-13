import Link from 'next/link';
import { Card, Container, PageHeader, Pagination } from '@/components/ui';
import { TransactionsTable } from '@/components/tables';
import AutoRefresh from '@/components/client/AutoRefresh';
import { listTransactions } from '@/lib/services/transactions';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getParam, isAddress, isBlockNumber, parsePagination } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transactions' };

export default async function TxsPage({ searchParams }) {
  const sp = await searchParams;
  const { page, limit } = parsePagination(sp, { defaultLimit: 50 });
  const blockRaw = getParam(sp, 'block');
  const block = blockRaw && isBlockNumber(blockRaw) ? Number.parseInt(blockRaw, 10) : undefined;
  const a = getParam(sp, 'a');
  const address = a && isAddress(a) ? a.toLowerCase() : undefined;
  await dbConnect();
  const { transactions, pagination } = await listTransactions({ page, limit, block, address });
  const params = { block, a: address, ps: limit };

  return (
    <Container>
      {page === 1 && block === undefined && <AutoRefresh intervalMs={15000} />}
      <PageHeader
        title="Transactions"
        subtitle={
          block !== undefined ? (
            <>For block <Link className="link" href={`/block/${block}`}>#{formatNumber(block)}</Link></>
          ) : address ? (
            <>For address <Link className="link hash" href={`/address/${address}`}>{address}</Link></>
          ) : (
            `More than ${formatNumber(pagination.total)} transactions found`
          )
        }
      />
      <Card className="mt-4">
        <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <span className="text-sm text-muted">
            {formatNumber(pagination.total)} transactions {pagination.total > 10_000 ? '(showing the last 10,000 records)' : ''}
          </span>
          <Pagination base="/txs" params={params} page={page} totalPages={Math.min(pagination.totalPages, Math.floor(10_000 / limit))} />
        </div>
        <TransactionsTable transactions={transactions} />
        <div className="px-4 py-3">
          <Pagination base="/txs" params={params} page={page} totalPages={Math.min(pagination.totalPages, Math.floor(10_000 / limit))} />
        </div>
      </Card>
    </Container>
  );
}
