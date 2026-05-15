import { ArrowDown, ArrowUp } from "lucide-react";
import type { QuoteSeries } from "@/lib/quotes/types";
import {
  dayDelta,
  deltaSinceBars,
  lastClose,
  rangeHighLow,
  ytdDelta,
  type Delta,
} from "@/lib/quotes/quote-utils";
import { cn } from "@/lib/utils";

interface QuoteSummaryProps {
  series: QuoteSeries;
}

function fmtMoney(n: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function deltaClass(d: Delta | null): string {
  if (!d) return "text-text-secondary";
  if (d.pct > 0) return "text-regime-risk-on";
  if (d.pct < 0) return "text-regime-risk-off";
  return "text-text-secondary";
}

export function QuoteSummary({ series }: QuoteSummaryProps) {
  const { meta, daily } = series;
  const close = lastClose(daily);
  const day = dayDelta(daily);
  const week = deltaSinceBars(daily, 5);
  const month = deltaSinceBars(daily, 22);
  const ytd = ytdDelta(daily);
  const range = rangeHighLow(daily);
  const lastDate = daily.length > 0 ? daily[daily.length - 1].date : "—";
  const currency = meta.currency ?? "USD";

  return (
    <section aria-label="Quote summary" className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="font-data-mono text-[36px] leading-none font-semibold text-text-primary tracking-tight">
            {close !== null ? fmtMoney(close, currency) : "—"}
          </div>
          <div className={cn("flex items-center gap-1 mt-2 font-data-mono text-data-mono", deltaClass(day))}>
            {day ? (
              <>
                {day.pct > 0 ? (
                  <ArrowUp className="size-4" aria-hidden="true" />
                ) : day.pct < 0 ? (
                  <ArrowDown className="size-4" aria-hidden="true" />
                ) : null}
                {fmtMoney(day.abs, currency)} ({fmtPct(day.pct)})
              </>
            ) : (
              "—"
            )}
            <span className="ml-2 font-label-caps text-label-caps text-text-secondary uppercase">
              as of {lastDate}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DeltaCell label="5-day" delta={week} />
          <DeltaCell label="1-month" delta={month} />
          <DeltaCell label="YTD" delta={ytd} />
          <RangeCell label="Range (1y)" range={range} currency={currency} />
        </div>
      </div>
      <MetaRow meta={series.meta} />
    </section>
  );
}

function DeltaCell({ label, delta }: { label: string; delta: Delta | null }) {
  return (
    <div className="space-y-0.5">
      <div className="font-label-caps text-label-caps text-text-secondary uppercase">{label}</div>
      <div className={cn("font-data-mono text-data-mono", deltaClass(delta))}>
        {delta ? fmtPct(delta.pct) : "—"}
      </div>
    </div>
  );
}

function RangeCell({
  label,
  range,
  currency,
}: {
  label: string;
  range: { high: number; low: number } | null;
  currency: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="font-label-caps text-label-caps text-text-secondary uppercase">{label}</div>
      <div className="font-data-mono text-data-mono text-text-primary">
        {range ? `${fmtMoney(range.low, currency)} – ${fmtMoney(range.high, currency)}` : "—"}
      </div>
    </div>
  );
}

function MetaRow({ meta }: { meta: QuoteSeries["meta"] }) {
  const cells: { label: string; value: string }[] = [];
  if (meta.exchange) cells.push({ label: "Exchange", value: meta.exchange });
  if (meta.sector) cells.push({ label: "Sector", value: meta.sector });
  if (meta.industry) cells.push({ label: "Industry", value: meta.industry });
  if (typeof meta.marketCap === "number") {
    cells.push({ label: "Market cap", value: formatLarge(meta.marketCap) });
  }
  if (typeof meta.peRatio === "number") {
    cells.push({ label: "P/E", value: meta.peRatio.toFixed(2) });
  }
  if (typeof meta.dividendYield === "number") {
    cells.push({ label: "Div yield", value: `${(meta.dividendYield * 100).toFixed(2)}%` });
  }
  if (cells.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 border-t border-border-subtle/50">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col">
          <span className="font-label-caps text-label-caps text-text-secondary uppercase">{c.label}</span>
          <span className="font-body-compact text-body-compact text-text-primary">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatLarge(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}
