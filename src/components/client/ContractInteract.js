'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createWalletClient, custom, parseEther } from 'viem';

const sigOf = (f) => `${f.name}(${(f.inputs ?? []).map((i) => i.type).join(',')})`;

function coerce(type, raw) {
  const v = typeof raw === 'string' ? raw.trim() : raw;
  if (type.endsWith(']') || type.startsWith('tuple')) return typeof v === 'string' ? JSON.parse(v || '[]', (_k, x) => x) : v;
  if (type.startsWith('uint') || type.startsWith('int')) return BigInt(v);
  if (type === 'bool') return v === true || v === 'true' || v === '1';
  return v;
}

function Output({ result }) {
  if (!result) return null;
  if (result.error) return <div className="mt-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">{result.error}</div>;
  return (
    <ul className="mt-2 space-y-1 text-xs">
      {result.outputs.map((o, i) => (
        <li key={i} className="break-all">
          <span className="text-muted">{o.name || `[${i}]`} </span>
          <span className="text-muted italic">{o.type}</span>:{' '}
          {o.type === 'address' ? <Link className="link hash" href={`/address/${o.value}`}>{o.value}</Link> : <span className="hash">{typeof o.value === 'object' ? JSON.stringify(o.value) : String(o.value)}</span>}
        </li>
      ))}
    </ul>
  );
}

function FunctionItem({ index, fn, children, defaultOpen }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-2 px-3 py-2 text-sm font-medium">
        <span>{index + 1}. {fn.name}</span>
        <span className="text-muted transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-2 px-3 py-3">{children}</div>
    </details>
  );
}

function Inputs({ fn, values, setValues }) {
  return (fn.inputs ?? []).map((inp, i) => (
    <label key={i} className="block text-xs">
      <span className="text-muted">{inp.name || `arg${i}`} ({inp.type})</span>
      <input
        value={values[i] ?? ''}
        onChange={(e) => setValues((v) => ({ ...v, [i]: e.target.value }))}
        placeholder={inp.type.endsWith(']') ? '["0x…", "0x…"]' : `${inp.name || 'value'} (${inp.type})`}
        className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
    </label>
  ));
}

