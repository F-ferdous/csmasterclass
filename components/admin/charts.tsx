"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ───────────────────────── Shared ───────────────────────── */

export type Series = { key: string; label: string; color: string /* CSS var, e.g. var(--series-1) */ };

/** Width of a container, kept in sync with resizes (charts draw in real pixels so text never scales). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Clean axis ticks: 0, step, 2·step… with step from {1, 2, 2.5, 5}×10ⁿ. */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toFixed(6));
}

export const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${+(n / 1000).toFixed(1)}K` : n.toLocaleString("en-US");

/** Path for a bar with 4px rounded data-end and square base. */
function columnPath(x: number, y: number, w: number, h: number, roundTop: boolean) {
  const r = roundTop ? Math.min(4, w / 2, h) : 0;
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  // Keep inside the card: flip to the left of the pointer near the right edge.
  const left = x > width - 180 ? x - 168 : x + 12;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lift"
      style={{ left, top: Math.max(0, y - 8) }}
    >
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-2 text-ink-soft">
        <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}

export function Legend({ series, shape = "rect" }: { series: Series[]; shape?: "rect" | "line" }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className={shape === "rect" ? "size-2.5 rounded-[3px]" : "h-0.5 w-3.5 rounded-full"} style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Card with title, legend and a chart ⇄ table toggle (every value is reachable without hovering). */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  table: { head: string[]; rows: (string | number)[][] };
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={cn("rounded-3xl border border-line p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((t) => !t)}
          aria-pressed={showTable}
          className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-ink hover:text-ink"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>
      {legend && !showTable && <div className="mt-3">{legend}</div>}
      <div className="mt-4">
        {showTable ? (
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  {table.head.map((h, i) => (
                    <th key={h} className={cn("py-2 pr-4 font-medium", i > 0 && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    {r.map((c, j) => (
                      <td key={j} className={cn("py-2 pr-4", j > 0 && "text-right tabular-nums")}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

const AXIS = { left: 44, right: 8, top: 18, bottom: 26 };

/* ───────────────────────── Column chart (optionally stacked) ───────────────────────── */

export function ColumnChart({
  labels,
  series,
  values,
  format = compact,
  height = 220,
}: {
  labels: string[];
  series: Series[];
  /** values[i][seriesKey] */
  values: Record<string, number>[];
  format?: (n: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const totals = values.map((v) => series.reduce((s, x) => s + (v[x.key] ?? 0), 0));
  const ticks = niceTicks(Math.max(...totals, 0));
  const top = ticks.at(-1) || 1;
  const plotW = Math.max(0, width - AXIS.left - AXIS.right);
  const plotH = height - AXIS.top - AXIS.bottom;
  const band = labels.length ? plotW / labels.length : 0;
  const barW = Math.min(24, band * 0.6);
  const y = (v: number) => AXIS.top + plotH - (v / top) * plotH;
  const peak = totals.indexOf(Math.max(...totals));

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Column chart">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={AXIS.left} x2={width - AXIS.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={AXIS.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[10px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {labels.map((label, i) => {
            const cx = AXIS.left + band * i + band / 2;
            const x = cx - barW / 2;
            let acc = 0;
            const drawn = series.filter((s) => (values[i]?.[s.key] ?? 0) > 0);
            return (
              <g key={label}>
                {drawn.map((s, k) => {
                  const v = values[i][s.key];
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  const isTop = k === drawn.length - 1;
                  // 2px surface gap between stacked segments.
                  const h = Math.max(0, y0 - y1 - (k > 0 ? 2 : 0));
                  return (
                    <path
                      key={s.key}
                      d={columnPath(x, y1, barW, h, isTop)}
                      fill={s.color}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                      className="transition-opacity"
                    />
                  );
                })}
                {/* value at the cap — only the latest and the peak, to stay sparing */}
                {(i === labels.length - 1 || i === peak) && totals[i] > 0 && (
                  <text x={cx} y={y(totals[i]) - 6} textAnchor="middle" className="fill-ink text-[10px] font-semibold">
                    {format(totals[i])}
                  </text>
                )}
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-ink-faint text-[10px]">
                  {label}
                </text>
                {/* hit target: the whole band */}
                <rect
                  x={AXIS.left + band * i}
                  y={AXIS.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${label}: ${format(totals[i])}`}
                  onPointerMove={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                />
              </g>
            );
          })}
          <line x1={AXIS.left} x2={width - AXIS.right} y1={y(0)} y2={y(0)} stroke="var(--ink-faint)" strokeWidth={1} />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={AXIS.left + band * hover + band / 2} y={y(totals[hover])} width={width}>
          <p className="mb-1 font-medium text-ink">{labels[hover]}</p>
          {series.length > 1 && series.map((s) => <TooltipRow key={s.key} color={s.color} label={s.label} value={format(values[hover]?.[s.key] ?? 0)} />)}
          <TooltipRow color="transparent" label={series.length > 1 ? "Total" : series[0]?.label ?? "Value"} value={format(totals[hover])} />
        </Tooltip>
      )}
    </div>
  );
}

/* ───────────────────────── Line chart (single series, %) ───────────────────────── */

