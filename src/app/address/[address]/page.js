import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaCheckCircle, FaDownload, FaFileContract, FaUser } from 'react-icons/fa';
import CopyButton from '@/components/client/CopyButton';
import TimeAgo from '@/components/client/TimeAgo';
import { ReadContract, SourceViewer, WriteContract } from '@/components/client/ContractInteract';
import { Badge, Card, CodeBlock, Container, DetailRow, EmptyState, Notice, PageHeader, Pagination, Table, Tabs, Td, Th } from '@/components/ui';
import { AddressLink, BlockLink, NativeAmount, TokenAmount, TokenLink, TxLink } from '@/components/links';
import { InternalTxTable, TokenTransfersTable, TransactionsTable } from '@/components/tables';
import { getAddressLogs, getAddressOverview } from '@/lib/services/addresses';
import { listInternalTransactions, listTransactions } from '@/lib/services/transactions';
import { listTokenTransfers } from '@/lib/services/tokens';
import { getMinedBlocks, listWithdrawals } from '@/lib/services/blocks';
import { getVerifiedContract } from '@/lib/services/contracts';
import { chainId } from '@/lib/services/common';
import { getClient } from '@/lib/rpc';
import { dbConnect } from '@/lib/db';
import { checksum, formatNumber, formatUsd } from '@/lib/format';
import { isAddress, parsePagination } from '@/lib/validation';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { address } = await params;
  return { title: `Address ${checksum(address)}`, description: `${config.chainName} address ${address}: balance, transactions, token holdings and contract details.` };
}

function ContractTab({ address, overview, sub, verified, implementation, cid, bytecode }) {
  const base = `/address/${address}?tab=contract`;
  const subtabs = [
    { key: 'code', label: 'Code', href: `${base}&sub=code` },
    verified && { key: 'read', label: 'Read Contract', href: `${base}&sub=read` },
    verified && { key: 'write', label: 'Write Contract', href: `${base}&sub=write` },
    implementation && { key: 'readProxy', label: 'Read as Proxy', href: `${base}&sub=readProxy` },
    implementation && { key: 'writeProxy', label: 'Write as Proxy', href: `${base}&sub=writeProxy` },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <Tabs tabs={subtabs} active={sub} />
        {!verified && <Link href={`/verifyContract?a=${address}`} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover">Verify &amp; Publish</Link>}
      </div>
      {overview.proxy && (
        <Notice tone="info" className="m-4">
          This contract appears to be a proxy ({overview.proxy.type}). Implementation:{' '}
          <AddressLink address={overview.proxy.implementation} truncate={false} />{' '}
          {overview.proxy.implementationVerified ? <Badge tone="success">Verified{overview.proxy.implementationName ? `: ${overview.proxy.implementationName}` : ''}</Badge> : <Badge>Unverified</Badge>}
        </Notice>
      )}
      {sub === 'code' && (
        <div className="space-y-4 p-4">
          {verified ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium"><FaCheckCircle className="text-success" /> Contract Source Code Verified <Badge tone={verified.matchType === 'full' ? 'success' : 'warning'}>{verified.matchType === 'full' ? 'Exact Match' : 'Partial Match'}</Badge></div>
              <div className="grid gap-x-8 gap-y-2 rounded-lg border border-line p-4 text-sm md:grid-cols-2">
                <div><span className="text-muted">Contract Name:</span> <span className="font-medium">{verified.name}</span></div>
                <div><span className="text-muted">Optimization Enabled:</span> {verified.optimizationUsed ? `Yes with ${verified.runs} runs` : 'No'}</div>
                <div><span className="text-muted">Compiler Version:</span> {verified.compilerVersion}</div>
                <div><span className="text-muted">Other Settings:</span> {verified.evmVersion ?? 'default'} EVM version{verified.licenseType ? `, ${verified.licenseType} license` : ''}</div>
                <div><span className="text-muted">Verified At:</span> <TimeAgo value={verified.verifiedAt} /></div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Contract Source Code (Solidity)</h3>
                <SourceViewer files={verified.sourceFiles} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Contract ABI</h3><CopyButton value={JSON.stringify(verified.abi)} label="Copy ABI" /></div>
                <CodeBlock maxHeight="14rem">{JSON.stringify(verified.abi)}</CodeBlock>
              </div>
              {verified.constructorArguments && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Constructor Arguments (ABI-encoded)</h3>
                  <CodeBlock maxHeight="10rem">{verified.constructorArguments}</CodeBlock>
                </div>
              )}
              {verified.libraries && Object.keys(verified.libraries).length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Linked Libraries</h3>
                  <ul className="text-sm">{Object.entries(verified.libraries).map(([k, v]) => <li key={k}>{k}: <AddressLink address={v} /></li>)}</ul>
                </div>
              )}
            </>
          ) : (
            <Notice tone="info">
              Are you the contract creator? <Link className="link font-medium" href={`/verifyContract?a=${address}`}>Verify and Publish</Link> your contract source code today!
            </Notice>
          )}
          <div>
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Deployed Bytecode ({formatNumber(overview.codeSize)} bytes)</h3><CopyButton value={bytecode ?? ''} label="Copy bytecode" /></div>
            <CodeBlock maxHeight="14rem">{bytecode}</CodeBlock>
          </div>
        </div>
      )}
      {sub === 'read' && verified && <ReadContract address={address} abi={verified.abi} />}
      {sub === 'write' && verified && <WriteContract address={address} abi={verified.abi} chainId={cid} />}
      {sub === 'readProxy' && implementation && <ReadContract address={address} abi={implementation.abi} implementation={implementation.address} />}
      {sub === 'writeProxy' && implementation && <WriteContract address={address} abi={implementation.abi} chainId={cid} />}
      {(sub === 'readProxy' || sub === 'writeProxy') && !implementation && <EmptyState>Implementation contract is not verified.</EmptyState>}
    </div>
  );
}

