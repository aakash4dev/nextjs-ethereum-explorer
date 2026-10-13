import { FaGasPump } from 'react-icons/fa';
import { Card, Container, EmptyState, Notice, PageHeader, Table, Td, Th } from '@/components/ui';
import { AddressLink } from '@/components/links';
import Chart from '@/components/client/Chart';
import AutoRefresh from '@/components/client/AutoRefresh';
import { getGasEstimates, getGasGuzzlers, getGasOracle, getGasSpenders } from '@/lib/services/gas';
import { getNativePrice } from '@/lib/services/market';
import { dbConnect } from '@/lib/db';
import { formatGasPrice, formatNumber, formatUsd, weiToNumber } from '@/lib/format';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gas Tracker', description: 'Current gas prices, base fee history, transaction cost estimates and top gas consumers.' };

const formatSmall = (v) => (v === 0 ? '0' : v >= 0.0001 ? v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '') : v.toExponential(2));

const TIERS = [
  ['slow', 'Low', '🐢', 'text-success'],
  ['standard', 'Average', '🚶', 'text-primary'],
  ['fast', 'High', '🚀', 'text-danger'],
];

function GuzzlerTable({ rows, label }) {
  if (!rows.length) return <EmptyState>No indexed activity yet</EmptyState>;
  return (
    <Table compact>
      <thead><tr><Th>Rank</Th><Th>{label}</Th><Th align="right">Gas Used</Th><Th align="right">% Used</Th><Th align="right">Fees ({config.nativeSymbol})</Th><Th align="right">Txns</Th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.address}>
            <Td className="text-muted">{i + 1}</Td>
            <Td className="max-w-[260px]"><AddressLink address={r.address} meta={r} /></Td>
            <Td align="right">{formatNumber(r.gasUsed)}</Td>
            <Td align="right">{r.share.toFixed(2)}%</Td>
            <Td align="right">{r.feesEth.toFixed(6)}</Td>
            <Td align="right">{formatNumber(r.txs)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default async function GasTrackerPage() {
  let oracle = null;
  let error = null;
  try {
    oracle = await getGasOracle();
  } catch (err) {
    error = err.shortMessage ?? err.message;
  }
  await dbConnect();
  const [estimates, guzzlers, spenders, price] = oracle
    ? await Promise.all([getGasEstimates(oracle), getGasGuzzlers(), getGasSpenders(), getNativePrice()])
    : [[], [], [], null];

  return (
    <Container>
      <AutoRefresh intervalMs={12000} />
      <PageHeader icon={<FaGasPump className="text-muted" />} title={`${config.chainName} Gas Tracker`} subtitle={oracle ? `Next update in ~12s · based on the last ${oracle.history.length} blocks (latest #${formatNumber(oracle.lastBlock)})` : null} />
      {error && <Notice tone="danger" className="mt-4">Gas oracle unavailable: {error}</Notice>}
      {oracle && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {TIERS.map(([key, label, icon, color]) => {
              const t = oracle[key];
              const transferCost = weiToNumber(BigInt(t.gasPrice) * 21000n);
              return (
                <Card key={key} bodyClassName="p-5 text-center">
                  <div className="text-sm font-medium text-muted">{icon} {label}</div>
                  <div className={`mt-2 text-2xl font-semibold ${color}`}>{formatGasPrice(t.gasPrice)} gwei</div>
                  <div className="mt-1 text-sm text-muted">
                    {oracle.eip1559 && <>Base: {formatGasPrice(oracle.nextBaseFee)} | Priority: {formatGasPrice(t.priorityFee)}</>}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {price ? `${formatUsd(transferCost * price.usd)} · ` : ''}~{t.waitSeconds ?? '-'} secs (transfer)
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card title="Estimated Cost of Transaction Actions">
              <Table compact>
                <thead><tr><Th>Action</Th><Th align="right">Gas</Th><Th align="right">Low</Th><Th align="right">Average</Th><Th align="right">High</Th></tr></thead>
                <tbody>
                  {estimates.map((e) => (
                    <tr key={e.action}>
                      <Td>{e.action}</Td>
                      <Td align="right" className="text-muted">{formatNumber(e.gas)}</Td>
                      {['slow', 'standard', 'fast'].map((k) => (
                        <Td key={k} align="right">{e[k].usd !== null ? formatUsd(e[k].usd) : `${formatSmall(e[k].eth)} ${config.nativeSymbol}`}</Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
            <Card title="Base Fee per Block (Gwei)">
              <div className="p-4">
                <Chart type="bar" height={260} title="Base fee" unit="Gwei" points={oracle.history.map((h) => ({ label: `#${h.block}`, value: Number(BigInt(h.baseFee)) / 1e9 }))} />
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card title="Top Gas Guzzlers (contracts, last 300 indexed blocks)"><GuzzlerTable rows={guzzlers} label="Contract" /></Card>
            <Card title="Top Gas Spenders (senders, last 300 indexed blocks)"><GuzzlerTable rows={spenders} label="Address" /></Card>
          </div>
        </>
      )}
    </Container>
  );
}
