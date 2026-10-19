import Link from 'next/link';
import SearchBar from '@/components/client/SearchBar';
import TimeAgo from '@/components/client/TimeAgo';
import AutoRefresh from '@/components/client/AutoRefresh';
import Chart from '@/components/client/Chart';
import { Container, EmptyState, Notice, Progress } from '@/components/ui';
import { AddressLink, NativeAmount } from '@/components/links';
import { latestBlocks } from '@/lib/services/blocks';
import { latestTransactions } from '@/lib/services/transactions';
import { getNetworkStats } from '@/lib/services/stats';
import { addressMeta } from '@/lib/services/common';
import { dbConnect } from '@/lib/db';
import { formatGasPrice, formatNumber, formatUsd, formatCompact, gasUsedPercent } from '@/lib/format';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

async function loadHome() {
  try {
    await dbConnect();
    const [stats, blocks, txs] = await Promise.all([getNetworkStats(), latestBlocks(6), latestTransactions(6)]);
    const meta = await addressMeta(blocks.map((b) => b.miner));
    return { stats, blocks, txs, meta, error: null };
  } catch (err) {
    return { stats: null, blocks: [], txs: [], meta: {}, error: err.message };
  }
}

function Metric({ label, value, sub, href }) {
  const content = (
    <>
      <div className="ledger-kicker">{label}</div>
      <div className="mt-2 text-2xl font-semibold leading-none text-fg">{value}</div>
      {sub && <div className="mt-2 font-sans text-[11px] text-muted">{sub}</div>}
    </>
  );
  return href ? <Link href={href} className="group min-w-0 py-1 hover:text-primary">{content}</Link> : <div className="min-w-0 py-1">{content}</div>;
}

