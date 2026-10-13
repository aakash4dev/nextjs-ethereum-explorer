'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

const fmtCompact = (v) =>
  v !== 0 && Math.abs(v) < 0.01 ? Number(v.toPrecision(2)).toString() : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
const fmtFull = (v) =>
  v !== 0 && Math.abs(v) < 0.000001 ? v.toExponential(3) : new Intl.NumberFormat('en-US', { maximumFractionDigits: v !== 0 && Math.abs(v) < 1 ? 6 : 2 }).format(v);

function niceMax(max) {
  if (max <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(max));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/**
 * Single-series SVG chart (area or bar) with crosshair/hover tooltip,
 * keyboard navigation and an accessible table view.
 *
 * points: [{ label: string, value: number }]
 */
export default function Chart({ points, type: requestedType = 'area', height = 280, unit = '', title, compact = false, valueFormatter = fmtFull, showTable = true }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = compact ? { t: 6, r: 4, b: 4, l: 4 } : { t: 12, r: 12, b: 28, l: 56 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = points.length;
  const type = n < 2 ? 'bar' : requestedType;

  const { yMax, ticks } = useMemo(() => {
    const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
    return { yMax: max, ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => f * max) };
  }, [points]);

  if (!n) return <div className="flex h-24 items-center justify-center text-sm text-muted">No data yet</div>;

  const x = (i) => pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => pad.t + innerH - (v / yMax) * innerH;
  const band = innerW / n;
  const barW = Math.max(1, Math.min(28, band - 2)); // 2px surface gap between bars

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const area = `${line}L${x(n - 1).toFixed(1)},${pad.t + innerH}L${x(0).toFixed(1)},${pad.t + innerH}Z`;

  const indexFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    if (type === 'bar') return Math.min(n - 1, Math.max(0, Math.floor((px - pad.l) / band)));
    return Math.min(n - 1, Math.max(0, Math.round(((px - pad.l) / innerW) * (n - 1))));
  };

  const onKey = (e) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
  };

  const hx = hover === null ? 0 : type === 'bar' ? pad.l + band * hover + band / 2 : x(hover);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 90))));

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title ? `${title} chart` : 'Chart'}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={(e) => setHover(indexFromEvent(e))}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        className="block touch-pan-y outline-none"
      >
        {!compact &&
          ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)">
                {fmtCompact(t)}
              </text>
            </g>
          ))}
        {!compact &&
          points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.label} x={type === 'bar' ? pad.l + band * i + band / 2 : x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {p.label.length > 7 ? p.label.slice(5) : p.label}
              </text>
            ) : null,
          )}
        {type === 'bar' ? (
          points.map((p, i) => {
            const h = Math.max(p.value > 0 ? 1 : 0, pad.t + innerH - y(p.value));
            const bx = pad.l + band * i + (band - barW) / 2;
            const r = Math.min(4, barW / 2, h);
            const top = pad.t + innerH - h;
            // Rounded data-end, square baseline.
            const d = `M${bx},${pad.t + innerH}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + barW - r}Q${bx + barW},${top} ${bx + barW},${top + r}V${pad.t + innerH}Z`;
            return <path key={p.label} d={d} fill="var(--chart-1)" opacity={hover === null || hover === i ? 1 : 0.55} />;
          })
        ) : (
          <>
            <path d={area} fill="var(--chart-1)" opacity="0.12" />
            <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {hover !== null && (
          <g pointerEvents="none">
            {type !== 'bar' && <line x1={hx} x2={hx} y1={pad.t} y2={pad.t + innerH} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />}
            {type !== 'bar' && <circle cx={hx} cy={y(points[hover].value)} r="4.5" fill="var(--chart-1)" stroke="var(--surface)" strokeWidth="2" />}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md"
          style={{ left: Math.min(Math.max(0, hx - 70), width - 150), minWidth: 140 }}
        >
          <div className="text-sm font-semibold text-fg">
            {valueFormatter(points[hover].value)} {unit}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-muted">
            <span className="inline-block h-0.5 w-3 rounded" style={{ background: 'var(--chart-1)' }} />
            {points[hover].label}
          </div>
        </div>
      )}
      {showTable && !compact && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-muted hover:text-primary">View data table</summary>
          <div className="scrollbar-thin mt-2 max-h-64 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 text-right font-semibold">{title ?? 'Value'}{unit ? ` (${unit})` : ''}</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.label} className="border-t border-line">
                    <td className="px-3 py-1.5">{p.label}</td>
                    <td className="px-3 py-1.5 text-right">{valueFormatter(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
