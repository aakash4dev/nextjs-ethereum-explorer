import Link from 'next/link';
import TimeAgo from '@/components/client/TimeAgo';
import { Badge, Card, Container, EmptyState, PageHeader, Pagination, Table, Td, Th } from '@/components/ui';
import { AddressLink } from '@/components/links';
import { listVerifiedContracts } from '@/lib/services/contracts';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getParam, parsePagination } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Verified Contracts' };

export default async function VerifiedContractsPage({ searchParams }) {
  const sp = await searchParams;
  const { page, limit } = parsePagination(sp, { defaultLimit: 50 });
  const q = getParam(sp, 'q')?.slice(0, 64) || undefined;
  await dbConnect();
  const { contracts, pagination } = await listVerifiedContracts({ page, limit, q });
  return (
    <Container>
      <PageHeader title="Contracts With Verified Source Codes" subtitle={`${formatNumber(pagination.total)} verified contracts`}>
        <form action="/contractsVerified" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Contract name" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary" />
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white" type="submit">Search</button>
        </form>
        <Link href="/verifyContract" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-primary">Verify Contract</Link>
      </PageHeader>
      <Card className="mt-4">
        <div className="flex justify-end px-4 py-3"><Pagination base="/contractsVerified" params={{ q, ps: limit }} page={page} totalPages={pagination.totalPages} /></div>
        {contracts.length ? (
          <Table>
            <thead><tr><Th>Address</Th><Th>Contract Name</Th><Th>Compiler</Th><Th>Version</Th><Th>Optimization</Th><Th>Match</Th><Th>License</Th><Th>Verified</Th></tr></thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.address} className="hover:bg-surface-2">
                  <Td><AddressLink address={c.address} isContract /></Td>
                  <Td><Link className="link" href={`/address/${c.address}?tab=contract`}>{c.name}</Link></Td>
                  <Td>Solidity</Td>
                  <Td className="text-xs">{c.compilerVersion}</Td>
                  <Td>{c.optimizationUsed ? `Yes (${c.runs})` : 'No'}</Td>
                  <Td><Badge tone={c.matchType === 'full' ? 'success' : 'warning'}>{c.matchType}</Badge></Td>
                  <Td>{c.licenseType ?? '-'}</Td>
                  <Td className="text-muted"><TimeAgo value={c.verifiedAt} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState>No verified contracts yet. <Link className="link" href="/verifyContract">Verify one</Link>.</EmptyState>}
      </Card>
    </Container>
  );
}
