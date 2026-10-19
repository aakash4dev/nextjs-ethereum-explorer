'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatGasPrice } from '@/lib/format';

const symbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'ETH';

/** Native price and gas price in the top bar, refreshed every 30s. */
export default function HeaderTicker() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/ticker')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setData(d))
        .catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  if (!data) return <span className="h-4" />;
  const gwei = data.gasPrice ? formatGasPrice(data.gasPrice) : null;
  return (
    <div className="flex items-center gap-4">
      {data.price?.usd ? (
        <span className="hidden sm:inline">
          {symbol} <span className="text-fg">${data.price.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          {typeof data.price.change24h === 'number' && <span className={data.price.change24h >= 0 ? 'ml-1 text-success' : 'ml-1 text-danger'}>{data.price.change24h >= 0 ? '+' : ''}{data.price.change24h.toFixed(2)}%</span>}
        </span>
      ) : null}
      {gwei !== null && (
        <Link href="/gastracker" className="flex items-center gap-1 hover:text-primary">
          Gas <span className="text-fg">{gwei} Gwei</span>
        </Link>
      )}
    </div>
  );
}
