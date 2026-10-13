import { Card, Container, PageHeader, Pagination, Table, Td, Th, EmptyState } from '@/components/ui';
import { AddressLink, BlockLink, NativeAmount } from '@/components/links';
import TimeAgo from '@/components/client/TimeAgo';
import { listWithdrawals } from '@/lib/services/blocks';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { parsePagination } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Beacon Withdrawals' };

export default async function WithdrawalsPage({ searchParams }) {
  const { page, limit } = parsePagination(await searchParams, { defaultLimit: 50 });
  await dbConnect();
  const { withdrawals, pagination } = await listWithdrawals({ page, limit });
  return (
    <Container>
      <PageHeader title="Beacon Withdrawals" subtitle="Validator withdrawals credited on the execution layer (EIP-4895)" />
      <Card className="mt-4">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted">{formatNumber(pagination.total)} withdrawals</span>
          <Pagination base="/withdrawals" params={{ ps: limit }} page={page} totalPages={pagination.totalPages} />
        </div>
        {withdrawals.length ? (
          <Table>
            <thead><tr><Th>Index</Th><Th>Block</Th><Th>Age</Th><Th>Validator</Th><Th>Recipient</Th><Th align="right">Amount</Th></tr></thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.index}>
                  <Td>{formatNumber(w.index)}</Td>
                  <Td><BlockLink number={w.blockNumber} /></Td>
                  <Td className="text-muted"><TimeAgo value={w.timestamp} /></Td>
                  <Td>{formatNumber(w.validatorIndex)}</Td>
                  <Td><AddressLink address={w.address} /></Td>
                  <Td align="right"><NativeAmount wei={w.amount} maxFraction={6} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No withdrawals indexed (pre-Shanghai chains and dev networks have none)</EmptyState>
        )}
      </Card>
    </Container>
  );
}
