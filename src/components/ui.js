import Link from 'next/link';
import { FaCheckCircle, FaTimesCircle, FaClock, FaInfoCircle, FaExclamationTriangle, FaRegQuestionCircle } from 'react-icons/fa';

export function cx(...c) {
  return c.filter(Boolean).join(' ');
}

export function Container({ children, className }) {
  return <div className={cx('mx-auto w-full max-w-[1200px] px-5 md:px-8', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, children, icon }) {
  return (
    <div className="flex flex-col gap-6 border-b border-line py-9 md:flex-row md:items-end md:justify-between md:py-12">
      <div className="min-w-0">
        <div className="ledger-kicker mb-3 flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <span>On-chain record</span>
        </div>
        <h1 className="flex items-center gap-2 text-4xl font-semibold leading-none text-fg md:text-5xl">
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && <div className="mt-4 max-w-3xl text-base leading-7 text-muted">{subtitle}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ children, className, title, action, footer, bodyClassName }) {
  return (
    <section className={cx('overflow-hidden border-y border-line bg-transparent', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-0 py-4">
          <h2 className="text-xl font-semibold text-fg">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && <footer className="border-t border-line px-0 py-3 text-right font-sans text-[11px] uppercase tracking-[0.12em]">{footer}</footer>}
    </section>
  );
}

export function Hint({ text }) {
  if (!text) return null;
  return (
    <span title={text} aria-label={text} className="mr-1 inline-flex cursor-help text-muted">
      <FaRegQuestionCircle className="h-3.5 w-3.5" />
    </span>
  );
}

/** Two-column label/value row used on detail pages. */
export function DetailRow({ label, hint, children, className }) {
  return (
    <div className={cx('grid grid-cols-1 gap-2 border-b border-line px-0 py-4 last:border-b-0 md:grid-cols-[minmax(220px,27%)_1fr] md:gap-6', className)}>
      <div className="flex items-center font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        <Hint text={hint} />
        {label}
      </div>
      <div className="min-w-0 break-words text-[15px] text-fg">{children}</div>
    </div>
  );
}

const BADGE = {
  default: 'bg-surface-3 text-fg border-line-strong',
  primary: 'bg-primary-soft text-primary border-primary/30',
  success: 'bg-success-soft text-success border-success/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
};

export function Badge({ children, tone = 'default', className, title }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] border px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider', BADGE[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, pending }) {
  if (pending) return <Badge tone="warning"><FaClock /> Pending</Badge>;
  if (status === 0) return <Badge tone="danger"><FaTimesCircle /> Failed</Badge>;
  if (status === 1) return <Badge tone="success"><FaCheckCircle /> Success</Badge>;
  return <Badge>Unknown</Badge>;
}

export function Notice({ tone = 'info', children, className }) {
  const styles = {
    info: 'border-primary/30 bg-primary-soft text-fg',
    warning: 'border-warning/40 bg-warning-soft text-fg',
    danger: 'border-danger/40 bg-danger-soft text-fg',
    success: 'border-success/40 bg-success-soft text-fg',
  };
  const Icon = tone === 'danger' || tone === 'warning' ? FaExclamationTriangle : FaInfoCircle;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-2 border border-l-2 px-4 py-3 text-sm', styles[tone], className)}>
      <Icon className={cx('mt-0.5 shrink-0', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-primary')} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({ children = 'No records found', className }) {
  return <div className={cx('px-4 py-12 text-center text-sm text-muted', className)}>{children}</div>;
}

/** Link-based tabs (server rendered, shareable URLs). */
export function Tabs({ tabs, active, className }) {
  return (
    <nav className={cx('scrollbar-thin -mb-px flex gap-7 overflow-x-auto border-b border-line', className)} aria-label="Tabs">
      {tabs.filter(Boolean).map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          aria-current={t.key === active ? 'page' : undefined}
          className={cx(
            'whitespace-nowrap border-b-2 px-0 py-3 font-sans text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
            t.key === active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-primary',
          )}
        >
          {t.label}
          {t.count !== undefined && t.count !== null && <span className="ml-1 opacity-75">({t.count})</span>}
        </Link>
      ))}
    </nav>
  );
}

function pageHref(base, params, page) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  sp.set('p', String(page));
  return `${base}?${sp.toString()}`;
}

/** First / prev / "Page x of y" / next / last pagination (links). */
export function Pagination({ base, params, page, totalPages, className }) {
  if (!totalPages || totalPages <= 1) return null;
  const btn = 'border border-line bg-surface px-2.5 py-1 font-sans text-[11px] font-medium';
  const link = cx(btn, 'link hover:bg-primary-soft');
  const disabled = cx(btn, 'cursor-not-allowed text-muted opacity-60');
  return (
    <nav className={cx('flex items-center justify-end gap-1', className)} aria-label="Pagination">
      {page > 1 ? <Link className={link} href={pageHref(base, params, 1)}>First</Link> : <span className={disabled}>First</span>}
      {page > 1 ? <Link className={link} href={pageHref(base, params, page - 1)} aria-label="Previous page">&lt;</Link> : <span className={disabled}>&lt;</span>}
      <span className={cx(btn, 'text-muted')}>Page {page.toLocaleString('en-US')} of {totalPages.toLocaleString('en-US')}</span>
      {page < totalPages ? <Link className={link} href={pageHref(base, params, page + 1)} aria-label="Next page">&gt;</Link> : <span className={disabled}>&gt;</span>}
      {page < totalPages ? <Link className={link} href={pageHref(base, params, totalPages)}>Last</Link> : <span className={disabled}>Last</span>}
    </nav>
  );
}

export function Table({ children, className, compact = false }) {
  return (
    <div className={cx('scrollbar-thin overflow-x-auto', className)}>
      <table className={cx('w-full border-collapse text-left text-sm', compact ? 'min-w-0' : 'min-w-[720px]')}>{children}</table>
    </div>
  );
}

export function Th({ children, className, align }) {
  return <th scope="col" className={cx('whitespace-nowrap border-y border-line bg-transparent px-3 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted', align === 'right' && 'text-right', className)}>{children}</th>;
}

export function Td({ children, className, align, colSpan }) {
  return <td colSpan={colSpan} className={cx('whitespace-nowrap border-b border-line px-3 py-3.5 align-middle', align === 'right' && 'text-right', className)}>{children}</td>;
}

export function Stat({ label, value, sub, icon }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 text-base text-primary">{icon}</div>}
      <div className="min-w-0">
        <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
        <div className="mt-1 truncate text-xl font-semibold text-fg">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function Progress({ value, tone = 'primary' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-0.5 w-full overflow-hidden bg-surface-3" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full', tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-success' : 'bg-primary')} style={{ width: `${v}%` }} />
    </div>
  );
}

export function CodeBlock({ children, className, maxHeight = '24rem' }) {
  return (
    <pre className={cx('hash scrollbar-thin overflow-auto whitespace-pre-wrap break-all border border-line bg-code p-4 text-xs text-fg', className)} style={{ maxHeight }}>
      {children}
    </pre>
  );
}
