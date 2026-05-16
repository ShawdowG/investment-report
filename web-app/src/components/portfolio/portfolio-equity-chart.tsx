"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RangeDeltaHeader } from "@/components/charts/range-delta-header";
import { RangePills } from "@/components/charts/range-pills";
import { SentimentAreaChart } from "@/components/charts/sentiment-area-chart";
import { RANGES, sliceForRange, type RangeOption } from "@/lib/quotes/chart-ranges";

// compact-daily ships ~3y of history, so longer ranges would silently truncate.
// Subset matches the actually-available window. PriceChart still gets full RANGES.
const EQUITY_RANGES: RangeOption[] = RANGES.filter((r) =>
  ["1M", "3M", "6M", "YTD", "1Y", "3Y"].includes(r.label),
);
import type { EquityCurve } from "@/lib/quotes/portfolio-equity";
import { cn } from "@/lib/utils";

type ViewKey = "value" | "pnl";

const VIEWS: { key: ViewKey; label: string }[] = [
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

function fmtDollarSigned(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function PortfolioEquityChart({
  curve,
  collapsed,
  onToggleCollapsed,
}: PortfolioEquityChartProps) {
  const [rangeIdx, setRangeIdx] = useState(2); // default 6M
  const [view, setView] = useState<ViewKey>("value");

  const range = EQUITY_RANGES[rangeIdx];
  const sliced = useMemo(
    () => sliceForRange(curve.points, range),
    [curve.points, range],
  );

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
          {sliced.length < 2 ? (
            <p className="font-body-compact text-body-compact text-text-secondary">
              Not enough quote history for this range.
            </p>
          ) : (
            <>
              <RangeDeltaHeader
                start={sliced[0][view]}
                end={sliced[sliced.length - 1][view]}
                rangeLabel={range.label}
                formatAbs={fmtDollar}
                right={
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {VIEWS.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => setView(v.key)}
                          aria-pressed={view === v.key}
                          className={cn(
                            "px-2.5 py-1 rounded font-label-caps text-label-caps uppercase transition-colors",
                            view === v.key
                              ? "bg-primary-container text-on-primary-container"
                              : "text-text-secondary hover:bg-surface-variant",
                          )}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <RangePills
                      ranges={EQUITY_RANGES}
                      selectedIdx={rangeIdx}
                      onSelect={setRangeIdx}
                    />
                  </div>
                }
              />
              <SentimentAreaChart
                data={sliced}
                yKey={view}
                formatY={fmtDollar}
                renderTooltip={(point) => (
                  <div className="rounded-md border border-border-subtle bg-surface px-3 py-2 shadow-lg">
                    <div className="font-data-mono text-data-mono text-text-primary">
                      {fmtDollar(point.value)}
                    </div>
                    <div className="font-data-mono text-data-mono text-text-secondary text-[12px]">
                      {`P&L ${fmtDollarSigned(point.pnl)}`}
                    </div>
                    <div className="font-label-caps text-label-caps text-text-secondary">
                      {point.date}
                    </div>
                  </div>
                )}
              />
              {curve.startDate &&
                curve.points.length > 0 &&
                curve.startDate !== curve.points[0].date && (
                  <p className="text-xs text-text-secondary">
                    Curve starts {curve.startDate} — earliest date all positions
                    have data
                  </p>
                )}
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
