import Link from 'next/link';
import { FaCube, FaEthereum, FaExchangeAlt, FaGasPump, FaGlobe, FaServer, FaFileAlt, FaChartLine } from 'react-icons/fa';
import SearchBar from '@/components/client/SearchBar';
import TimeAgo from '@/components/client/TimeAgo';
import AutoRefresh from '@/components/client/AutoRefresh';
import Chart from '@/components/client/Chart';
import { Card, Container, EmptyState, Notice, Stat } from '@/components/ui';
import { AddressLink, NativeAmount } from '@/components/links';
import { latestBlocks } from '@/lib/services/blocks';
import { latestTransactions } from '@/lib/services/transactions';
import { getNetworkStats } from '@/lib/services/stats';
import { addressMeta } from '@/lib/services/common';
import { dbConnect } from '@/lib/db';
import { formatGasPrice, formatNumber, formatUsd, formatCompact } from '@/lib/format';
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

export default async function Home() {
  const { stats, blocks, txs, meta, error } = await loadHome();
  const price = stats?.price;
  const lag = stats?.headBlock !== null && stats?.latestIndexedBlock !== null && stats ? stats.headBlock - stats.latestIndexedBlock : null;

  return (
    <>
      <AutoRefresh intervalMs={12000} />
      <section className="bg-hero pb-20 pt-10">
        <Container>
          <h1 className="mb-4 text-xl font-medium text-white md:text-2xl">The {config.chainName} Blockchain Explorer</h1>
          <div className="max-w-3xl">
            <SearchBar size="lg" />
          </div>
        </Container>
      </section>

      <Container className="-mt-14 space-y-6">
        {error && <Notice tone="danger">Cannot reach the database: {error}. Check MONGODB_URI and that MongoDB is running.</Notice>}
        {!error && stats && stats.totals.blocks === 0 && (
          <Notice tone="warning">
            No blocks indexed yet. Start the indexer with <code className="hash">npm run sync</code> (see the README).
          </Notice>
        )}
        {!error && lag !== null && lag > 50 && (
          <Notice tone="info">
            The indexer is catching up: {formatNumber(lag)} blocks behind the chain head. Recent data may be incomplete. <Link className="link" href="/status">Indexer status</Link>
          </Notice>
        )}

        <Card bodyClassName="grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="space-y-5 p-5">
            <Stat
              icon={<FaEthereum />}
              label={`${config.nativeSymbol} Price`}
              value={price ? <>{formatUsd(price.usd)} {price.change24h !== null && <span className={price.change24h >= 0 ? 'text-sm text-success' : 'text-sm text-danger'}>({price.change24h.toFixed(2)}%)</span>}</> : <span className="text-muted">Unavailable</span>}
              sub={price?.btc ? `@ ${price.btc.toFixed(5)} BTC` : null}
            />
            <Stat icon={<FaGlobe />} label="Market Cap" value={price?.marketCap ? formatUsd(price.marketCap) : <span className="text-muted">-</span>} />
          </div>
          <div className="space-y-5 p-5">
            <Stat
              icon={<FaExchangeAlt />}
              label="Transactions"
              value={stats ? formatCompact(stats.totals.transactions) : '-'}
              sub={stats?.tps !== null && stats?.tps !== undefined ? `${stats.tps.toFixed(2)} TPS · ${stats.avgBlockTime?.toFixed(1) ?? '-'}s block time` : null}
            />
            <Stat
              icon={<FaCube />}
              label="Latest Block"
              value={stats?.headBlock !== null && stats?.headBlock !== undefined ? <Link className="link" href={`/block/${stats.headBlock}`}>{formatNumber(stats.headBlock)}</Link> : '-'}
              sub={stats?.latestIndexedBlock !== null && stats?.latestIndexedBlock !== undefined ? `Indexed to ${formatNumber(stats.latestIndexedBlock)}` : null}
            />
          </div>
          <div className="space-y-4 p-5">
            <Stat
              icon={<FaGasPump />}
              label="Gas Price"
              value={stats?.gas ? <Link className="link" href="/gastracker">{formatGasPrice(stats.gas.standard)} Gwei</Link> : '-'}
              sub={stats?.gas?.baseFee ? `Base fee ${formatGasPrice(stats.gas.baseFee)} Gwei` : null}
            />
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
                <FaChartLine /> Transaction history in {stats?.txHistory?.length || 14} day{(stats?.txHistory?.length || 14) === 1 ? '' : 's'}
              </div>
              <Chart compact type="area" height={64} title="Daily transactions" unit="txns" points={(stats?.txHistory ?? []).map((d) => ({ label: d.date, value: d.txCount }))} />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            title="Latest Blocks"
            footer={<Link href="/blocks" className="link font-semibold uppercase">View all blocks →</Link>}
          >
            {blocks.length ? (
              <ul className="divide-y divide-line">
                {blocks.map((b) => (
                  <li key={b.hash} className="flex items-center gap-3 px-4 py-3">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted sm:flex"><FaCube /></div>
                    <div className="w-28 shrink-0">
                      <Link href={`/block/${b.number}`} className="link font-medium">{b.number}</Link>
                      <div className="text-xs text-muted"><TimeAgo value={b.timestamp} /></div>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="shrink-0 text-muted">Fee Recipient</span>
                        <AddressLink address={b.miner} meta={meta[b.miner]} copy={false} />
                      </div>
                      <div className="text-xs text-muted">
                        <Link href={`/txs?block=${b.number}`} className="link">{b.transactionCount} txns</Link>
                        {b.blobGasUsed ? ` · ${b.blobGasUsed / 131072} blobs` : ''}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md border border-line px-2 py-0.5 text-xs" title="Priority fees paid to the fee recipient">
                      <NativeAmount wei={b.priorityFees} maxFraction={5} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>No blocks indexed yet</EmptyState>
            )}
          </Card>

          <Card
            title="Latest Transactions"
            footer={<Link href="/txs" className="link font-semibold uppercase">View all transactions →</Link>}
          >
            {txs.length ? (
              <ul className="divide-y divide-line">
                {txs.map((t) => (
                  <li key={t.hash} className="flex items-center gap-3 px-4 py-3">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted sm:flex"><FaFileAlt /></div>
                    <div className="w-32 shrink-0">
                      <Link href={`/tx/${t.hash}`} className="link hash block truncate">{t.hash.slice(0, 14)}...</Link>
                      <div className="text-xs text-muted"><TimeAgo value={t.timestamp} /></div>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="flex min-w-0 items-center gap-1"><span className="shrink-0 text-muted">From</span> <AddressLink address={t.from} meta={t.fromMeta} copy={false} /></div>
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="shrink-0 text-muted">To</span>
                        {t.to ? <AddressLink address={t.to} meta={t.toMeta} copy={false} /> : <span className="truncate text-muted">Contract Creation</span>}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md border border-line px-2 py-0.5 text-xs"><NativeAmount wei={t.value} maxFraction={5} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>No transactions indexed yet</EmptyState>
            )}
          </Card>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Blocks indexed', formatNumber(stats.totals.blocks), '/blocks', <FaCube key="i" />],
              ['Addresses seen', formatNumber(stats.totals.addresses), '/accounts', <FaGlobe key="i" />],
              ['Tokens tracked', formatNumber(stats.totals.tokens), '/tokens', <FaEthereum key="i" />],
              ['Verified contracts', formatNumber(stats.totals.verifiedContracts), '/contractsVerified', <FaServer key="i" />],
            ].map(([label, value, href, icon]) => (
              <Link key={href} href={href} className="rounded-xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-primary">
                <Stat icon={icon} label={label} value={value} />
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
