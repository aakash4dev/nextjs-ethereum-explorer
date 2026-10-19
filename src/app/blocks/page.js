import { FaCube } from 'react-icons/fa';
import TimeAgo from '@/components/client/TimeAgo';
import { Card, Container, EmptyState, PageHeader, Pagination, Progress, Table, Td, Th } from '@/components/ui';
import { AddressLink, BlockLink, NativeAmount } from '@/components/links';
import { listBlocks } from '@/lib/services/blocks';
import { dbConnect } from '@/lib/db';
import { formatNumber, gasUsedPercent, formatGasPrice } from '@/lib/format';
import { parsePagination } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blocks' };

export default async function BlocksPage({ searchParams }) {
  const sp = await searchParams;
  const { page, limit } = parsePagination(sp, { defaultLimit: 25 });
  await dbConnect();
  const { blocks, pagination } = await listBlocks({ page, limit });

  return (
    <Container>
      <PageHeader title="Blocks" icon={<FaCube className="text-muted" />} subtitle={`Block #${formatNumber(blocks[0]?.number ?? 0)} to #${formatNumber(blocks[blocks.length - 1]?.number ?? 0)} (total of ${formatNumber(pagination.total)} indexed blocks)`} />
      <Card className="mt-4">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted">Showing {blocks.length} blocks</span>
          <Pagination base="/blocks" params={{ ps: limit }} page={page} totalPages={pagination.totalPages} />
        </div>
        {blocks.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Block</Th><Th>Age</Th><Th>Txn</Th><Th>Fee Recipient</Th><Th>Gas Used</Th><Th>Gas Limit</Th><Th>Base Fee</Th><Th align="right">Reward</Th><Th align="right">Burnt Fees</Th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => {
                const pct = gasUsedPercent(b.gasUsed, b.gasLimit);
                return (
                  <tr key={b.hash} className="hover:bg-surface-2">
                    <Td><BlockLink number={b.number} /></Td>
                    <Td><TimeAgo value={b.timestamp} /></Td>
                    <Td><a className="link" href={`/txs?block=${b.number}`}>{b.transactionCount}</a></Td>
                    <Td className="max-w-[220px]"><AddressLink address={b.miner} meta={b.minerMeta} /></Td>
                    <Td>
                      <div>{formatNumber(b.gasUsed)} <span className="text-xs text-muted">({pct.toFixed(2)}%)</span></div>
                      <div className="mt-1 w-24"><Progress value={pct} /></div>
                    </Td>
                    <Td>{formatNumber(b.gasLimit)}</Td>
                    <Td>{b.baseFeePerGas ? `${formatGasPrice(b.baseFeePerGas)} Gwei` : '-'}</Td>
                    <Td align="right"><NativeAmount wei={b.priorityFees} maxFraction={5} /></Td>
                    <Td align="right"><NativeAmount wei={b.burntFees} maxFraction={5} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No blocks indexed yet</EmptyState>
        )}
        <div className="px-4 py-3">
          <Pagination base="/blocks" params={{ ps: limit }} page={page} totalPages={pagination.totalPages} />
        </div>
      </Card>
    </Container>
  );
}
