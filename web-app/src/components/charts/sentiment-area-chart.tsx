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
  const color = last >= first ? RISK_ON : RISK_OFF;

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
    <div className="rounded-lg border border-border-subtle bg-surface p-2">
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
  );
}