/** Read Contract: view/pure functions executed server-side via eth_call. */
export function ReadContract({ address, abi, implementation }) {
  const fns = useMemo(() => (abi ?? []).filter((f) => f.type === 'function' && ['view', 'pure'].includes(f.stateMutability)), [abi]);
  const [results, setResults] = useState({});
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState({});

  const query = async (fn, args = []) => {
    const key = sigOf(fn);
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const res = await fetch(`/api/contract/${address}/read`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ functionName: fn.name, signature: key, args, implementation }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, [key]: res.ok ? data : { error: data.error ?? 'Request failed' } }));
    } catch (err) {
      setResults((r) => ({ ...r, [key]: { error: err.message } }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  useEffect(() => {
    // Auto-load parameterless getters (like Etherscan), capped to keep it light.
    fns.filter((f) => !f.inputs?.length).slice(0, 25).forEach((f) => query(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, implementation, fns]);

  if (!fns.length) return <div className="p-4 text-sm text-muted">This contract has no read functions.</div>;
  return (
    <div className="space-y-2 p-4">
      {fns.map((fn, i) => {
        const key = sigOf(fn);
        return (
          <FunctionItem key={key} index={i} fn={fn} defaultOpen={!fn.inputs?.length}>
            {fn.inputs?.length > 0 && (
              <>
                <Inputs fn={fn} values={values[key] ?? {}} setValues={(u) => setValues((v) => ({ ...v, [key]: typeof u === 'function' ? u(v[key] ?? {}) : u }))} />
                <button type="button" disabled={busy[key]} onClick={() => query(fn, fn.inputs.map((_, j) => values[key]?.[j] ?? ''))} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-60">
                  {busy[key] ? 'Querying…' : 'Query'}
                </button>
              </>
            )}
            {busy[key] && !fn.inputs?.length ? <div className="text-xs text-muted">Loading…</div> : <Output result={results[key]} />}
          </FunctionItem>
        );
      })}
    </div>
  );
}

/** Write Contract: sends transactions through the user's injected wallet (EIP-1193). */
export function WriteContract({ address, abi, chainId }) {
  const fns = useMemo(() => (abi ?? []).filter((f) => f.type === 'function' && ['nonpayable', 'payable'].includes(f.stateMutability)), [abi]);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [values, setValues] = useState({});
  const [txs, setTxs] = useState({});

  const wallet = () => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No injected wallet found. Install MetaMask or another EIP-1193 wallet.');
    return createWalletClient({ transport: custom(window.ethereum) });
  };

  const connect = async () => {
    setError(null);
    try {
      const [acc] = await wallet().requestAddresses();
      setAccount(acc);
      if (chainId) {
        const current = await wallet().getChainId();
        if (current !== chainId) {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
        }
      }
    } catch (err) {
      setError(err.shortMessage ?? err.message);
    }
  };

  const write = async (fn) => {
    const key = sigOf(fn);
    setTxs((t) => ({ ...t, [key]: { pending: true } }));
    try {
      const vals = values[key] ?? {};
      const args = (fn.inputs ?? []).map((inp, i) => coerce(inp.type, vals[i] ?? ''));
      const hash = await wallet().writeContract({
        account,
        address,
        abi: [fn],
        functionName: fn.name,
        args,
        value: fn.stateMutability === 'payable' && vals.value ? parseEther(String(vals.value)) : undefined,
        chain: null,
      });
      setTxs((t) => ({ ...t, [key]: { hash } }));
    } catch (err) {
      setTxs((t) => ({ ...t, [key]: { error: err.shortMessage ?? err.message } }));
    }
  };

  if (!fns.length) return <div className="p-4 text-sm text-muted">This contract has no write functions.</div>;
  return (
    <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {account ? (
          <span className="rounded-md border border-success/40 bg-success-soft px-2 py-1 text-xs">Connected: <span className="hash">{account}</span></span>
        ) : (
          <button type="button" onClick={connect} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover">Connect to Web3</button>
        )}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      {fns.map((fn, i) => {
        const key = sigOf(fn);
        const st = txs[key];
        return (
          <FunctionItem key={key} index={i} fn={fn}>
            {fn.stateMutability === 'payable' && (
              <label className="block text-xs">
                <span className="text-muted">payableAmount (ether)</span>
                <input value={values[key]?.value ?? ''} onChange={(e) => setValues((v) => ({ ...v, [key]: { ...(v[key] ?? {}), value: e.target.value } }))} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary" placeholder="0.0" />
              </label>
            )}
            <Inputs fn={fn} values={values[key] ?? {}} setValues={(u) => setValues((v) => ({ ...v, [key]: typeof u === 'function' ? u(v[key] ?? {}) : u }))} />
            <button type="button" disabled={!account || st?.pending} onClick={() => write(fn)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-60">
              {st?.pending ? 'Confirm in wallet…' : 'Write'}
            </button>
            {st?.hash && <div className="text-xs">Submitted: <Link className="link hash" href={`/tx/${st.hash}`}>{st.hash}</Link></div>}
            {st?.error && <div className="text-xs text-danger">{st.error}</div>}
          </FunctionItem>
        );
      })}
    </div>
  );
}

/** Multi-file source viewer with per-file copy. */
export function SourceViewer({ files }) {
  const [active, setActive] = useState(0);
  if (!files?.length) return null;
  const f = files[active];
  return (
    <div>
      {files.length > 1 && (
        <div className="scrollbar-thin mb-2 flex gap-1 overflow-x-auto">
          {files.map((file, i) => (
            <button key={file.path} type="button" onClick={() => setActive(i)} className={`whitespace-nowrap rounded-md px-2 py-1 text-xs ${i === active ? 'bg-primary text-white' : 'bg-surface-3 hover:text-primary'}`}>
              {file.path.split('/').pop()}
            </button>
          ))}
        </div>
      )}
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>File {active + 1} of {files.length}: {f.path}</span>
        <button type="button" className="hover:text-primary" onClick={() => navigator.clipboard?.writeText(f.content)}>Copy</button>
      </div>
      <pre className="hash scrollbar-thin max-h-[32rem] overflow-auto rounded-lg border border-line bg-code p-3 text-xs leading-relaxed">{f.content}</pre>
    </div>
  );
}
