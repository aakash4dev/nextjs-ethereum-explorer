import Link from 'next/link';
import { FaCheckCircle, FaFileContract } from 'react-icons/fa';
import CopyButton from './client/CopyButton';
import { checksum, formatEther, formatEtherNonZero, formatUnitsHuman, truncateMiddle } from '@/lib/format';
import config from '@/lib/config';
import { cx } from './ui';

/**
 * Address with name tag / verified contract name / token symbol, contract
 * icon and copy button.
 */
export function AddressLink({ address, meta, isContract, truncate = true, copy = true, current, className, start = 8, end = 6 }) {
  if (!address) return <span className="text-muted">-</span>;
  const cs = checksum(address);
  const tokenName = meta?.token?.name ? `${meta.token.name}${meta.token.symbol ? ` (${meta.token.symbol})` : ''}` : null;
  const name = meta?.label ?? tokenName ?? meta?.contractName ?? null;
  const text = name ?? (truncate ? truncateMiddle(cs, start, end) : cs);
  const contract = isContract || meta?.verified || meta?.contractName || meta?.token;
  const href = meta?.token ? `/token/${address}` : `/address/${address}`;
  return (
    <span className={cx('inline-flex min-w-0 max-w-full items-center gap-1', className)}>
      {contract && <FaFileContract className="h-3 w-3 shrink-0 text-muted" title="Contract" />}
      {current ? (
        <span className={cx('truncate', name ? '' : 'hash')} title={cs}>{text}</span>
      ) : (
        <Link href={href} className={cx('link truncate', name ? '' : 'hash')} title={name ? `${name}\n${cs}` : cs}>
          {text}
        </Link>
      )}
      {meta?.verified && <FaCheckCircle className="h-3 w-3 shrink-0 text-success" title="Verified source code" />}
      {copy && <CopyButton value={cs} label="Copy address" />}
    </span>
  );
}

export function TxLink({ hash, truncate = true, copy = false, className, failed }) {
  if (!hash) return <span className="text-muted">-</span>;
  return (
    <span className={cx('inline-flex min-w-0 items-center gap-1', className)}>
      {failed && <span className="text-danger" title="Failed transaction">!</span>}
      <Link href={`/tx/${hash}`} className="link hash truncate" title={hash}>
        {truncate ? `${hash.slice(0, 14)}...` : hash}
      </Link>
      {copy && <CopyButton value={hash} label="Copy transaction hash" />}
    </span>
  );
}

export function BlockLink({ number, className }) {
  if (number === null || number === undefined) return <span className="text-muted">-</span>;
  return (
    <Link href={`/block/${number}`} className={cx('link', className)}>
      {number}
    </Link>
  );
}

export function NativeAmount({ wei, maxFraction = 8, className, showZero = true }) {
  if (!showZero && (!wei || wei === '0')) return <span className={cx('text-muted', className)}>0 {config.nativeSymbol}</span>;
  return (
    <span className={className} title={`${formatEther(wei)} ${config.nativeSymbol}`}>
      {formatEtherNonZero(wei, maxFraction)} {config.nativeSymbol}
    </span>
  );
}

export function TokenAmount({ value, decimals, symbol, maxFraction = 6 }) {
  if (decimals === null || decimals === undefined) return <span title="Unknown decimals">{formatUnitsHuman(value, 0)} {symbol ?? ''}</span>;
  return (
    <span title={`${formatUnitsHuman(value, decimals)} ${symbol ?? ''}`}>
      {formatUnitsHuman(value, decimals, maxFraction)} {symbol ?? ''}
    </span>
  );
}

export function TokenLink({ address, info, className }) {
  const label = info?.name ? `${info.name}${info.symbol ? ` (${info.symbol})` : ''}` : truncateMiddle(checksum(address), 8, 6);
  return (
    <Link href={`/token/${address}`} className={cx('link truncate', className)} title={checksum(address)}>
      {label}
    </Link>
  );
}

export function MethodBadge({ method }) {
  if (!method) return <span className="text-muted">-</span>;
  const label = method.startsWith('0x') ? method : method.charAt(0).toUpperCase() + method.slice(1);
  return (
    <span title={label} className="inline-block max-w-[120px] truncate rounded-md border border-line-strong bg-surface-2 px-2 py-0.5 text-center text-xs font-medium">
      {label}
    </span>
  );
}
