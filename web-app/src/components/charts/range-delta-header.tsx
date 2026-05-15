import { cn } from "@/lib/utils";

interface RangeDeltaHeaderProps {
  /** Numeric value at the start of the visible slice. */
  start: number;
  /** Numeric value at the end of the visible slice. */
  end: number;
  /** Range label shown after the delta — e.g. "1Y change". */
  rangeLabel: string;
  /** Formats the absolute delta (e.g. $123.45 or 12.3 USD). */
  formatAbs: (n: number) => string;
  /** Right-aligned slot — typically RangePills or a view toggle. */
  right?: React.ReactNode;
  className?: string;
}

/**
 * Shared header for AreaChart panels: shows the delta from `start` to `end`
 * as "+X.XX% (+$YY) [range label change]" with sentiment color, and an
 * optional right slot for range pills or other controls.
 */
export function RangeDeltaHeader({
  start,
  end,
  rangeLabel,
  formatAbs,
  right,
  className,
}: RangeDeltaHeaderProps) {
  const abs = end - start;
  const isUp = end >= start;
  const pct = start === 0 ? null : ((end - start) / start) * 100;
  const colorClass = isUp ? "text-regime-risk-on" : "text-regime-risk-off";

  return (
    <div
      className={cn("flex flex-wrap items-center justify-between gap-2", className)}
    >
      <div className="flex items-baseline gap-2">
        <span className={cn("font-data-mono text-data-mono", colorClass)}>
          {pct !== null ? `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
        </span>
        <span
          className={cn("font-body-compact text-body-compact", colorClass)}
        >
          {`(${abs > 0 ? "+" : ""}${formatAbs(abs)})`}
        </span>
        <span className="font-label-caps text-label-caps text-text-secondary uppercase">
          {rangeLabel} change
        </span>
      </div>
      {right}
    </div>
  );
}
