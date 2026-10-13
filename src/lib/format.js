/**
 * Formatting helpers shared by server and client components. Pure functions,
 * no Node or browser APIs. Amounts are handled as BigInt so that wei values
 * never lose precision.
 */
import { formatUnits, getAddress } from 'viem';

const nf = new Intl.NumberFormat('en-US');

export function toBigInt(v) {
  if (v === null || v === undefined || v === '') return 0n;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(Math.trunc(v));
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}

export function formatNumber(n, maxFractionDigits = 0) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  if (typeof n === 'bigint') return nf.format(n);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: maxFractionDigits }).format(Number(n));
}

/** Format a decimal string with thousands separators and trimmed fraction. */
export function groupDecimal(str, maxFraction = 18) {
  if (str === null || str === undefined) return '-';
  const s = String(str);
  const neg = s.startsWith('-');
  const [int, frac = ''] = (neg ? s.slice(1) : s).split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fracTrim = frac.slice(0, maxFraction).replace(/0+$/, '');
  return `${neg ? '-' : ''}${intFmt}${fracTrim ? `.${fracTrim}` : ''}`;
}

/** Wei → human string, e.g. "1,234.5678 ETH" (exact, no float rounding). */
export function formatUnitsHuman(value, decimals = 18, maxFraction = 18) {
  return groupDecimal(formatUnits(toBigInt(value), Number(decimals ?? 0)), maxFraction);
}

export function formatEther(wei, maxFraction = 18) {
  return formatUnitsHuman(wei, 18, maxFraction);
}

export function formatGwei(wei, maxFraction = 9) {
  return formatUnitsHuman(wei, 9, maxFraction);
}

export function weiToNumber(wei, decimals = 18) {
  return Number(formatUnits(toBigInt(wei), decimals));
}

export function formatUsd(n, { compact = false } = {}) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '-';
  const v = Number(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: v !== 0 && Math.abs(v) < 0.01 ? 6 : 2,
  }).format(v);
}

export function formatCompact(n) {
  if (n === null || n === undefined) return '-';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(n));
}

export function formatPercent(n, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '-';
  return `${Number(n).toFixed(digits)}%`;
}

export function formatBytes(n) {
  if (!n && n !== 0) return '-';
  return `${formatNumber(n)} bytes`;
}

export function truncateMiddle(s, start = 10, end = 8) {
  if (!s) return '';
  if (s.length <= start + end + 3) return s;
  return `${s.slice(0, start)}...${s.slice(-end)}`;
}

export function checksum(address) {
  if (!address) return address;
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

export function toDate(ts) {
  if (ts === null || ts === undefined) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts < 1e12 ? ts * 1000 : ts);
  return new Date(ts);
}

export function timeAgo(ts, now = Date.now()) {
  const d = toDate(ts);
  if (!d || Number.isNaN(d.getTime())) return '-';
  let s = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (s < 60) return `${s} sec${s === 1 ? '' : 's'} ago`;
  const units = [
    ['day', 86400],
    ['hr', 3600],
    ['min', 60],
  ];
  const parts = [];
  for (const [name, size] of units) {
    if (s >= size) {
      const q = Math.floor(s / size);
      s -= q * size;
      parts.push(`${q} ${name}${q === 1 ? '' : 's'}`);
      if (parts.length === 2) break;
    }
  }
  return `${parts.join(' ')} ago`;
}

export function formatDateUtc(ts) {
  const d = toDate(ts);
  if (!d || Number.isNaN(d.getTime())) return '-';
  return d.toUTCString().replace('GMT', 'UTC');
}

export function gasUsedPercent(used, limit) {
  const u = Number(used);
  const l = Number(limit);
  if (!l) return 0;
  return (u / l) * 100;
}

export const TX_TYPES = {
  0: 'Legacy (Type 0)',
  1: 'EIP-2930 (Type 1)',
  2: 'EIP-1559 (Type 2)',
  3: 'EIP-4844 Blob (Type 3)',
  4: 'EIP-7702 Set Code (Type 4)',
};

export function txTypeLabel(t) {
  return TX_TYPES[Number(t)] ?? `Type ${t}`;
}

/** Gas price in gwei with adaptive precision (L2s and devnets have sub-gwei prices). */
export function formatGasPrice(wei) {
  const v = toBigInt(wei);
  if (v === 0n) return '0';
  return v < 1_000_000n ? formatGwei(v, 9) : formatGwei(v, 3);
}

/** Like formatEther, but never renders a non-zero amount as "0". */
export function formatEtherNonZero(wei, maxFraction = 8) {
  const s = formatEther(wei, maxFraction);
  if (s === '0' && toBigInt(wei) > 0n) return `<0.${'0'.repeat(Math.max(0, maxFraction - 1))}1`;
  return s;
}
