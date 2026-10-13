import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaFire, FaArrowRight, FaCube } from 'react-icons/fa';
import TimeAgo from '@/components/client/TimeAgo';
import CopyButton from '@/components/client/CopyButton';
import InputData from '@/components/client/InputData';
import CallTrace from '@/components/client/CallTrace';
import AutoRefresh from '@/components/client/AutoRefresh';
import { Badge, Card, CodeBlock, Container, DetailRow, EmptyState, Notice, PageHeader, Progress, StatusBadge, Tabs } from '@/components/ui';
import { AddressLink, BlockLink, NativeAmount, TokenAmount, TokenLink } from '@/components/links';
import { getTransaction, getTransactionTrace } from '@/lib/services/transactions';
import { getNativePrice } from '@/lib/services/market';
import { dbConnect } from '@/lib/db';
import { formatDateUtc, formatEther, formatGwei, formatNumber, formatUsd, toBigInt, txTypeLabel, weiToNumber } from '@/lib/format';
import { isHash } from '@/lib/validation';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { hash } = await params;
  return { title: `Transaction ${hash.slice(0, 18)}…`, description: `${config.chainName} transaction ${hash}: status, value, fees, token transfers, logs and internal calls.` };
}

function UsdHint({ wei, price }) {
  if (!price) return null;
  return <span className="ml-1 text-muted">({formatUsd(weiToNumber(wei) * price.usd)})</span>;
}

