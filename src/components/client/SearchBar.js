'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaSpinner } from 'react-icons/fa';

const FILTERS = [
  { value: 'all', label: 'All Filters' },
  { value: 'address', label: 'Addresses' },
  { value: 'token', label: 'Tokens' },
  { value: 'block', label: 'Blocks' },
  { value: 'tx', label: 'Transactions' },
];

export default function SearchBar({ size = 'md', autoFocus = false }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        /* aborted */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (active >= 0 && shown[active]) {
      router.push(shown[active].path);
      setOpen(false);
      return;
    }
    const term = q.trim();
    if (!term) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/search?resolve=1&q=${encodeURIComponent(term)}`);
      const data = await res.json();
      router.push(data.result?.path ?? `/search?q=${encodeURIComponent(term)}&f=${filter}`);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (!open || !shown.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % shown.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? shown.length - 1 : a - 1));
    } else if (e.key === 'Escape') setOpen(false);
  };

  const big = size === 'lg';
  const shown = q.trim().length >= 2 ? results : [];
  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search" className={`flex items-stretch overflow-hidden rounded-xl border border-line bg-surface shadow-sm ${big ? 'p-1.5' : 'p-1'}`}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search filter" className="hidden rounded-lg bg-surface-2 px-2 text-sm text-fg outline-none sm:block">
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => shown.length && setOpen(true)}
          onKeyDown={onKey}
          autoFocus={autoFocus}
          spellCheck={false}
          aria-label="Search by address, transaction hash, block, token"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={open && shown.length > 0}
          placeholder="Search by Address / Txn Hash / Block / Token"
          className={`min-w-0 flex-1 bg-transparent px-3 text-fg outline-none placeholder:text-muted ${big ? 'py-2.5 text-base' : 'py-1.5 text-sm'}`}
        />
        <button type="submit" aria-label="Search" className="flex items-center justify-center rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-hover">
          {busy ? <FaSpinner className="animate-spin" /> : <FaSearch />}
        </button>
      </form>
      {open && shown.length > 0 && (
        <ul id="search-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded-xl border border-line bg-surface py-1 text-left shadow-lg">
          {shown.map((r, i) => (
            <li key={`${r.path}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  router.push(r.path);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-primary-soft' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{r.title}</span>
                  {r.subtitle && <span className="hash block truncate text-xs text-muted">{r.subtitle}</span>}
                </span>
                <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] uppercase text-muted">{r.badge ?? r.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
