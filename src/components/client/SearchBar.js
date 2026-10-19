'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaSpinner } from 'react-icons/fa';

const FILTERS = [
  { value: 'all', label: 'All Filters' },
  { value: 'address', label: 'Addresses' },
  { value: 'token', label: 'Tokens' },
  { value: 'block', label: 'Blocks' },
  { value: 'tx', label: 'Transactions' },
];

export default function SearchBar({ size = 'md', autoFocus = false, initialQuery = '', initialFilter = 'all' }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const [results, setResults] = useState({ term: '', filter: 'all', items: [] });
  const [error, setError] = useState(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (!focused || term.length < 2) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&f=${filter}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults({ term, filter, items: data.results ?? [] });
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
  }, [q, filter, focused]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setFocused(false);
    setOpen(false);
    if (active >= 0 && shown[active]) {
      router.push(shown[active].path);
      setOpen(false);
      return;
    }
    const term = q.trim();
    if (!term) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?resolve=1&q=${encodeURIComponent(term)}&f=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search is temporarily unavailable');
      router.push(data.result?.path ?? `/search?q=${encodeURIComponent(term)}&f=${filter}`);
      setOpen(false);
    } catch (err) {
      setError(err.message);
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
  const shown = q.trim().length >= 2 && q.trim() === results.term && filter === results.filter ? results.items : [];
  return (
    <div ref={boxRef} className="relative w-full" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setFocused(false);
        setOpen(false);
      }
    }}>
      <form onSubmit={submit} role="search" className={`flex items-stretch border border-line-strong bg-surface ${big ? 'min-h-14' : 'min-h-10'}`}>
        {!big && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search filter" className="hidden border-r border-line bg-surface-2 px-3 font-sans text-xs text-fg outline-none sm:block">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        )}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setFocused(true); }}
          onFocus={() => { setFocused(true); if (shown.length) setOpen(true); }}
          onKeyDown={onKey}
          autoFocus={autoFocus}
          spellCheck={false}
          aria-label="Search by address, transaction hash, block, token"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 && shown[active] ? `${listId}-${active}` : undefined}
          aria-expanded={open && shown.length > 0}
          placeholder="Search by address, transaction, block or token"
          className={`min-w-0 flex-1 bg-transparent px-4 text-fg outline-none placeholder:text-muted ${big ? 'py-3 text-base' : 'py-2 text-sm'}`}
        />
        <button type="submit" disabled={busy} aria-label="Search" className="flex items-center justify-center gap-2 bg-primary px-5 font-sans text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-primary-hover disabled:opacity-60">
          {busy ? <FaSpinner className="animate-spin" /> : <FaSearch className="h-3 w-3" />}
          <span className={big ? '' : 'hidden xl:inline'}>Search</span>
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {open && shown.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto border border-line-strong bg-surface py-1 text-left shadow-lg">
          {shown.map((r, i) => (
            <li id={`${listId}-${i}`} key={`${r.path}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  router.push(r.path);
                  setFocused(false);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-primary-soft' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-fg">{r.title}</span>
                  {r.subtitle && <span className="hash block truncate text-xs text-muted">{r.subtitle}</span>}
                </span>
                <span className="shrink-0 bg-surface-3 px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wider text-muted">{r.badge ?? r.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