export function LineChart({
  labels,
  values,
  color = "var(--series-1)",
  label,
  format = (n: number) => `${n}%`,
  max = 100,
  height = 220,
}: {
  labels: string[];
  values: (number | null)[];
  color?: string;
  label: string;
  format?: (n: number) => string;
  max?: number;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(max);
  const top = ticks.at(-1) || 1;
  const plotW = Math.max(0, width - AXIS.left - AXIS.right);
  const plotH = height - AXIS.top - AXIS.bottom;
  const step = labels.length > 1 ? plotW / (labels.length - 1) : 0;
  const x = (i: number) => AXIS.left + (labels.length > 1 ? step * i : plotW / 2);
  const y = (v: number) => AXIS.top + plotH - (v / top) * plotH;
  type Pt = { x: number; y: number; v: number; i: number };
  const pts = values.map((v, i) => (v === null ? null : { x: x(i), y: y(v), v, i })).filter(Boolean) as Pt[];
  // Months with no data break the line instead of being bridged.
  const runs: Pt[][] = [];
  values.forEach((v, i) => {
    if (v === null) return;
    const p = pts.find((q) => q.i === i)!;
    if (i > 0 && values[i - 1] !== null && runs.length) runs.at(-1)!.push(p);
    else runs.push([p]);
  });
  const toLine = (run: Pt[]) => run.map((p, k) => `${k ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const last = pts.at(-1);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - rect.left) / (step || 1));
    setHover(Math.max(0, Math.min(labels.length - 1, i)));
  }

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${label} line chart`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={AXIS.left} x2={width - AXIS.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={AXIS.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[10px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {runs
            .filter((run) => run.length > 1)
            .map((run) => (
              <path key={`a${run[0].i}`} d={`${toLine(run)} L${run.at(-1)!.x},${y(0)} L${run[0].x},${y(0)} Z`} fill={color} opacity={0.1} />
            ))}
          {runs.map((run) =>
            run.length > 1 ? (
              <path key={`l${run[0].i}`} d={toLine(run)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ) : (
              // An isolated month still shows as a dot.
              <circle key={`d${run[0].i}`} cx={run[0].x} cy={run[0].y} r={4} fill={color} stroke="var(--paper)" strokeWidth={2} />
            ),
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={AXIS.top} y2={y(0)} stroke="var(--ink-faint)" strokeWidth={1} />}
          {pts
            .filter((p) => p.i === hover || p === last)
            .map((p) => (
              <circle key={p.i} cx={p.x} cy={p.y} r={4} fill={color} stroke="var(--paper)" strokeWidth={2} />
            ))}
          {last && (
            <text x={last.x} y={last.y - 10} textAnchor="end" className="fill-ink text-[10px] font-semibold">
              {format(last.v)}
            </text>
          )}
          {labels.map((l, i) => (
            <text key={l} x={x(i)} y={height - 8} textAnchor="middle" className="fill-ink-faint text-[10px]">
              {l}
            </text>
          ))}
          <line x1={AXIS.left} x2={width - AXIS.right} y1={y(0)} y2={y(0)} stroke="var(--ink-faint)" strokeWidth={1} />
          <rect
            x={AXIS.left - step / 2}
            y={AXIS.top}
            width={plotW + step}
            height={plotH}
            fill="transparent"
            tabIndex={0}
            aria-label={`${label}: ${labels.map((l, i) => `${l} ${values[i] === null ? "no data" : format(values[i]!)}`).join(", ")}`}
            onPointerMove={onMove}
            onFocus={() => setHover(labels.length - 1)}
            onBlur={() => setHover(null)}
            className="outline-none"
          />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={x(hover)} y={values[hover] === null ? AXIS.top : y(values[hover]!)} width={width}>
          <p className="mb-1 font-medium text-ink">{labels[hover]}</p>
          <TooltipRow color={color} label={label} value={values[hover] === null ? "No data" : format(values[hover]!)} />
        </Tooltip>
      )}
    </div>
  );
}

/* ───────────────────────── Horizontal bars / meters ───────────────────────── */

export function BarList({
  rows,
  color = "var(--series-1)",
  format = compact,
}: {
  /** With `capacity`, the bar is a meter: fill = value, track = capacity (same hue, lighter). */
  rows: { label: string; sublabel?: string; value: number; capacity?: number }[];
  color?: string;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.capacity ?? r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        const cap = r.capacity ? (r.capacity / max) * 100 : 0;
        const full = r.capacity ? r.value >= r.capacity : false;
        return (
          <li
            key={r.label + i}
            tabIndex={0}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ember sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm">{r.label}</span>
              {r.sublabel && <span className="block truncate text-[11px] text-ink-faint">{r.sublabel}</span>}
            </span>
            <span className="relative h-3">
              {r.capacity ? <span className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${cap}%`, background: color, opacity: 0.18 }} /> : null}
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] transition-opacity"
                style={{ width: `${pct}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.5 }}
              />
            </span>
            <span className="text-right text-sm tabular-nums">
              <span className="font-semibold">{format(r.value)}</span>
              {r.capacity ? <span className={cn("text-ink-faint", full && "text-ember")}> / {format(r.capacity)}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────────────────── Stat tile ───────────────────────── */

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  upIsGood = true,
}: {
  label: string;
  value: string;
  /** Signed change vs the previous period (null = no comparison). */
  delta?: number | null;
  deltaLabel?: string;
  upIsGood?: boolean;
}) {
  const good = delta === null || delta === undefined ? null : delta === 0 ? null : delta > 0 === upIsGood;
  return (
    <div className="rounded-2xl border border-line p-4 sm:p-5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight">{value}</p>
      {delta !== null && delta !== undefined && (
        <p className={cn("mt-1 text-xs", good === null ? "text-ink-soft" : good ? "text-forest" : "text-ember")}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {deltaLabel}
        </p>
      )}
    </div>
  );
}
