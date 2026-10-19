'use client';
import { useEffect, useId, useState } from 'react';
import Link from 'next/link';

const input = 'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary';

export default function VerifyForm({ initialAddress = '' }) {
  const sourceId = useId();
  const [meta, setMeta] = useState({ versions: [], evmVersions: ['default'], licenses: [] });
  const [form, setForm] = useState({
    address: initialAddress,
    codeFormat: 'solidity-single-file',
    compilerVersion: '',
    licenseType: 'MIT',
    contractName: '',
    optimizationUsed: '1',
    runs: '200',
    evmVersion: 'default',
    viaIR: false,
    sourceCode: '',
    constructorArguments: '',
  });
  const [libs, setLibs] = useState([{ name: '', address: '' }]);
  const [state, setState] = useState({ busy: false, result: null });

  useEffect(() => {
    fetch('/api/compilers')
      .then((r) => r.json())
      .then((d) => {
        if (!d.versions?.length) throw new Error(d.error || 'No Solidity compilers are available');
        setMeta(d);
        setForm((f) => ({ ...f, compilerVersion: f.compilerVersion || d.versions?.[0] || '' }));
      })
      .catch((error) => setState({ busy: false, result: { ok: false, error: error.message } }));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      setState({ busy: false, result: { ok: false, error: 'Source file too large (max 5 MB)' } });
      return;
    }
    const text = await file.text();
    setForm((f) => ({ ...f, sourceCode: text }));
    try {
      const parsed = JSON.parse(text);
      // Hardhat build-info files wrap the standard input.
      if (parsed.input?.sources) setForm((f) => ({ ...f, sourceCode: JSON.stringify(parsed.input), compilerVersion: parsed.solcLongVersion ? `v${parsed.solcLongVersion}` : f.compilerVersion }));
    } catch {
      /* plain .sol file */
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, result: null });
    const libraries = Object.fromEntries(libs.filter((l) => l.name && l.address).map((l) => [l.name, l.address]));
    try {
      const res = await fetch('/api/contract/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, libraries }),
      });
      const data = await res.json();
      setState({ busy: false, result: res.ok ? data : { ok: false, error: data.error ?? `HTTP ${res.status}` } });
    } catch (err) {
      setState({ busy: false, result: { ok: false, error: err.message } });
    }
  };

  const std = form.codeFormat === 'solidity-standard-json-input';
  return (
    <form onSubmit={submit} className="space-y-5 p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm md:col-span-3">
          Contract Address
          <input required value={form.address} onChange={set('address')} pattern="^0x[0-9a-fA-F]{40}$" placeholder="0x..." className={`${input} hash`} />
        </label>
        <label className="text-sm">
          Compiler Type
          <select value={form.codeFormat} onChange={set('codeFormat')} className={input}>
            <option value="solidity-single-file">Solidity (Single file)</option>
            <option value="solidity-standard-json-input">Solidity (Standard-Json-Input)</option>
          </select>
        </label>
        <label className="text-sm">
          Compiler Version
          <select required value={form.compilerVersion} onChange={set('compilerVersion')} className={input}>
            {meta.versions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Open Source License
          <select value={form.licenseType} onChange={set('licenseType')} className={input}>
            {meta.licenses.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        Contract Name {std ? <span className="text-muted">(e.g. contracts/Token.sol:Token; optional)</span> : <span className="text-muted">(optional, auto-detected)</span>}
        <input value={form.contractName} onChange={set('contractName')} className={input} placeholder={std ? 'path/File.sol:ContractName' : 'MyToken'} />
      </label>

      {!std && (
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm">
            Optimization
            <select value={form.optimizationUsed} onChange={set('optimizationUsed')} className={input}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </label>
          <label className="text-sm">
            Runs
            <input type="number" min="1" value={form.runs} onChange={set('runs')} className={input} />
          </label>
          <label className="text-sm">
            EVM Version
            <select value={form.evmVersion} onChange={set('evmVersion')} className={input}>
              {meta.evmVersions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.viaIR} onChange={set('viaIR')} /> Via IR
          </label>
        </div>
      )}

      <div className="text-sm">
        <div className="flex items-center justify-between">
          <label htmlFor={sourceId}>{std ? 'Standard JSON Input' : 'Solidity Source Code'}</label>
          <label className="cursor-pointer text-xs text-primary">
            Upload {std ? '.json / build-info' : '.sol'} file
            <input type="file" accept={std ? '.json' : '.sol,.txt'} onChange={onFile} className="hidden" />
          </label>
        </div>
        <textarea id={sourceId} required value={form.sourceCode} onChange={set('sourceCode')} rows={14} spellCheck={false} className={`${input} hash`} placeholder={std ? '{ "language": "Solidity", "sources": { ... }, "settings": { ... } }' : '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n...'} />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Constructor Arguments &amp; Libraries (optional)</summary>
        <div className="mt-3 space-y-3">
          <label className="block">
            ABI-encoded constructor arguments <span className="text-muted">(auto-detected when the creation transaction is indexed)</span>
            <textarea value={form.constructorArguments} onChange={set('constructorArguments')} rows={3} className={`${input} hash`} placeholder="000000000000000000000000..." />
          </label>
          {!std && libs.map((l, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-2">
              <input value={l.name} onChange={(e) => setLibs((ls) => ls.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={input} placeholder={`Library ${i + 1} name`} />
              <input value={l.address} onChange={(e) => setLibs((ls) => ls.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} className={`${input} hash`} placeholder="0x... (auto-detected if empty)" />
            </div>
          ))}
          {!std && libs.length < 10 && <button type="button" className="text-xs text-primary" onClick={() => setLibs((ls) => [...ls, { name: '', address: '' }])}>+ Add library</button>}
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button disabled={state.busy} type="submit" className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60">
          {state.busy ? 'Compiling & verifying…' : 'Verify and Publish'}
        </button>
        <button disabled={state.busy} type="button" onClick={() => { setForm((f) => ({ ...f, sourceCode: '', contractName: '', constructorArguments: '' })); setLibs([{ name: '', address: '' }]); setState({ busy: false, result: null }); }} className="text-sm text-muted hover:text-primary">Reset</button>
      </div>

      {state.result && (
        <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${state.result.ok ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft'}`}>
          {state.result.ok ? (
            <>
              <div className="font-medium">
                {state.result.alreadyVerified ? 'Contract source code already verified.' : `Successfully verified ${state.result.name} (${state.result.matchType === 'full' ? 'exact' : 'partial'} match).`}
              </div>
              <Link className="link" href={`/address/${form.address}?tab=contract`}>View contract →</Link>
            </>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans">{state.result.error}</pre>
          )}
        </div>
      )}
    </form>
  );
}
