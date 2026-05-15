"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityCurve, EquityPoint } from "@/lib/quotes/portfolio-equity";
import { cn } from "@/lib/utils";

const RISK_ON = "#10b981";
const RISK_OFF = "#ef4444";

interface RangeOption {
  label: string;
  /** Bars from end. -1 = YTD, -2 = full. */
  bars: number;
}

const RANGES: RangeOption[] = [
  { label: "1M", bars: 22 },
  { label: "3M", bars: 66 },
  { label: "6M", bars: 132 },
  { label: "YTD", bars: -1 },
  { label: "1Y", bars: 252 },
  { label: "ALL", bars: -2 },
];

interface ViewMode {
  key: "value" | "pnl";
  label: string;
}

const VIEWS: ViewMode[] = [
  { key: "value", label: "Value" },
  { key: "pnl", label: "P&L" },
];

interface PortfolioEquityChartProps {
  curve: EquityCurve;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function fmtDollar(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function sliceForRange(points: EquityPoint[], range: RangeOption): EquityPoint[] {
  if (range.bars === -2) return points;
  if (range.bars === -1) {
    const last = points[points.length - 1];
    if (!last) return points;
    const year = last.date.slice(0, 4);
    const startIdx = points.findIndex((p) => p.date.startsWith(year));
    return startIdx === -1 ? points : points.slice(startIdx);
  }
  return points.slice(-range.bars);
}

interface TooltipPayload {
  payload?: EquityPoint;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function ChartTooltip({
  active,
  payload,
  view,
}: TooltipRenderProps & { view: "value" | "pnl" }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const n = view === "value" ? point.value : point.pnl;
  return (
    <div className="rounded-md border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="font-data-mono text-data-mono text-text-primary">
        {fmtDollar(n)}
      </div>
      <div className="font-label-caps text-label-caps text-text-secondary">
        {point.date}
      </div>
    </div>
  );
}

export function PortfolioEquityChart({
  curve,
  collapsed,
  onToggleCollapsed,
}: PortfolioEquityChartProps) {
  const [rangeIdx, setRangeIdx] = useState(2); // default 6M
  const [view, setView] = useState<"value" | "pnl">("value");

  const range = RANGES[rangeIdx];
  const sliced = useMemo(
    () => sliceForRange(curve.points, range),
    [curve.points, range],
  );

  const startVal = sliced[0]?.value ?? 0;
  const endVal = sliced[sliced.length - 1]?.value ?? 0;
  const rangeDelta = endVal - startVal;
  const rangeColor = rangeDelta >= 0 ? RISK_ON : RISK_OFF;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors font-label-caps text-label-caps uppercase"
      >
        {collapsed ? (
          <ChevronDown className="size-4" aria-hidden="true" />
        ) : (
          <ChevronUp className="size-4" aria-hidden="true" />
        )}
        Equity curve
      </button>
      {!collapsed && (
        <div className="space-y-3">
          {curve.points.length < 2 ? (
            <p className="font-body-compact text-body-compact text-text-secondary">
              Not enough quote history to draw the curve.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-1">
                  {RANGES.map((r, i) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => setRangeIdx(i)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs border transition-colors",
                        i === rangeIdx
                          ? "bg-primary-container text-on-primary-container border-primary-container"
                          : "bg-surface-variant text-text-secondary border-border-subtle hover:text-text-primary",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {VIEWS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setView(v.key)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs border transition-colors",
                        view === v.key
                          ? "bg-primary-container text-on-primary-container border-primary-container"
                          : "bg-surface-variant text-text-secondary border-border-subtle hover:text-text-primary",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={sliced}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={rangeColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={rangeColor} stopOpacity={0} />
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
                    tickFormatter={(value: string) => value.slice(5)}
                    minTickGap={40}
                  />
                  <YAxis
                    stroke="var(--color-text-secondary)"
                    fontSize={11}
                    domain={["auto", "auto"]}
                    tickFormatter={fmtDollar}
                    width={70}
                  />
                  <Tooltip
                    content={<ChartTooltip view={view} />}
                    cursor={{ stroke: "var(--color-outline-variant)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey={view}
                    stroke={rangeColor}
                    strokeWidth={2}
                    fill="url(#equityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              {curve.missing.length > 0 && (
                <p className="text-xs text-text-secondary">
                  {curve.missing.length} position
                  {curve.missing.length === 1 ? "" : "s"} excluded (no quote series):{" "}
                  {curve.missing.join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
