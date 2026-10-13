import { Card, Container, EmptyState, PageHeader, Pagination, Table, Td, Th, Notice } from '@/components/ui';
import { AddressLink, NativeAmount } from '@/components/links';
import { getTopAccounts } from '@/lib/services/addresses';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { parsePagination } from '@/lib/validation';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Top Accounts by Balance' };

export default async function AccountsPage({ searchParams }) {
  const { page, limit } = parsePagination(await searchParams, { defaultLimit: 50 });
  await dbConnect();
  const { accounts, pagination } = await getTopAccounts({ page, limit });
  return (
    <Container>
      <PageHeader title={`Top Accounts by ${config.nativeSymbol} Balance`} subtitle={`${formatNumber(pagination.total)} accounts with a tracked balance`} />
      {!config.trackBalances && <Notice tone="warning" className="mt-4">Balance tracking is disabled (TRACK_BALANCES=false).</Notice>}
      <Card className="mt-4">
        <div className="flex justify-end px-4 py-3"><Pagination base="/accounts" params={{ ps: limit }} page={page} totalPages={pagination.totalPages} /></div>
        {accounts.length ? (
          <Table>
            <thead><tr><Th>Rank</Th><Th>Address</Th><Th>Name Tag</Th><Th align="right">Balance</Th><Th align="right">Percentage*</Th><Th align="right">Last Active Block</Th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.address} className="hover:bg-surface-2">
                  <Td className="text-muted">{a.rank}</Td>
                  <Td><AddressLink address={a.address} isContract={a.isContract} truncate={false} meta={a.meta ? { ...a.meta, label: undefined } : null} /></Td>
                  <Td>{a.meta?.label ?? a.meta?.contractName ?? ''}</Td>
                  <Td align="right"><NativeAmount wei={a.balance} maxFraction={4} /></Td>
                  <Td align="right">{a.share.toFixed(4)}%</Td>
                  <Td align="right">{formatNumber(a.lastSeenBlock)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState>No balances tracked yet</EmptyState>}
        <p className="px-4 py-3 text-xs text-muted">* Share of the total balance held by accounts seen by the indexer (not of total supply).</p>
      </Card>
    </Container>
  );
}
