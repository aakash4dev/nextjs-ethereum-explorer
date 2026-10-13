import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaCoins } from 'react-icons/fa';
import CopyButton from '@/components/client/CopyButton';
import { Badge, Card, Container, DetailRow, EmptyState, Notice, PageHeader, Pagination, Progress, Table, Tabs, Td, Th } from '@/components/ui';
import { AddressLink, TokenAmount } from '@/components/links';
import { TokenTransfersTable } from '@/components/tables';
import { getToken, getTokenHolders, getTokenInventory, getNftMetadataUri, listTokenTransfers } from '@/lib/services/tokens';
import { getVerifiedContract } from '@/lib/services/contracts';
import { dbConnect } from '@/lib/db';
import { checksum, formatNumber } from '@/lib/format';
import { isAddress, parsePagination } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { address } = await params;
  return { title: `Token ${checksum(address)}` };
}

export default async function TokenPage({ params, searchParams }) {
  const { address: raw } = await params;
  const sp = await searchParams;
  if (!isAddress(raw)) notFound();
  const address = raw.toLowerCase();
  await dbConnect();
  const [token, verified] = await Promise.all([getToken(address), getVerifiedContract(address)]);
  if (!token) {
    return (
      <Container>
        <PageHeader title="Token" />
        <Notice tone="warning" className="mt-4">This address has not emitted any indexed token transfers. <Link className="link" href={`/address/${address}`}>View it as an address</Link>.</Notice>
      </Container>
    );
  }
  const nft = token.type !== 'ERC20';
  const tab = sp.tab ?? 'transfers';
  const { page, limit } = parsePagination(sp, { defaultLimit: nft && tab === 'inventory' ? 24 : 25 });
  const base = `/token/${address}`;
  let body;
  let pagination;
  if (tab === 'holders') {
    const r = await getTokenHolders(address, { page, limit });
    pagination = r.pagination;
    body = r.holders.length ? (
      <Table>
        <thead><tr><Th>Rank</Th><Th>Address</Th><Th align="right">Quantity</Th>{!nft && <Th align="right">Percentage</Th>}</tr></thead>
        <tbody>
          {r.holders.map((h, i) => (
            <tr key={h.holder}>
              <Td className="text-muted">{(page - 1) * limit + i + 1}</Td>
              <Td><AddressLink address={h.holder} meta={h.meta} truncate={false} /></Td>
              <Td align="right">{nft ? formatNumber(Number(h.balance)) : <TokenAmount value={h.balance} decimals={token.decimals} maxFraction={4} />}</Td>
              {!nft && (
                <Td align="right">
                  {h.percentage !== null ? <div className="ml-auto w-32"><div className="text-right">{h.percentage.toFixed(4)}%</div><Progress value={h.percentage} /></div> : '-'}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    ) : <EmptyState>No holders indexed</EmptyState>;
  } else if (tab === 'inventory' && nft) {
    const r = await getTokenInventory(address, { page, limit });
    pagination = r.pagination;
    const focus = sp.id ? r.items.find((x) => x.tokenId === sp.id) ?? { tokenId: sp.id } : null;
    const uri = focus ? await getNftMetadataUri(address, focus.tokenId, token.type) : null;
    body = (
      <div className="p-4">
        {focus && (
          <Card className="mb-4" title={`Token ID #${focus.tokenId}`}>
            <DetailRow label="Owner">{focus.owner ? <AddressLink address={focus.owner} truncate={false} /> : <span className="text-muted">{token.type === 'ERC1155' ? 'Multiple holders (ERC-1155)' : 'Unknown'}</span>}</DetailRow>
            <DetailRow label="Metadata URI"><span className="hash break-all">{uri ?? '-'}</span></DetailRow>
            <DetailRow label="Transfers"><Link className="link" href={`${base}?tab=transfers&id=${focus.tokenId}`}>View transfer history</Link></DetailRow>
          </Card>
        )}
        {r.items.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {r.items.map((it) => (
              <Link key={it.tokenId} href={`${base}?tab=inventory&id=${it.tokenId}`} className="rounded-xl border border-line p-3 text-sm hover:border-primary">
                <div className="flex aspect-square items-center justify-center rounded-lg bg-surface-3 text-2xl text-muted">#{it.tokenId.length > 6 ? `${it.tokenId.slice(0, 5)}…` : it.tokenId}</div>
                <div className="mt-2 truncate font-medium">Token #{it.tokenId}</div>
                {it.owner && <div className="hash truncate text-xs text-muted">Owner {it.owner.slice(0, 10)}…</div>}
              </Link>
            ))}
          </div>
        ) : <EmptyState>No items indexed</EmptyState>}
      </div>
    );
  } else {
    const r = await listTokenTransfers({ page, limit, token: address, tokenId: sp.id });
    pagination = r.pagination;
    body = <TokenTransfersTable transfers={r.transfers} meta={r.meta} hideToken nft={nft} />;
  }

  return (
    <Container>
      <PageHeader icon={<FaCoins className="text-muted" />} title={<>Token <span className="font-normal">{token.name ?? 'Unnamed'}</span> {token.symbol && <span className="text-muted">({token.symbol})</span>}</>}>
        <Badge>{token.type}</Badge>
        {verified && <Badge tone="success">Verified source</Badge>}
      </PageHeader>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Overview">
          <DetailRow label={nft ? 'Total Supply' : 'Max Total Supply'}>{token.totalSupply ? <TokenAmount value={token.totalSupply} decimals={token.decimals ?? 0} symbol={token.symbol} /> : <span className="text-muted">-</span>}</DetailRow>
          <DetailRow label="Holders">{formatNumber(token.holdersCount)}</DetailRow>
          <DetailRow label="Total Transfers">{formatNumber(token.transfersCount)}</DetailRow>
        </Card>
        <Card title="Other Info">
          <DetailRow label="Token Contract"><span className="flex items-center gap-1"><Link className="link hash" href={`/address/${address}`}>{checksum(address)}</Link> <CopyButton value={checksum(address)} /></span></DetailRow>
          {!nft && <DetailRow label="Decimals">{token.decimals ?? '-'}</DetailRow>}
          <DetailRow label="First Seen"><Link className="link" href={`/block/${token.firstSeenBlock}`}>Block #{formatNumber(token.firstSeenBlock)}</Link></DetailRow>
        </Card>
      </div>
      <div className="mt-6">
        <Tabs
          active={tab}
          tabs={[
            { key: 'transfers', label: 'Transfers', href: base },
            { key: 'holders', label: 'Holders', href: `${base}?tab=holders` },
            nft ? { key: 'inventory', label: 'Inventory', href: `${base}?tab=inventory` } : null,
            { key: 'contract', label: 'Contract', href: `/address/${address}?tab=contract` },
          ]}
        />
      </div>
      <Card className="mt-3">
        {pagination && pagination.totalPages > 1 && <div className="flex justify-end px-4 py-3"><Pagination base={base} params={{ tab, ps: limit, id: sp.id }} page={page} totalPages={pagination.totalPages} /></div>}
        {body}
      </Card>
    </Container>
  );
}