export default async function Home() {
  const { stats, blocks, txs, meta, error } = await loadHome();
  const price = stats?.price;
  const headBlock = stats?.headBlock ?? blocks[0]?.number ?? null;
  const lag = stats?.headBlock !== null && stats?.latestIndexedBlock !== null && stats ? stats.headBlock - stats.latestIndexedBlock : null;
  const history = stats?.txHistory ?? [];
  const latestDay = history.at(-1);

  return (
    <>
      <AutoRefresh intervalMs={12000} />
      <Container>
        <section className="border-b border-line py-12 md:py-16">
          <div className="ledger-kicker mb-4">The front page</div>
          <h1 className="max-w-5xl text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.055em] text-fg sm:text-[3.8rem] md:text-[5rem]">
            The chain of record{headBlock !== null ? `, as of block ${formatNumber(headBlock)}.` : '.'}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">
            A clear, searchable account of every block, transaction, address and contract on {config.chainName}. Built for investigation, not distraction.
          </p>
          <div className="mt-8 max-w-4xl">
            <SearchBar size="lg" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-sans text-[11px] text-muted">
            <span>Try the latest:</span>
            {blocks[0] && <Link className="link" href={`/block/${blocks[0].number}`}>Block {formatNumber(blocks[0].number)}</Link>}
            {txs[0] && <Link className="link hash" href={`/tx/${txs[0].hash}`}>{txs[0].hash.slice(0, 16)}…</Link>}
            <Link className="link" href="/contractsVerified">Verified contracts</Link>
          </div>
        </section>

        <div className="space-y-3 pt-6">
          {error && <Notice tone="danger">Cannot reach the database: {error}. Check MONGODB_URI and that MongoDB is running.</Notice>}
          {!error && stats && stats.totals.blocks === 0 && (
            <Notice tone="warning">No blocks indexed yet. Start the indexer with <code className="hash">npm run sync</code> (see the README).</Notice>
          )}
          {!error && lag !== null && lag > 50 && (
            <Notice tone="info">The indexer is catching up: {formatNumber(lag)} blocks behind the chain head. Recent data may be incomplete. <Link className="link" href="/status">Indexer status</Link></Notice>
          )}
        </div>

        <section className="border-b border-line py-10">
          <div className="mb-7 flex items-baseline justify-between gap-4">
            <h2 className="ledger-kicker text-fg">The network today</h2>
            <span className="hidden font-sans text-[10px] uppercase tracking-[0.1em] text-muted sm:inline">Live index · refreshes every 12 seconds</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-line">
            <Metric label="Latest block" value={headBlock !== null ? formatNumber(headBlock) : '—'} href={headBlock !== null ? `/block/${headBlock}` : '/blocks'} sub={lag > 0 ? `${formatNumber(lag)} behind` : 'At chain head'} />
            <Metric label="Transactions" value={formatCompact(stats?.totals.transactions)} href="/txs" sub={stats?.tps !== null && stats?.tps !== undefined ? `${stats.tps.toFixed(2)} per second` : null} />
            <Metric label={`${config.nativeSymbol} price`} value={price ? formatUsd(price.usd) : '—'} sub={typeof price?.change24h === 'number' ? `${price.change24h >= 0 ? '+' : ''}${price.change24h.toFixed(2)}% today` : 'Market unavailable'} />
            <Metric label="Standard gas" value={stats?.gas ? `${formatGasPrice(stats.gas.standard)} Gwei` : '—'} href="/gastracker" sub={stats?.gas?.baseFee ? `${formatGasPrice(stats.gas.baseFee)} Gwei base` : null} />
            <Metric label="Block time" value={stats?.avgBlockTime ? `${stats.avgBlockTime.toFixed(1)} sec` : '—'} href="/chart/block-time" sub="100-block average" />
            <Metric label="Addresses" value={formatCompact(stats?.totals.addresses)} href="/accounts" sub={`${formatCompact(stats?.totals.tokens)} tokens tracked`} />
          </div>
        </section>

        <section className="border-b border-line py-10">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="ledger-kicker mb-3">Transaction history · {history.length || 14} days</div>
              <h2 className="text-4xl font-semibold leading-none tracking-[-0.04em] md:text-5xl">
                {latestDay ? `${formatNumber(latestDay.txCount)} transactions` : 'Network activity'}
              </h2>
              {latestDay && <p className="mt-2 text-muted">recorded on {latestDay.date}</p>}
            </div>
            <Link href="/charts" className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-primary hover:text-primary-hover">Open all statistics →</Link>
          </div>
          <Chart type="area" height={250} title="Daily transactions" unit="transactions" points={history.map((d) => ({ label: d.date, value: d.txCount }))} />
        </section>

        <section className="grid gap-12 py-10 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-end justify-between border-b-2 border-line-strong pb-3">
              <div>
                <div className="ledger-kicker mb-2">Chain production</div>
                <h2 className="text-3xl font-semibold">Latest blocks</h2>
              </div>
              <Link href="/blocks" className="font-sans text-[10px] font-semibold uppercase tracking-wider text-primary">View all →</Link>
            </div>
            {blocks.length ? (
              <ul>
                {blocks.map((b) => {
                  const utilization = gasUsedPercent(b.gasUsed, b.gasLimit);
                  return (
                    <li key={b.hash} className="grid grid-cols-[105px_1fr_auto] gap-4 border-b border-line py-4">
                      <div>
                        <Link href={`/block/${b.number}`} className="link text-base font-semibold">{formatNumber(b.number)}</Link>
                        <div className="font-sans text-[10px] text-muted"><TimeAgo value={b.timestamp} /></div>
                      </div>
                      <div className="min-w-0 text-sm">
                        <div className="flex min-w-0 gap-1"><span className="text-muted">Builder</span><AddressLink address={b.miner} meta={meta[b.miner]} copy={false} /></div>
                        <div className="mt-1 font-sans text-[11px] text-muted"><Link className="link" href={`/txs?block=${b.number}`}>{formatNumber(b.transactionCount)} transactions</Link> · {utilization.toFixed(1)}% used</div>
                        <div className="mt-2 max-w-44"><Progress value={utilization} /></div>
                      </div>
                      <div className="text-right text-xs"><NativeAmount wei={b.priorityFees} maxFraction={5} /></div>
                    </li>
                  );
                })}
              </ul>
            ) : <EmptyState>No blocks indexed yet</EmptyState>}
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between border-b-2 border-line-strong pb-3">
              <div>
                <div className="ledger-kicker mb-2">Activity feed</div>
                <h2 className="text-3xl font-semibold">Latest transactions</h2>
              </div>
              <Link href="/txs" className="font-sans text-[10px] font-semibold uppercase tracking-wider text-primary">View all →</Link>
            </div>
            {txs.length ? (
              <ul>
                {txs.map((t) => (
                  <li key={t.hash} className="grid grid-cols-[118px_1fr_auto] gap-4 border-b border-line py-4">
                    <div className="min-w-0">
                      <Link href={`/tx/${t.hash}`} className="link hash block truncate">{t.hash.slice(0, 14)}…</Link>
                      <div className="font-sans text-[10px] text-muted"><TimeAgo value={t.timestamp} /></div>
                    </div>
                    <div className="min-w-0 text-sm">
                      <div className="flex min-w-0 gap-1"><span className="text-muted">From</span><AddressLink address={t.from} meta={t.fromMeta} copy={false} /></div>
                      <div className="flex min-w-0 gap-1"><span className="text-muted">To</span>{t.to ? <AddressLink address={t.to} meta={t.toMeta} copy={false} /> : <span className="truncate">Contract creation</span>}</div>
                      {t.method && <div className="mt-1 truncate font-sans text-[10px] uppercase tracking-wider text-muted">{t.method}</div>}
                    </div>
                    <div className="text-right text-xs"><NativeAmount wei={t.value} maxFraction={5} /></div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState>No transactions indexed yet</EmptyState>}
          </div>
        </section>

        {stats && (
          <section className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 md:grid-cols-4 md:divide-x md:divide-line">
            <Metric label="Blocks indexed" value={formatNumber(stats.totals.blocks)} href="/blocks" />
            <Metric label="Addresses seen" value={formatNumber(stats.totals.addresses)} href="/accounts" />
            <Metric label="Tokens tracked" value={formatNumber(stats.totals.tokens)} href="/tokens" />
            <Metric label="Verified contracts" value={formatNumber(stats.totals.verifiedContracts)} href="/contractsVerified" />
          </section>
        )}
      </Container>
    </>
  );
}
