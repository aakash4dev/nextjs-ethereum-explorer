import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaChevronLeft, FaChevronRight, FaFire } from 'react-icons/fa';
import TimeAgo from '@/components/client/TimeAgo';
import CopyButton from '@/components/client/CopyButton';
import { Badge, Card, CodeBlock, Container, DetailRow, EmptyState, Notice, PageHeader, Progress, Table, Tabs, Td, Th } from '@/components/ui';
import { AddressLink, NativeAmount } from '@/components/links';
import { getBlock, getBlockWithdrawals } from '@/lib/services/blocks';
import { dbConnect } from '@/lib/db';
import { formatDateUtc, formatEther, formatGwei, formatNumber, gasUsedPercent } from '@/lib/format';
import { isHash, isBlockNumber } from '@/lib/validation';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

function parseId(raw) {
  const id = decodeURIComponent(raw);
  if (isHash(id)) return id.toLowerCase();
  if (isBlockNumber(id)) return Number.parseInt(id, 10);
  return null;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Block #${id}`, description: `${config.chainName} block ${id}: transactions, fee recipient, gas, base fee and rewards.` };
}

const hexToText = (hex) => {
  try {
    const bytes = hex?.slice(2).match(/.{2}/g)?.map((b) => Number.parseInt(b, 16)) ?? [];
    const s = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
    return /^[\x20-\x7e]+$/.test(s) ? s : null;
  } catch {
    return null;
  }
};

