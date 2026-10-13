import { Card, Container, EmptyState, Notice, PageHeader, Table, Td, Th } from '@/components/ui';
import { AddressLink, MethodBadge, NativeAmount } from '@/components/links';
import AutoRefresh from '@/components/client/AutoRefresh';
import { getPendingTransactions } from '@/lib/services/transactions';
import { methodNames } from '@/lib/signatures';
import { dbConnect } from '@/lib/db';
import { formatGwei, formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pending Transactions' };

export default async function PendingPage() {
  await dbConnect();
  const { supported, transactions } = await getPendingTransactions(100);
  const names = await methodNames(transactions.map((t) => t.methodId));
  return (
    <Container>
      <AutoRefresh intervalMs={5000} />
      <PageHeader title="Pending Transactions" subtitle="Transactions in the connected node's mempool, waiting to be included in a block" />
      {!supported && <Notice tone="warning" className="mt-4">The connected RPC node does not expose its pending block.</Notice>}
      <Card className="mt-4">
        {transactions.length ? (
          <Table>
            <thead><tr><Th>Transaction Hash</Th><Th>Method</Th><Th>Nonce</Th><Th>Gas Limit</Th><Th>Max Gas Price</Th><Th>From</Th><Th>To</Th><Th align="right">Amount</Th></tr></thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.hash}>
                  <Td><a className="link hash" href={`/tx/${t.hash}`}>{t.hash.slice(0, 16)}...</a></Td>
                  <Td><MethodBadge method={t.methodId ? names[t.methodId] ?? t.methodId : 'Transfer'} /></Td>
                  <Td>{t.nonce}</Td>
                  <Td>{formatNumber(t.gas)}</Td>
                  <Td>{formatGwei(t.gasPrice, 3)} Gwei</Td>
                  <Td><AddressLink address={t.from} /></Td>
                  <Td>{t.to ? <AddressLink address={t.to} /> : <span className="text-muted">Contract Creation</span>}</Td>
                  <Td align="right"><NativeAmount wei={t.value} maxFraction={6} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No pending transactions right now</EmptyState>
        )}
      </Card>
    </Container>
  );
}
