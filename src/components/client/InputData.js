'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import CopyButton from './CopyButton';

function words(hex) {
  const body = hex.slice(10);
  return body.match(/.{1,64}/g) ?? [];
}

function utf8(hex) {
  try {
    const bytes = new Uint8Array((hex.slice(2).match(/.{2}/g) ?? []).map((b) => Number.parseInt(b, 16)));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

function renderValue(arg) {
  const v = arg.value;
  if (arg.type === 'address' && typeof v === 'string') {
    return <Link className="link hash" href={`/address/${v}`}>{v}</Link>;
  }
  if (typeof v === 'object') return <span className="hash break-all">{JSON.stringify(v)}</span>;
  return <span className="hash break-all">{String(v)}</span>;
}

/** Input data viewer: decoded table, Etherscan-style default view, raw hex, UTF-8. */
export default function InputData({ input, decoded }) {
  const hasDecoded = Boolean(decoded?.name);
  const [view, setView] = useState(hasDecoded ? 'decoded' : 'original');
  const defaultView = useMemo(() => {
    if (!input || input === '0x') return '0x';
    const lines = [];
    if (decoded?.signature) lines.push(`Function: ${decoded.signature}`, '');
    lines.push(`MethodID: ${input.slice(0, 10)}`);
    words(input).forEach((w, i) => lines.push(`[${i}]:  ${w}`));
    return lines.join('\n');
  }, [input, decoded]);

  if (!input || input === '0x') return <span className="hash text-muted">0x</span>;
  const tabs = [hasDecoded && ['decoded', 'Decoded'], ['default', 'Default View'], ['original', 'Original'], ['utf8', 'UTF-8']].filter(Boolean);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setView(k)} className={`rounded-md px-2 py-1 text-xs font-medium ${view === k ? 'bg-primary text-white' : 'bg-surface-3 text-fg hover:text-primary'}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto"><CopyButton value={input} label="Copy input data" /></span>
      </div>
      {view === 'decoded' && hasDecoded ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <div className="border-b border-line bg-surface-2 px-3 py-2 text-xs">
            <span className="hash">{decoded.signature}</span>
            {decoded.source === 'signature' && <span className="ml-2 text-muted">(decoded from signature database)</span>}
          </div>
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-surface-2"><th className="px-3 py-1.5">#</th><th className="px-3 py-1.5">Name</th><th className="px-3 py-1.5">Type</th><th className="px-3 py-1.5">Data</th></tr></thead>
            <tbody>
              {decoded.args.map((a, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="px-3 py-1.5">{i}</td>
                  <td className="px-3 py-1.5">{a.name}</td>
                  <td className="hash px-3 py-1.5 text-muted">{a.type}</td>
                  <td className="px-3 py-1.5">{renderValue(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="hash scrollbar-thin max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-line bg-code p-3 text-xs">
          {view === 'original' ? input : view === 'utf8' ? utf8(input) : defaultView}
        </pre>
      )}
    </div>
  );
}
