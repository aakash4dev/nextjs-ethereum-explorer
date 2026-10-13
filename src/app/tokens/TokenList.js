import Link from 'next/link';
import { Badge, Card, Container, EmptyState, PageHeader, Pagination, Table, Td, Th } from '@/components/ui';
import { TokenAmount } from '@/components/links';
import { listTokens } from '@/lib/services/tokens';
import { dbConnect } from '@/lib/db';
import { checksum, formatNumber, truncateMiddle } from '@/lib/format';
import { getParam, parsePagination } from '@/lib/validation';

/** Shared list for /tokens (ERC-20) and /nft-tokens (ERC-721 / ERC-1155). */
export default async function TokenList({ searchParams, type, title, base }) {
  const sp = await searchParams;
  const { page, limit } = parsePagination(sp, { defaultLimit: 50 });
  const q = getParam(sp, 'q')?.slice(0, 64) || undefined;
  const sort = ['holders', 'recent', 'name'].includes(getParam(sp, 'sort')) ? getParam(sp, 'sort') : 'holders';
  await dbConnect();
  const { tokens, pagination } = await listTokens({ type, page, limit, sort, q });
  return (
    <Container>
      <PageHeader title={title} subtitle={`${formatNumber(pagination.total)} token contracts discovered by the indexer`}>
        <form className="flex gap-2" action={base}>
          <input name="q" defaultValue={q} placeholder="Search name or symbol" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary" />
          <select name="sort" defaultValue={sort} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" aria-label="Sort by">
            <option value="holders">Most holders</option>
            <option value="recent">Recently active</option>
            <option value="name">Name</option>
          </select>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover" type="submit">Apply</button>
        </form>
      </PageHeader>
      <Card className="mt-4">
        <div className="flex justify-end px-4 py-3"><Pagination base={base} params={{ q, sort, ps: limit }} page={page} totalPages={pagination.totalPages} /></div>
        {tokens.length ? (
          <Table>
            <thead><tr><Th>#</Th><Th>Token</Th><Th>Standard</Th><Th align="right">Total Supply</Th><Th align="right">Holders</Th><Th align="right">Last Activity</Th></tr></thead>
            <tbody>
              {tokens.map((t, i) => (
                <tr key={t.address} className="hover:bg-surface-2">
                  <Td className="text-muted">{(page - 1) * limit + i + 1}</Td>
                  <Td>
                    <Link href={`/token/${t.address}`} className="link font-medium">{t.name ?? 'Unnamed token'}</Link>
                    {t.symbol && <span className="ml-1 text-muted">({t.symbol})</span>}
                    <div className="hash text-xs text-muted">{truncateMiddle(checksum(t.address), 10, 8)}</div>
                  </Td>
                  <Td><Badge>{t.type}</Badge></Td>
                  <Td align="right">{t.totalSupply ? <TokenAmount value={t.totalSupply} decimals={t.decimals ?? 0} maxFraction={2} /> : '-'}</Td>
                  <Td align="right">{formatNumber(t.holdersCount)}</Td>
                  <Td align="right"><Link className="link" href={`/block/${t.lastTransferBlock}`}>#{formatNumber(t.lastTransferBlock)}</Link></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState>No tokens found</EmptyState>}
      </Card>
    </Container>
  );
}
