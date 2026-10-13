'use client';
import { useState } from 'react';
import Link from 'next/link';
import { formatUnits, parseUnits, recoverMessageAddress, isAddress, getAddress } from 'viem';

const input = 'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary';
const button = 'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60';

const UNITS = [
  ['Wei', 0], ['Kwei', 3], ['Mwei', 6], ['Gwei', 9], ['Szabo', 12], ['Finney', 15], ['Ether', 18], ['KEther', 21], ['MEther', 24], ['GEther', 27], ['TEther', 30],
];

export function UnitConverter() {
  const [wei, setWei] = useState(10n ** 18n);
  const [edit, setEdit] = useState({});
  const [error, setError] = useState(null);
  const onChange = (name, decimals) => (e) => {
    const v = e.target.value;
    setEdit({ [name]: v });
    try {
      setWei(parseUnits(v === '' ? '0' : v.replace(/,/g, ''), decimals));
      setError(null);
    } catch {
      setError(`Invalid ${name} amount`);
    }
  };
  return (
    <div className="space-y-3 p-5">
      {UNITS.map(([name, d]) => (
        <label key={name} className="grid items-center gap-2 text-sm md:grid-cols-[1fr_120px]">
          <input value={edit[name] ?? formatUnits(wei, d)} onChange={onChange(name, d)} onBlur={() => setEdit({})} inputMode="decimal" className={`${input} hash mt-0`} aria-label={name} />
          <span className="font-medium">{name} <span className="text-xs text-muted">(10^{d})</span></span>
        </label>
      ))}
      {error && <div className="text-sm text-danger">{error}</div>}
    </div>
  );
}

export function InputDecoder() {
  const [data, setData] = useState('');
  const [abi, setAbi] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState({});
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const res = await fetch('/api/decode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: data.trim(), abi: abi.trim() || undefined, address: address.trim() || undefined }),
      });
      const json = await res.json();
      setState(res.ok ? { decoded: json.decoded } : { error: json.error });
    } catch (err) {
      setState({ error: err.message });
    }
  };
  const d = state.decoded;
  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <label className="block text-sm">Input data (calldata)<textarea required rows={5} value={data} onChange={(e) => setData(e.target.value)} className={`${input} hash`} placeholder="0xa9059cbb000000000000..." /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">Contract ABI <span className="text-muted">(optional JSON)</span><textarea rows={4} value={abi} onChange={(e) => setAbi(e.target.value)} className={`${input} hash`} placeholder='[{"type":"function","name":"transfer",...}]' /></label>
        <label className="block text-sm">or verified contract address <span className="text-muted">(optional)</span><input value={address} onChange={(e) => setAddress(e.target.value)} className={`${input} hash`} placeholder="0x..." /></label>
      </div>
      <button className={button} disabled={state.busy} type="submit">{state.busy ? 'Decoding…' : 'Decode'}</button>
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
      {d && (
        d.name ? (
          <div className="overflow-x-auto rounded-lg border border-line">
            <div className="border-b border-line bg-surface-2 px-3 py-2 text-sm"><span className="hash">{d.signature}</span> <span className="text-xs text-muted">({d.source})</span></div>
            <table className="w-full text-left text-xs">
              <thead><tr><th className="px-3 py-1.5">#</th><th className="px-3 py-1.5">Name</th><th className="px-3 py-1.5">Type</th><th className="px-3 py-1.5">Value</th></tr></thead>
              <tbody>{d.args.map((a, i) => <tr key={i} className="border-t border-line"><td className="px-3 py-1.5">{i}</td><td className="px-3 py-1.5">{a.name}</td><td className="hash px-3 py-1.5">{a.type}</td><td className="hash break-all px-3 py-1.5">{typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="text-sm text-muted">No matching signature found for selector <span className="hash">{d.selector}</span>. Provide the ABI to decode.</div>
      )}
    </form>
  );
}

export function BroadcastTx() {
  const [raw, setRaw] = useState('');
  const [state, setState] = useState({});
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const res = await fetch('/api/broadcast', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signedTransaction: raw.trim() }) });
      const json = await res.json();
      setState(json.ok ? { hash: json.hash } : { error: json.error ?? `HTTP ${res.status}` });
    } catch (err) {
      setState({ error: err.message });
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <p className="text-sm text-muted">Broadcast a signed raw transaction (e.g. created offline or by a hardware wallet). The transaction must already be signed; this tool never sees private keys.</p>
      <textarea required rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} className={`${input} hash`} placeholder="0x02f8..." />
      <button className={button} disabled={state.busy} type="submit">{state.busy ? 'Sending…' : 'Send Transaction'}</button>
      {state.hash && <div className="rounded-lg border border-success/40 bg-success-soft px-3 py-2 text-sm">Transaction submitted: <Link className="link hash" href={`/tx/${state.hash}`}>{state.hash}</Link></div>}
      {state.error && <div className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm">{String(state.error)}</div>}
    </form>
  );
}

export function VerifySignature() {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [state, setState] = useState({});
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (!isAddress(address.trim())) throw new Error('Invalid address');
      const recovered = await recoverMessageAddress({ message, signature: signature.trim() });
      setState({ ok: getAddress(recovered) === getAddress(address.trim()), recovered });
    } catch (err) {
      setState({ error: err.shortMessage ?? err.message });
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <p className="text-sm text-muted">Check that a message was signed by an address (EIP-191 personal_sign). Verification runs entirely in your browser.</p>
      <label className="block text-sm">Address<input required value={address} onChange={(e) => setAddress(e.target.value)} className={`${input} hash`} placeholder="0x..." /></label>
      <label className="block text-sm">Message<textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={input} /></label>
      <label className="block text-sm">Signature hash<textarea required rows={3} value={signature} onChange={(e) => setSignature(e.target.value)} className={`${input} hash`} placeholder="0x..." /></label>
      <button className={button} type="submit">Verify</button>
      {state.recovered && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${state.ok ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft'}`}>
          {state.ok ? 'Message signature verified.' : 'Signature does not match this address.'} Recovered signer: <span className="hash">{state.recovered}</span>
        </div>
      )}
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
    </form>
  );
}
