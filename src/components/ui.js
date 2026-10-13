import Link from 'next/link';
import { FaCheckCircle, FaTimesCircle, FaClock, FaInfoCircle, FaExclamationTriangle, FaRegQuestionCircle } from 'react-icons/fa';

export function cx(...c) {
  return c.filter(Boolean).join(' ');
}

export function Container({ children, className }) {
  return <div className={cx('mx-auto w-full max-w-[1400px] px-4 md:px-6', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, children, icon }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-fg md:text-xl">
          {icon}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ children, className, title, action, footer, bodyClassName }) {
  return (
    <section className={cx('overflow-hidden rounded-xl border border-line bg-surface shadow-sm', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && <footer className="border-t border-line bg-surface-2 px-4 py-2.5 text-center text-xs">{footer}</footer>}
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
    <div className={cx('grid grid-cols-1 gap-1 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[minmax(200px,26%)_1fr] md:gap-4', className)}>
      <div className="flex items-center text-sm text-muted">
        <Hint text={hint} />
        {label}:
      </div>
      <div className="min-w-0 break-words text-sm text-fg">{children}</div>
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
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs font-medium', BADGE[tone], className)}>
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
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-2 rounded-lg border px-4 py-3 text-sm', styles[tone], className)}>
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
    <nav className={cx('scrollbar-thin -mb-px flex gap-1 overflow-x-auto', className)} aria-label="Tabs">
      {tabs.filter(Boolean).map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          aria-current={t.key === active ? 'page' : undefined}
          className={cx(
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            t.key === active ? 'bg-primary text-white' : 'bg-surface-3 text-fg hover:bg-primary-soft hover:text-primary',
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
  const btn = 'rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium';
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
  return <th scope="col" className={cx('whitespace-nowrap border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold text-fg', align === 'right' && 'text-right', className)}>{children}</th>;
}

export function Td({ children, className, align, colSpan }) {
  return <td colSpan={colSpan} className={cx('whitespace-nowrap border-b border-line px-4 py-3 align-middle', align === 'right' && 'text-right', className)}>{children}</td>;
}

export function Stat({ label, value, sub, icon }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 text-2xl text-muted">{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-0.5 truncate font-medium text-fg">{value}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function Progress({ value, tone = 'primary' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full', tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-success' : 'bg-primary')} style={{ width: `${v}%` }} />
    </div>
  );
}

export function CodeBlock({ children, className, maxHeight = '24rem' }) {
  return (
    <pre className={cx('hash scrollbar-thin overflow-auto whitespace-pre-wrap break-all rounded-lg border border-line bg-code p-3 text-xs text-fg', className)} style={{ maxHeight }}>
      {children}
    </pre>
  );
}
