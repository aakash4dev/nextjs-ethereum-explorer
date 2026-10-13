'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEther, truncateMiddle } from '@/lib/format';

function Frame({ node, meta, depth = 0 }) {
  const [open, setOpen] = useState(depth < 3);
  const name = (a) => meta?.[a]?.label ?? meta?.[a]?.contractName ?? meta?.[a]?.token?.symbol ?? truncateMiddle(a ?? '', 8, 6);
  const kind = (node.callType ?? node.type ?? 'call').toUpperCase();
  return (
    <li className="relative">
      <div className={`flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1 text-xs ${node.error ? 'bg-danger-soft' : 'hover:bg-surface-2'}`}>
        {node.calls?.length ? (
          <button type="button" onClick={() => setOpen(!open)} className="w-4 text-muted" aria-label={open ? 'Collapse' : 'Expand'}>{open ? '▾' : '▸'}</button>
        ) : (
          <span className="w-4" />
        )}
        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-semibold">{kind}</span>
        <Link className="link hash" href={`/address/${node.from}`}>{name(node.from)}</Link>
        <span className="text-muted">→</span>
        {node.to ? <Link className="link hash" href={`/address/${node.to}`}>{name(node.to)}</Link> : <span className="text-muted">?</span>}
        {node.value && node.value !== '0' && <span className="font-medium text-success">{formatEther(node.value, 6)} {process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'ETH'}</span>}
        {node.input && node.input.length >= 10 && !node.type?.startsWith('create') && <span className="hash text-muted">{node.input.slice(0, 10)}</span>}
        <span className="text-muted">gas {node.gasUsed?.toLocaleString('en-US') ?? '-'}</span>
        {node.error && <span className="font-medium text-danger">{node.error}</span>}
      </div>
      {open && node.calls?.length > 0 && (
        <ul className="ml-4 border-l border-line pl-2">
          {node.calls.map((c) => <Frame key={c.traceAddress} node={c} meta={meta} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

/** Loads the full call tree for a transaction from /api/transaction/:hash/trace. */
export default function CallTrace({ hash }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    fetch(`/api/transaction/${hash}/trace`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, data: d }))
      .catch((e) => alive && setState({ loading: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, [hash]);
  if (state.loading) return <div className="p-6 text-sm text-muted">Loading call trace…</div>;
  if (state.error) return <div className="p-6 text-sm text-danger">Failed to load trace: {state.error}</div>;
  if (!state.data?.supported) return <div className="p-6 text-sm text-muted">The connected node does not support transaction tracing (debug_traceTransaction / trace_transaction).</div>;
  if (!state.data.tree) return <div className="p-6 text-sm text-muted">No trace available for this transaction.</div>;
  return (
    <div className="p-4">
      {state.data.revertReason && <div className="mb-3 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm">Revert reason: <span className="font-medium">{state.data.revertReason}</span></div>}
      <div className="mb-2 text-xs text-muted">{state.data.flat.length} call frames</div>
      <ul className="scrollbar-thin overflow-x-auto">
        <Frame node={state.data.tree} meta={state.data.meta} />
      </ul>
    </div>
  );
}