export default async function BlockPage({ params, searchParams }) {
  const { id: raw } = await params;
  const { tab = 'overview' } = await searchParams;
  const id = parseId(raw);
  if (id === null) notFound();
  await dbConnect();
  const data = await getBlock(id);
  if (!data) {
    return (
      <Container>
        <PageHeader title={`Block #${raw}`} />
        <Notice tone="warning" className="mt-4">This block does not exist yet or could not be found on the node.</Notice>
      </Container>
    );
  }
  const { block: b, confirmations, navigation, source } = data;
  const pct = gasUsedPercent(b.gasUsed, b.gasLimit);
  const target = b.gasLimit / 2;
  const vsTarget = target ? ((b.gasUsed - target) / target) * 100 : 0;
  const withdrawals = tab === 'withdrawals' && source === 'db' ? await getBlockWithdrawals(b.number) : [];
  const extra = hexToText(b.extraData);
  const base = `/block/${b.number}`;

  return (
    <Container>
      <PageHeader title={<>Block <span className="text-muted">#{formatNumber(b.number)}</span></>}>
        {source === 'rpc' && <Badge tone="warning" title="Not yet indexed; data read live from the node">Live from node</Badge>}
      </PageHeader>
      <Tabs
        className="mt-4"
        active={tab}
        tabs={[
          { key: 'overview', label: 'Overview', href: base },
          b.withdrawalCount ? { key: 'withdrawals', label: 'Withdrawals', count: b.withdrawalCount, href: `${base}?tab=withdrawals` } : null,
          { key: 'consensus', label: 'Consensus Info', href: `${base}?tab=consensus` },
        ]}
      />

      {tab === 'overview' && (
        <Card className="mt-4">
          <DetailRow label="Block Height" hint="The block number, i.e. its position in the chain.">
            <span className="flex items-center gap-2 font-medium">
              {formatNumber(b.number)}
              {navigation.previous !== null && <Link href={`/block/${navigation.previous}`} className="rounded border border-line p-1 text-primary" aria-label="Previous block"><FaChevronLeft className="h-3 w-3" /></Link>}
              {navigation.next !== null && <Link href={`/block/${navigation.next}`} className="rounded border border-line p-1 text-primary" aria-label="Next block"><FaChevronRight className="h-3 w-3" /></Link>}
            </span>
          </DetailRow>
          <DetailRow label="Status" hint="Blocks become safe/finalized after enough confirmations.">
            {confirmations !== null && confirmations > 64 ? <Badge tone="success">Finalized</Badge> : <Badge tone="warning">Unfinalized</Badge>}
            {confirmations !== null && <span className="ml-2 text-xs text-muted">{formatNumber(confirmations)} block confirmations</span>}
          </DetailRow>
          <DetailRow label="Timestamp" hint="When the block was produced.">
            <TimeAgo value={b.timestamp} /> <span className="text-muted">({formatDateUtc(b.timestamp)})</span>
          </DetailRow>
          <DetailRow label="Transactions" hint="Transactions included in this block.">
            <Link href={`/txs?block=${b.number}`} className="link">{b.transactionCount} transactions</Link>
            {b.internalTxCount ? <> and <Link href={`/txsInternal?block=${b.number}`} className="link">{b.internalTxCount} contract internal transactions</Link></> : null} in this block
          </DetailRow>
          {b.withdrawalCount > 0 && (
            <DetailRow label="Withdrawals" hint="Validator withdrawals from the beacon chain (EIP-4895).">
              <Link href={`${base}?tab=withdrawals`} className="link">{b.withdrawalCount} withdrawals</Link> in this block
            </DetailRow>
          )}
          <DetailRow label="Fee Recipient" hint="Address receiving priority fees (block builder / proposer).">
            <AddressLink address={b.miner} meta={b.minerMeta} truncate={false} />
          </DetailRow>
          <DetailRow label="Block Reward" hint="Priority fees paid to the fee recipient (post-merge there is no issuance in the execution layer).">
            <NativeAmount wei={b.priorityFees} />
          </DetailRow>
          {b.difficulty && b.difficulty !== '0' && (
            <DetailRow label="Difficulty" hint="Proof-of-work difficulty (pre-merge).">{formatNumber(BigInt(b.difficulty))}</DetailRow>
          )}
          {b.totalDifficulty && <DetailRow label="Total Difficulty">{formatNumber(BigInt(b.totalDifficulty))}</DetailRow>}
          <DetailRow label="Size" hint="Block size in bytes.">{b.size ? `${formatNumber(b.size)} bytes` : '-'}</DetailRow>
          <DetailRow label="Gas Used" hint="Total gas used by all transactions in the block.">
            <div className="flex flex-wrap items-center gap-2">
              {formatNumber(b.gasUsed)} <span className="text-muted">({pct.toFixed(2)}%)</span>
              {b.baseFeePerGas !== null && <span className={vsTarget >= 0 ? 'text-success' : 'text-danger'}>{vsTarget >= 0 ? '+' : ''}{vsTarget.toFixed(0)}% Gas Target</span>}
            </div>
            <div className="mt-1 max-w-xs"><Progress value={pct} /></div>
          </DetailRow>
          <DetailRow label="Gas Limit" hint="Maximum gas allowed in this block.">{formatNumber(b.gasLimit)}</DetailRow>
          {b.baseFeePerGas !== null && (
            <DetailRow label="Base Fee Per Gas" hint="EIP-1559 base fee, burnt for every unit of gas used.">
              {formatEther(b.baseFeePerGas)} {config.nativeSymbol} <span className="text-muted">({formatGwei(b.baseFeePerGas)} Gwei)</span>
            </DetailRow>
          )}
          <DetailRow label="Burnt Fees" hint="Base fee × gas used (plus blob fees), permanently removed from supply.">
            <span className="inline-flex items-center gap-1"><FaFire className="text-warning" /> <NativeAmount wei={b.burntFees} /></span>
          </DetailRow>
          {b.blobGasUsed !== null && b.blobGasUsed !== undefined && (
            <DetailRow label="Blob Gas Used" hint="EIP-4844 blob gas (131,072 per blob).">
              {formatNumber(b.blobGasUsed)} <span className="text-muted">({b.blobGasUsed / 131072} blobs)</span> · Excess blob gas {formatNumber(b.excessBlobGas ?? 0)}
            </DetailRow>
          )}
          <DetailRow label="Extra Data" hint="Arbitrary data set by the block producer.">
            {extra ? <span>{extra} <span className="hash text-xs text-muted">(Hex: {b.extraData})</span></span> : <span className="hash break-all">{b.extraData}</span>}
          </DetailRow>
          <DetailRow label="Hash"><span className="hash inline-flex items-center gap-1 break-all">{b.hash} <CopyButton value={b.hash} /></span></DetailRow>
          <DetailRow label="Parent Hash">
            <Link href={`/block/${b.parentHash}`} className="link hash break-all">{b.parentHash}</Link>
          </DetailRow>
          <DetailRow label="State Root"><span className="hash break-all">{b.stateRoot}</span></DetailRow>
          {b.withdrawalsRoot && <DetailRow label="Withdrawals Root"><span className="hash break-all">{b.withdrawalsRoot}</span></DetailRow>}
          <DetailRow label="Nonce"><span className="hash">{b.nonce ?? '-'}</span></DetailRow>
        </Card>
      )}

      {tab === 'consensus' && (
        <Card className="mt-4">
          <DetailRow label="Parent Beacon Block Root" hint="EIP-4788 root exposed to the EVM.">
            <span className="hash break-all">{b.parentBeaconBlockRoot ?? '-'}</span>
          </DetailRow>
          <DetailRow label="Mix Hash / prevRandao"><span className="hash break-all">{b.mixHash ?? '-'}</span></DetailRow>
          <DetailRow label="Transactions Root"><span className="hash break-all">{b.transactionsRoot}</span></DetailRow>
          <DetailRow label="Receipts Root"><span className="hash break-all">{b.receiptsRoot}</span></DetailRow>
          <DetailRow label="Sha3 Uncles"><span className="hash break-all">{b.sha3Uncles}</span></DetailRow>
          {b.requestsHash && <DetailRow label="Requests Hash" hint="EIP-7685 execution layer requests."><span className="hash break-all">{b.requestsHash}</span></DetailRow>}
          <DetailRow label="Logs Bloom"><CodeBlock maxHeight="10rem">{b.logsBloom}</CodeBlock></DetailRow>
        </Card>
      )}

      {tab === 'withdrawals' && (
        <Card className="mt-4">
          {withdrawals.length ? (
            <Table>
              <thead><tr><Th>Index</Th><Th>Validator Index</Th><Th>Recipient</Th><Th align="right">Amount</Th></tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.index}>
                    <Td>{formatNumber(w.index)}</Td>
                    <Td>{formatNumber(w.validatorIndex)}</Td>
                    <Td><AddressLink address={w.address} /></Td>
                    <Td align="right"><NativeAmount wei={w.amount} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState>No withdrawals in this block</EmptyState>
          )}
        </Card>
      )}
    </Container>
  );
}
