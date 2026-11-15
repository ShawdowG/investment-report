"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RISK_ON = "#10b981";
const RISK_OFF = "#ef4444";

export interface SentimentAreaChartPoint {
  date: string;
}

/**
 * SPEC-023 W8.E — horizontal reference line drawn at `y` with a color tied
 * to the trade-level kind. Theme-aware: resolves to a `--color-regime-*`
 * CSS var so dark + light themes both render correctly.
 */
export interface SentimentAreaReferenceLine {
  y: number;
  kind: "add" | "trim" | "sell";
  /** Optional short caption rendered at the right end of the line. */
  label?: string;
  /** When true, line renders thicker (used when the zone is currently in range). */
  emphasis?: boolean;
  /**
   * SPEC-026 W10.A — distinct from `emphasis` (which means "in range now").
   * Set true when this level's `lastCrossedAt` is within the last 7 days but
   * price has since recovered, so the chart still hints that the user should
   * pay attention. Renders thicker (2.5) like `emphasis`; if both are set,
   * either is enough.
   */
  recentlyCrossed?: boolean;
}

const REFERENCE_LINE_COLORS: Record<SentimentAreaReferenceLine["kind"], string> = {
  add: "var(--color-regime-risk-on)",
  trim: "var(--color-regime-neutral)",
  sell: "var(--color-regime-risk-off)",
};

interface TooltipPayloadEntry<T> {
  payload?: T;
}

interface TooltipRenderProps<T> {
  active?: boolean;
  payload?: TooltipPayloadEntry<T>[];
}

interface SentimentAreaChartProps<T extends SentimentAreaChartPoint> {
  data: T[];
  /** Programmatic chart name shown in the non-visual summary. */
  title?: string;
  /** Key on each datum holding the y-axis numeric value. */
  yKey: keyof T & string;
  /** Format any y-axis numeric value for ticks + tooltip. */
  formatY: (n: number) => string;
  /** Height in pixels. Defaults to 280. */
  height?: number;
  /** Format the x-axis tick label. Default chops off the YYYY- prefix. */
  formatXTick?: (date: string) => string;
  /** Custom tooltip — defaults to {formatY(value), date}. */
  renderTooltip?: (point: T) => React.ReactNode;
  /** Minimum tick gap on x-axis. Default 40. */
  xTickGap?: number;
  /** Optional horizontal reference lines (SPEC-023 trade-plan zones). */
  referenceLines?: SentimentAreaReferenceLine[];
}

/**
 * AreaChart with sentiment-colored fill: green when end ≥ start, red otherwise.
 * Used by /ticker price chart and the dashboard portfolio equity chart so
 * they share grid/axis/tooltip styling. Theme-aware via CSS vars.
 */
export function SentimentAreaChart<T extends SentimentAreaChartPoint>({
  data,
  title = "Time series",
  yKey,
  formatY,
  height = 280,
  formatXTick = (d) => d.slice(5),
  renderTooltip,
  xTickGap = 40,
  referenceLines,
}: SentimentAreaChartProps<T>) {
  const gradientId = useId();

  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Not enough data for this range.
      </div>
    );
  }

  const first = data[0][yKey] as unknown as number;
  const last = data[data.length - 1][yKey] as unknown as number;
  const values = data
    .map((point) => point[yKey] as unknown as number)
    .filter((value) => Number.isFinite(value));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const color = last >= first ? RISK_ON : RISK_OFF;
  const tablePoints = data.filter((_, index) => {
    if (data.length <= 12) return true;
    const interval = Math.ceil((data.length - 1) / 10);
    return index === 0 || index === data.length - 1 || index % interval === 0;
  });

  function DefaultTooltip({ active, payload }: TooltipRenderProps<T>) {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    if (renderTooltip) return <>{renderTooltip(point)}</>;
    const value = point[yKey] as unknown as number;
    return (
      <div className="rounded-md border border-border-subtle bg-surface px-3 py-2 shadow-lg">
        <div className="font-data-mono text-data-mono text-text-primary">
          {formatY(value)}
        </div>
        <div className="font-label-caps text-label-caps text-text-secondary">
          {point.date}
        </div>
      </div>
    );
  }

  return (
    <figure className="rounded-lg border border-border-subtle bg-surface p-2">
      <figcaption className="sr-only">
        {title}. From {formatY(first)} on {data[0].date} to {formatY(last)} on {data[data.length - 1].date}.
        Low {formatY(low)} and high {formatY(high)}.
        {referenceLines?.length
          ? ` ${referenceLines.length} reference level${referenceLines.length === 1 ? "" : "s"}: ${referenceLines.map((line) => line.label ?? formatY(line.y)).join(", ")}.`
          : ""}
      </figcaption>
      <div aria-hidden="true">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-subtle)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="var(--color-text-secondary)"
            fontSize={11}
            tickFormatter={formatXTick}
            minTickGap={xTickGap}
          />
          <YAxis
            stroke="var(--color-text-secondary)"
            fontSize={11}
            domain={["auto", "auto"]}
            tickFormatter={formatY}
            width={70}
          />
          <Tooltip
            content={<DefaultTooltip />}
            cursor={{ stroke: "var(--color-outline-variant)" }}
          />
          <Area
            type="monotone"
            dataKey={yKey as string}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
          {referenceLines?.map((line, idx) => {
            const stroke = REFERENCE_LINE_COLORS[line.kind];
            const highlighted = line.emphasis || line.recentlyCrossed;
            const strokeWidth = highlighted ? 2.5 : 1.5;
            return (
              <ReferenceLine
                key={`${line.kind}-${line.y}-${idx}`}
                y={line.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={highlighted ? 1 : 0.85}
                ifOverflow="extendDomain"
                label={
                  line.label
                    ? {
                        value: line.label,
                        position: "right",
                        fill: stroke,
                        fontSize: 10,
                      }
                    : undefined
                }
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
      </div>
      <details className="mx-2 mb-1 mt-2 border-t border-border-subtle pt-2">
        <summary className="touch-target inline-flex cursor-pointer items-center font-body-compact text-body-compact font-medium text-text-primary">
          View chart data
        </summary>
        <p className="mb-2 text-xs text-text-secondary">
          {data.length > tablePoints.length
            ? `${tablePoints.length} representative points from ${data.length} observations.`
            : `${data.length} observations.`}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-secondary">
                <th scope="col" className="px-2 py-2 font-medium">Date</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {tablePoints.map((point) => (
                <tr key={point.date} className="border-b border-border-subtle last:border-0">
                  <td className="px-2 py-2">{point.date}</td>
                  <td className="px-2 py-2 text-right font-data-mono">
                    {formatY(point[yKey] as unknown as number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {referenceLines?.length ? (
          <div className="mt-3 text-sm">
            <p className="font-medium text-text-primary">Reference levels</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-text-secondary">
              {referenceLines.map((line, index) => (
                <li key={`${line.kind}-${line.y}-${index}`}>
                  {line.label ?? formatY(line.y)} ({line.kind})
                  {line.emphasis ? " — currently in range" : ""}
                  {!line.emphasis && line.recentlyCrossed ? " — crossed recently" : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </details>
    </figure>
  );
}