export default async function AddressPage({ params, searchParams }) {
  const { address: raw } = await params;
  const sp = await searchParams;
  if (!isAddress(raw)) notFound();
  const address = raw.toLowerCase();
  await dbConnect();
  const o = await getAddressOverview(address);
  const tab = sp.tab ?? 'txs';
  const { page, limit } = parsePagination(sp, { defaultLimit: 25 });
  const base = `/address/${address}`;
  const pageParams = { tab, ps: limit };

  let body = null;
  let pagination = null;
  if (tab === 'txs') {
    const r = await listTransactions({ page, limit, address });
    pagination = r.pagination;
    body = <TransactionsTable transactions={r.transactions} owner={address} />;
  } else if (tab === 'internal') {
    const r = await listInternalTransactions({ page, limit, address });
    pagination = r.pagination;
    body = <InternalTxTable rows={r.internalTransactions} meta={r.meta} owner={address} />;
  } else if (tab === 'erc20' || tab === 'nft') {
    const r = await listTokenTransfers({ page, limit, address, type: tab === 'erc20' ? 'ERC20' : 'NFT' });
    pagination = r.pagination;
    body = <TokenTransfersTable transfers={r.transfers} meta={r.meta} owner={address} nft={tab === 'nft'} />;
  } else if (tab === 'events') {
    const r = await getAddressLogs(address, { page, limit });
    pagination = r.pagination;
    body = r.logs.length ? (
      <Table>
        <thead><tr><Th>Txn Hash</Th><Th>Block</Th><Th>Age</Th><Th>Method / Event</Th><Th>Logs</Th></tr></thead>
        <tbody>
          {r.logs.map((l) => (
            <tr key={`${l.blockNumber}-${l.logIndex}`} className="align-top">
              <Td><TxLink hash={l.txHash} /></Td>
              <Td><BlockLink number={l.blockNumber} /></Td>
              <Td className="text-muted"><TimeAgo value={l.timestamp} /></Td>
              <Td><span className="hash text-xs">{l.decoded?.name ?? l.topic0?.slice(0, 10) ?? '(anonymous)'}</span></Td>
              <Td className="whitespace-normal">
                {l.decoded ? (
                  <div className="hash max-w-xl text-xs">{l.decoded.signature}<div className="mt-1 text-muted">{l.decoded.args.map((a) => `${a.name}: ${typeof a.value === 'object' ? JSON.stringify(a.value) : a.value}`).join(' · ')}</div></div>
                ) : (
                  <div className="hash max-w-xl break-all text-xs">{[l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean).join(' ')}<div className="text-muted">{l.data}</div></div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    ) : <EmptyState>No events found</EmptyState>;
  } else if (tab === 'withdrawals') {
    const r = await listWithdrawals({ page, limit, address });
    pagination = r.pagination;
    body = r.withdrawals.length ? (
      <Table>
        <thead><tr><Th>Index</Th><Th>Block</Th><Th>Age</Th><Th>Validator</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>{r.withdrawals.map((w) => <tr key={w.index}><Td>{formatNumber(w.index)}</Td><Td><BlockLink number={w.blockNumber} /></Td><Td className="text-muted"><TimeAgo value={w.timestamp} /></Td><Td>{w.validatorIndex}</Td><Td align="right"><NativeAmount wei={w.amount} /></Td></tr>)}</tbody>
      </Table>
    ) : <EmptyState>No withdrawals</EmptyState>;
  } else if (tab === 'mined') {
    const r = await getMinedBlocks(address, { page, limit });
    pagination = r.pagination;
    body = r.blocks.length ? (
      <Table>
        <thead><tr><Th>Block</Th><Th>Age</Th><Th>Txn</Th><Th>Gas Used</Th><Th align="right">Reward</Th></tr></thead>
        <tbody>{r.blocks.map((b) => <tr key={b.number}><Td><BlockLink number={b.number} /></Td><Td className="text-muted"><TimeAgo value={b.timestamp} /></Td><Td>{b.transactionCount}</Td><Td>{formatNumber(b.gasUsed)}</Td><Td align="right"><NativeAmount wei={b.priorityFees} maxFraction={6} /></Td></tr>)}</tbody>
      </Table>
    ) : <EmptyState>No produced blocks</EmptyState>;
  } else if (tab === 'contract') {
    const [verified, implementation, cid, bytecode] = await Promise.all([
      getVerifiedContract(address),
      o.proxy?.implementation ? getVerifiedContract(o.proxy.implementation) : null,
      chainId(),
      getClient().getCode({ address }).catch(() => null),
    ]);
    body = <ContractTab address={address} overview={o} sub={sp.sub ?? 'code'} verified={verified} implementation={implementation} cid={cid} bytecode={bytecode} />;
  }

  const erc20Holdings = o.holdings.filter((h) => h.tokenType === 'ERC20');
  const nftHoldings = o.holdings.filter((h) => h.tokenType !== 'ERC20');
  const exportKind = tab === 'internal' ? 'internal' : tab === 'erc20' || tab === 'nft' ? 'tokens' : 'transactions';

  return (
    <Container>
      <PageHeader
        icon={o.isContract ? <FaFileContract className="text-muted" /> : <FaUser className="text-muted" />}
        title={
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {o.isContract ? 'Contract' : 'Address'} <span className="hash min-w-0 truncate text-base font-normal">{checksum(address)}</span> <CopyButton value={checksum(address)} />
          </span>
        }
      >
        {o.label && <Badge tone="primary">{o.label}</Badge>}
        {o.verified && <Badge tone="success"><FaCheckCircle /> {o.verified.name}</Badge>}
        {o.delegation && <Badge tone="warning" title="EIP-7702 delegated account">Delegated to {o.delegation.slice(0, 10)}…</Badge>}
      </PageHeader>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Overview">
          <DetailRow label={`${config.nativeSymbol} Balance`}><NativeAmount wei={o.balance ?? '0'} /></DetailRow>
          <DetailRow label={`${config.nativeSymbol} Value`}>{o.balanceUsd !== null ? <>{formatUsd(o.balanceUsd)} <span className="text-muted">(@ {formatUsd(o.price?.usd)}/{config.nativeSymbol})</span></> : <span className="text-muted">-</span>}</DetailRow>
          <DetailRow label="Token Holdings">
            {o.holdings.length ? (
              <details className="group">
                <summary className="cursor-pointer list-none rounded-md border border-line px-3 py-1.5 text-sm hover:border-primary">
                  {erc20Holdings.length} ERC-20 · {nftHoldings.length} NFT holdings <span className="text-muted">▾</span>
                </summary>
                <ul className="scrollbar-thin mt-2 max-h-72 divide-y divide-line overflow-auto rounded-md border border-line">
                  {o.holdings.map((h) => (
                    <li key={`${h.token}-${h.tokenId}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <TokenLink address={h.token} info={h.tokenInfo} />
                      <span className="shrink-0 text-xs">
                        {h.tokenType === 'ERC20' ? <TokenAmount value={h.balance} decimals={h.tokenInfo?.decimals} symbol={h.tokenInfo?.symbol} /> : <>{h.balance} {h.tokenType === 'ERC1155' ? `of #${h.tokenId}` : 'NFT'}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : <span className="text-muted">No indexed token balances</span>}
          </DetailRow>
        </Card>
        <Card title="More Info">
          {o.label && <DetailRow label="Public Name Tag"><Badge tone="primary">{o.label}</Badge></DetailRow>}
          {o.isContract ? (
            <DetailRow label="Contract Creator">
              {o.record?.creator ? (
                <span className="flex flex-wrap items-center gap-1">
                  <AddressLink address={o.record.creator} meta={o.creatorMeta} /> <span className="text-muted">at txn</span> <TxLink hash={o.record.creationTxHash} />
                </span>
              ) : <span className="text-muted">Not indexed</span>}
            </DetailRow>
          ) : (
            <DetailRow label="Transactions Sent" hint="Account nonce (number of transactions sent).">
              Latest nonce: {o.nonce ?? '-'}
            </DetailRow>
          )}
          {o.token && <DetailRow label="Token Tracker"><TokenLink address={address} info={o.token} /> <Badge className="ml-1">{o.token.type}</Badge></DetailRow>}
          <DetailRow label="First Txn Sent">{o.firstTx ? <span className="flex flex-wrap items-center gap-2"><TxLink hash={o.firstTx.hash} /> <span className="text-xs text-muted"><TimeAgo value={o.firstTx.timestamp} /></span></span> : <span className="text-muted">-</span>}</DetailRow>
          <DetailRow label="Last Txn">{o.lastTx ? <span className="flex flex-wrap items-center gap-2"><TxLink hash={o.lastTx.hash} /> <span className="text-xs text-muted"><TimeAgo value={o.lastTx.timestamp} /></span></span> : <span className="text-muted">-</span>}</DetailRow>
          {o.isContract && <DetailRow label="Bytecode Size">{formatNumber(o.codeSize)} bytes</DetailRow>}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          active={tab}
          tabs={[
            { key: 'txs', label: 'Transactions', count: o.counts.transactions, href: base },
            o.counts.internal ? { key: 'internal', label: 'Internal Txns', count: o.counts.internal, href: `${base}?tab=internal` } : null,
            o.counts.tokenTransfers ? { key: 'erc20', label: 'Token Transfers (ERC-20)', href: `${base}?tab=erc20` } : null,
            o.counts.tokenTransfers ? { key: 'nft', label: 'NFT Transfers', href: `${base}?tab=nft` } : null,
            o.isContract ? { key: 'contract', label: o.verified ? 'Contract ✓' : 'Contract', href: `${base}?tab=contract` } : null,
            o.isContract ? { key: 'events', label: 'Events', href: `${base}?tab=events` } : null,
            o.counts.withdrawals ? { key: 'withdrawals', label: 'Withdrawals', count: o.counts.withdrawals, href: `${base}?tab=withdrawals` } : null,
            o.counts.minedBlocks ? { key: 'mined', label: 'Produced Blocks', count: o.counts.minedBlocks, href: `${base}?tab=mined` } : null,
          ]}
        />
        {['txs', 'internal', 'erc20', 'nft'].includes(tab) && (
          <a href={`/api/address/${address}/export?kind=${exportKind}`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary"><FaDownload /> Download CSV</a>
        )}
      </div>
      <Card className="mt-3">
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-end px-4 py-3"><Pagination base={base} params={pageParams} page={page} totalPages={Math.min(pagination.totalPages, Math.floor(10_000 / limit))} /></div>
        )}
        {body}
      </Card>
    </Container>
  );
}