export default async function TxPage({ params, searchParams }) {
  const { hash: raw } = await params;
  const { tab = 'overview' } = await searchParams;
  if (!isHash(raw)) notFound();
  const hash = raw.toLowerCase();
  await dbConnect();
  const [data, price] = await Promise.all([getTransaction(hash), getNativePrice()]);

  if (!data) {
    return (
      <Container>
        <PageHeader title="Transaction Details" />
        <Notice tone="warning" className="mt-4">
          Sorry, we are unable to locate this transaction hash: <span className="hash break-all">{hash}</span>. It may not have been broadcast yet or may have been dropped from the mempool.
        </Notice>
      </Container>
    );
  }

  if (data.pending) {
    const t = data.transaction;
    return (
      <Container>
        <AutoRefresh intervalMs={4000} />
        <PageHeader title="Transaction Details"><Badge tone="warning">Pending</Badge></PageHeader>
        <Card className="mt-4">
          <DetailRow label="Transaction Hash"><span className="hash break-all">{hash}</span></DetailRow>
          <DetailRow label="Status"><StatusBadge pending /></DetailRow>
          <DetailRow label="From"><AddressLink address={t.from} truncate={false} /></DetailRow>
          <DetailRow label="To">{t.to ? <AddressLink address={t.to} truncate={false} /> : 'Contract Creation'}</DetailRow>
          <DetailRow label="Value"><NativeAmount wei={t.value} /></DetailRow>
          <DetailRow label="Gas Limit">{formatNumber(t.gas)}</DetailRow>
          <DetailRow label="Max Fee">{t.maxFeePerGas ? `${formatGwei(t.maxFeePerGas)} Gwei` : t.gasPrice ? `${formatGwei(t.gasPrice)} Gwei` : '-'}</DetailRow>
          <DetailRow label="Nonce">{t.nonce}</DetailRow>
          <DetailRow label="Input Data"><InputData input={t.input} /></DetailRow>
        </Card>
      </Container>
    );
  }

  const { transaction: tx, block, confirmations, decodedInput, logs, tokenTransfers, internalTransactions, meta, source } = data;
  const failed = tx.status === 0;
  const trace = failed && tab === 'overview' ? await getTransactionTrace(hash).catch(() => null) : null;
  const target = tx.to ?? tx.contractAddress;
  const erc20 = tokenTransfers.filter((t) => t.tokenType === 'ERC20');
  const nfts = tokenTransfers.filter((t) => t.tokenType !== 'ERC20');
  const gasPct = tx.gas ? (tx.gasUsed / tx.gas) * 100 : 0;
  const baseFee = toBigInt(block?.baseFeePerGas);
  const maxFee = toBigInt(tx.maxFeePerGas);
  const savings = maxFee > 0n ? (maxFee - toBigInt(tx.effectiveGasPrice)) * BigInt(tx.gasUsed ?? 0) : 0n;
  const blobFee = tx.blobGasUsed && tx.blobGasPrice ? BigInt(tx.blobGasUsed) * BigInt(tx.blobGasPrice) : 0n;
  const internalValue = internalTransactions.filter((i) => i.value !== '0');
  const base = `/tx/${hash}`;

  return (
    <Container>
      {confirmations !== null && confirmations < 3 && <AutoRefresh intervalMs={6000} />}
      <PageHeader title="Transaction Details">
        {source === 'rpc' && <Badge tone="warning" title="Not yet indexed; data read live from the node">Live from node</Badge>}
      </PageHeader>
      <Tabs
        className="mt-4"
        active={tab}
        tabs={[
          { key: 'overview', label: 'Overview', href: base },
          { key: 'logs', label: 'Logs', count: logs.length, href: `${base}?tab=logs` },
          config.traceMode !== 'off' ? { key: 'trace', label: 'Internal Txns', count: internalTransactions.length || undefined, href: `${base}?tab=trace` } : null,
        ]}
      />

      {tab === 'overview' && (
        <>
          <Card className="mt-4">
            <DetailRow label="Transaction Hash" hint="Unique identifier of the transaction.">
              <span className="hash inline-flex items-center gap-1 break-all">{tx.hash} <CopyButton value={tx.hash} /></span>
            </DetailRow>
            <DetailRow label="Status" hint="Whether the transaction executed successfully.">
              <StatusBadge status={tx.status} />
              {failed && trace?.revertReason && <span className="ml-2 text-sm text-danger">{trace.revertReason}</span>}
            </DetailRow>
            <DetailRow label="Block" hint="Block in which the transaction was included.">
              <span className="inline-flex items-center gap-2">
                <FaCube className="text-muted" /> <BlockLink number={tx.blockNumber} />
                {confirmations !== null && <Badge>{formatNumber(confirmations)} Block Confirmations</Badge>}
              </span>
            </DetailRow>
            <DetailRow label="Timestamp" hint="When the block containing the transaction was produced.">
              <TimeAgo value={tx.timestamp} /> <span className="text-muted">({formatDateUtc(tx.timestamp)})</span>
            </DetailRow>
          </Card>

          <Card className="mt-4">
            <DetailRow label="From" hint="Sender of the transaction.">
              <AddressLink address={tx.from} meta={meta[tx.from]} truncate={false} />
            </DetailRow>
            <DetailRow label={tx.to ? 'To' : 'Interacted With (To)'} hint="Receiver (address or contract) of the transaction.">
              {tx.to ? (
                <span className="flex flex-wrap items-center gap-2">
                  <AddressLink address={tx.to} meta={meta[tx.to]} truncate={false} />
                  {meta[tx.to]?.verified === undefined && meta[tx.to]?.contractName === undefined && tx.input !== '0x' && <Badge>Contract</Badge>}
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-1">
                  [<AddressLink address={tx.contractAddress} meta={meta[tx.contractAddress]} isContract truncate={false} /> Created]
                </span>
              )}
            </DetailRow>
            {internalValue.length > 0 && (
              <DetailRow label="Internal Transfers" hint="Value moved by contract calls during execution.">
                <ul className="space-y-1">
                  {internalValue.slice(0, 20).map((i) => (
                    <li key={i.traceAddress} className="flex flex-wrap items-center gap-1 text-xs">
                      <FaArrowRight className="text-muted" /> Transfer <NativeAmount wei={i.value} maxFraction={6} /> From <AddressLink address={i.from} meta={meta[i.from]} copy={false} /> To <AddressLink address={i.to} meta={meta[i.to]} copy={false} />
                    </li>
                  ))}
                </ul>
                {internalValue.length > 20 && <Link className="link text-xs" href={`${base}?tab=trace`}>View all {internalValue.length}</Link>}
              </DetailRow>
            )}
            {erc20.length > 0 && (
              <DetailRow label={`ERC-20 Tokens Transferred (${erc20.length})`} hint="Fungible token transfers emitted by this transaction.">
                <ul className="space-y-1.5">
                  {erc20.map((t) => (
                    <li key={`${t.logIndex}`} className="flex flex-wrap items-center gap-1 text-sm">
                      <FaArrowRight className="text-muted" /> <span className="text-muted">From</span> <AddressLink address={t.from} meta={meta[t.from]} copy={false} />
                      <span className="text-muted">To</span> <AddressLink address={t.to} meta={meta[t.to]} copy={false} />
                      <span className="text-muted">For</span> <span className="font-medium"><TokenAmount value={t.value} decimals={t.tokenInfo?.decimals} /></span>
                      <TokenLink address={t.token} info={t.tokenInfo} />
                    </li>
                  ))}
                </ul>
              </DetailRow>
            )}
            {nfts.length > 0 && (
              <DetailRow label={`NFT Tokens Transferred (${nfts.length})`} hint="ERC-721 / ERC-1155 transfers emitted by this transaction.">
                <ul className="space-y-1.5">
                  {nfts.map((t) => (
                    <li key={`${t.logIndex}-${t.batchIndex}`} className="flex flex-wrap items-center gap-1 text-sm">
                      <Badge>{t.tokenType}</Badge> {t.tokenType === 'ERC1155' && <span>{formatNumber(BigInt(t.value))} of</span>}
                      <span className="text-muted">Token ID</span> <Link className="link" href={`/token/${t.token}?tab=inventory&id=${t.tokenId}`}>[{t.tokenId.length > 16 ? `${t.tokenId.slice(0, 14)}…` : t.tokenId}]</Link>
                      <TokenLink address={t.token} info={t.tokenInfo} />
                      <span className="text-muted">From</span> <AddressLink address={t.from} meta={meta[t.from]} copy={false} />
                      <span className="text-muted">To</span> <AddressLink address={t.to} meta={meta[t.to]} copy={false} />
                    </li>
                  ))}
                </ul>
              </DetailRow>
            )}
          </Card>

          <Card className="mt-4">
            <DetailRow label="Value" hint="Native currency transferred from sender to receiver.">
              <NativeAmount wei={tx.value} /> <UsdHint wei={tx.value} price={price} />
            </DetailRow>
            <DetailRow label="Transaction Fee" hint="Gas used × effective gas price, paid to the network.">
              <NativeAmount wei={tx.fee} /> <UsdHint wei={tx.fee} price={price} />
            </DetailRow>
            <DetailRow label="Gas Price" hint="Effective price paid per unit of gas.">
              {formatGwei(tx.effectiveGasPrice ?? tx.gasPrice)} Gwei <span className="text-muted">({formatEther(tx.effectiveGasPrice ?? tx.gasPrice)} {config.nativeSymbol})</span>
            </DetailRow>
            <DetailRow label="Gas Limit & Usage by Txn" hint="Maximum gas allowed vs gas actually consumed.">
              {formatNumber(tx.gas)} | {formatNumber(tx.gasUsed)} <span className="text-muted">({gasPct.toFixed(2)}%)</span>
              <div className="mt-1 max-w-xs"><Progress value={gasPct} /></div>
            </DetailRow>
            {tx.maxFeePerGas && (
              <DetailRow label="Gas Fees" hint="EIP-1559 fee parameters.">
                <span className="text-muted">Base:</span> {formatGwei(baseFee)} Gwei <span className="mx-1 text-muted">|</span>
                <span className="text-muted">Max:</span> {formatGwei(tx.maxFeePerGas)} Gwei <span className="mx-1 text-muted">|</span>
                <span className="text-muted">Max Priority:</span> {formatGwei(tx.maxPriorityFeePerGas)} Gwei
              </DetailRow>
            )}
            {block?.baseFeePerGas && (
              <DetailRow label="Burnt & Txn Savings Fees" hint="Base fee burnt, and the difference between max fee and fee actually paid.">
                <span className="inline-flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1"><FaFire className="text-warning" /> Burnt: <NativeAmount wei={tx.burntFee} /></span>
                  {savings > 0n && <span>💸 Txn Savings: <NativeAmount wei={savings.toString()} /></span>}
                </span>
              </DetailRow>
            )}
            {tx.blobGasUsed ? (
              <DetailRow label="Blob Gas" hint="EIP-4844 data blobs carried by this transaction.">
                {formatNumber(tx.blobGasUsed)} blob gas ({tx.blobVersionedHashes?.length ?? 0} blobs) · Blob gas price {formatGwei(tx.blobGasPrice)} Gwei · Blob fee <NativeAmount wei={blobFee.toString()} />
              </DetailRow>
            ) : null}
            <DetailRow label="Other Attributes" hint="Transaction type, nonce and position in the block.">
              <span className="flex flex-wrap gap-2">
                <Badge>Txn Type: {txTypeLabel(tx.type)}</Badge>
                <Badge>Nonce: {tx.nonce}</Badge>
                <Badge>Position In Block: {tx.transactionIndex}</Badge>
              </span>
            </DetailRow>
            <DetailRow label="Input Data" hint="Calldata sent with the transaction.">
              <InputData input={tx.input} decoded={decodedInput} />
            </DetailRow>
            {tx.accessList?.length > 0 && (
              <DetailRow label="Access List" hint="EIP-2930 pre-declared storage access.">
                <CodeBlock maxHeight="12rem">{JSON.stringify(tx.accessList, null, 2)}</CodeBlock>
              </DetailRow>
            )}
            {tx.authorizationList?.length > 0 && (
              <DetailRow label="Authorizations" hint="EIP-7702 delegations set by this transaction.">
                <CodeBlock maxHeight="12rem">{JSON.stringify(tx.authorizationList, null, 2)}</CodeBlock>
              </DetailRow>
            )}
          </Card>
        </>
      )}

      {tab === 'logs' && (
        <Card className="mt-4" title={`Transaction Receipt Event Logs (${logs.length})`}>
          {logs.length ? (
            <ul className="divide-y divide-line">
              {logs.map((l) => (
                <li key={l.logIndex} className="flex gap-4 px-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-sm font-semibold text-success">{l.logIndex}</div>
                  <div className="min-w-0 flex-1 space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2"><span className="w-16 font-medium">Address</span><AddressLink address={l.address} meta={meta[l.address]} truncate={false} /></div>
                    {l.decoded && (
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="w-16 font-medium">Name</span>
                        <span className="hash break-all">{l.decoded.signature}</span>
                        {l.decoded.source === 'signature' && <Badge>signature DB</Badge>}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <span className="w-16 shrink-0 font-medium">Topics</span>
                      <ol className="hash min-w-0 space-y-0.5 text-xs">
                        {[l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean).map((t, i) => (
                          <li key={i} className="break-all"><span className="mr-1 rounded bg-surface-3 px-1">{i}</span>{t}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-16 shrink-0 font-medium">Data</span>
                      <div className="min-w-0 flex-1">
                        {l.decoded?.args?.filter((a) => !a.indexed).length ? (
                          <table className="text-xs">
                            <tbody>
                              {l.decoded.args.map((a) => (
                                <tr key={a.name} className="align-top">
                                  <td className="pr-3 text-muted">{a.name}{a.indexed ? ' (indexed)' : ''}</td>
                                  <td className="hash break-all">{typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <CodeBlock maxHeight="8rem">{l.data}</CodeBlock>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No event logs</EmptyState>
          )}
        </Card>
      )}

      {tab === 'trace' && (
        <Card className="mt-4" title="Internal Transactions (call trace)">
          <CallTrace hash={hash} />
        </Card>
      )}
      {target && tab === 'overview' && (
        <p className="mt-3 text-xs text-muted">
          A transaction is a cryptographically signed instruction that changes the blockchain state. <Link className="link" href={`/address/${target}`}>View {tx.to ? 'recipient' : 'created contract'}</Link>
        </p>
      )}
    </Container>
  );
}
