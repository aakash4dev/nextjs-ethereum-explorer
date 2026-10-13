import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import TimeAgo from './client/TimeAgo';
import { Badge, EmptyState, Table, Td, Th } from './ui';
import { AddressLink, BlockLink, MethodBadge, NativeAmount, TokenAmount, TokenLink, TxLink } from './links';
import { formatNumber } from '@/lib/format';

function Direction({ from, to, owner }) {
  if (!owner) return <FaArrowRight className="h-3 w-3 text-success" />;
  if (from === owner && to === owner) return <Badge>SELF</Badge>;
  if (from === owner) return <Badge tone="warning">OUT</Badge>;
  return <Badge tone="success">IN</Badge>;
}

export function TransactionsTable({ transactions, owner, empty = 'No transactions found' }) {
  if (!transactions.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Transaction Hash</Th><Th>Method</Th><Th>Block</Th><Th>Age</Th><Th>From</Th><Th /><Th>To</Th><Th align="right">Amount</Th><Th align="right">Txn Fee</Th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.hash} className="hover:bg-surface-2">
            <Td><TxLink hash={t.hash} failed={t.status === 0} /></Td>
            <Td><MethodBadge method={t.method ?? (t.methodId ? t.methodId : 'Transfer')} /></Td>
            <Td><BlockLink number={t.blockNumber} /></Td>
            <Td className="text-muted"><TimeAgo value={t.timestamp} /></Td>
            <Td className="max-w-[200px]"><AddressLink address={t.from} meta={t.fromMeta} current={owner === t.from} /></Td>
            <Td><Direction from={t.from} to={t.to ?? t.contractAddress} owner={owner} /></Td>
            <Td className="max-w-[200px]">
              {t.to ? (
                <AddressLink address={t.to} meta={t.toMeta} current={owner === t.to} />
              ) : (
                <span className="inline-flex items-center gap-1 text-xs">
                  <span className="text-muted">Create:</span> <AddressLink address={t.contractAddress} meta={t.toMeta} isContract current={owner === t.contractAddress} />
                </span>
              )}
            </Td>
            <Td align="right"><NativeAmount wei={t.value} maxFraction={6} /></Td>
            <Td align="right" className="text-xs text-muted"><NativeAmount wei={t.fee} maxFraction={6} /></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function InternalTxTable({ rows, meta = {}, owner, showParent = true }) {
  if (!rows.length) return <EmptyState>No internal transactions found</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          {showParent && <Th>Parent Txn Hash</Th>}<Th>Block</Th><Th>Age</Th><Th>Type</Th><Th>From</Th><Th /><Th>To</Th><Th align="right">Value</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.txHash}-${r.traceAddress}`} className="hover:bg-surface-2">
            {showParent && <Td><TxLink hash={r.txHash} failed={Boolean(r.error)} /></Td>}
            <Td><BlockLink number={r.blockNumber} /></Td>
            <Td className="text-muted"><TimeAgo value={r.timestamp} /></Td>
            <Td><Badge tone={r.error ? 'danger' : 'default'}>{(r.callType ?? r.type ?? 'call').toUpperCase()}</Badge></Td>
            <Td className="max-w-[200px]"><AddressLink address={r.from} meta={meta[r.from]} current={owner === r.from} /></Td>
            <Td><Direction from={r.from} to={r.to} owner={owner} /></Td>
            <Td className="max-w-[200px]"><AddressLink address={r.to} meta={meta[r.to]} current={owner === r.to} isContract={r.type?.startsWith('create')} /></Td>
            <Td align="right"><NativeAmount wei={r.value} maxFraction={6} /></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function TokenTransfersTable({ transfers, meta = {}, owner, hideToken = false, nft = false }) {
  if (!transfers.length) return <EmptyState>No token transfers found</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Transaction Hash</Th><Th>Block</Th><Th>Age</Th><Th>From</Th><Th /><Th>To</Th>
          {nft ? <><Th>Type</Th><Th>Item</Th></> : <Th align="right">Amount</Th>}
          {!hideToken && <Th>Token</Th>}
        </tr>
      </thead>
      <tbody>
        {transfers.map((t) => (
          <tr key={`${t.txHash}-${t.logIndex}-${t.batchIndex}`} className="hover:bg-surface-2">
            <Td><TxLink hash={t.txHash} /></Td>
            <Td><BlockLink number={t.blockNumber} /></Td>
            <Td className="text-muted"><TimeAgo value={t.timestamp} /></Td>
            <Td className="max-w-[200px]"><AddressLink address={t.from} meta={meta[t.from]} current={owner === t.from} /></Td>
            <Td><Direction from={t.from} to={t.to} owner={owner} /></Td>
            <Td className="max-w-[200px]"><AddressLink address={t.to} meta={meta[t.to]} current={owner === t.to} /></Td>
            {nft ? (
              <>
                <Td><Badge>{t.tokenType}</Badge></Td>
                <Td>
                  <Link className="link" href={`/token/${t.token}?tab=inventory&id=${t.tokenId}`}>#{t.tokenId.length > 12 ? `${t.tokenId.slice(0, 10)}…` : t.tokenId}</Link>
                  {t.tokenType === 'ERC1155' && <span className="ml-1 text-xs text-muted">×{formatNumber(BigInt(t.value))}</span>}
                </Td>
              </>
            ) : (
              <Td align="right"><TokenAmount value={t.value} decimals={t.tokenInfo?.decimals} symbol={hideToken ? '' : null} /></Td>
            )}
            {!hideToken && <Td className="max-w-[220px]"><TokenLink address={t.token} info={t.tokenInfo} /></Td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
