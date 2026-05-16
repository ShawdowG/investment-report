"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Newspaper } from "lucide-react";
import { RangePills } from "@/components/charts/range-pills";
import { SentimentAreaChart } from "@/components/charts/sentiment-area-chart";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
import type { CompanyInfo } from "@/lib/domain/company";
import { RANGES, sliceForRange } from "@/lib/quotes/chart-ranges";
import type { QuoteBar } from "@/lib/quotes/types";
import {
  fmtDate,
  fmtMoney,
  formatRelativeTime,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const MISSING = "—";

interface StockOverviewProps {
  symbol: string;
  /** Full daily OHLCV series — typically `loadQuote(symbol).daily`. */
  daily: QuoteBar[];
  /** From `QuoteSeries.meta.marketCap`. Used for the formatted "366.4B" row. */
  marketCap?: number;
  /** From `QuoteSeries.meta.currency`. Defaults to USD. */
  currency?: string;
  /** Company info from `data/company/SYMBOL.json` — null when missing. */
  company: CompanyInfo | null;
  /**
   * When true, the news + company-overview sub-sections render expanded on
   * first mount. Used for fresh theses; saved theses default to collapsed.
   * The chart and stats grid are always visible regardless of this flag.
   */
  defaultOpen?: boolean;
}

/**
 * SPEC-030 W14.C — Yahoo-Finance-style overview card mounted at the top of
 * `/research/thesis/[symbol]`.
 *
 * Layout (top to bottom):
 *   1. Header: symbol + name + day Δ %.
 *   2. Range pills (1M / 3M / 6M / YTD / 1Y / 3Y) + sentiment area chart.
 *   3. 15-row stat grid (Previous Close / Open / Day's Range / 52W Range /
 *      Volume / Avg Volume / Market Cap / Beta / P/E TTM / Fwd P/E / EPS TTM /
 *      Earnings Date / Forward Dividend & Yield / Ex-Dividend Date /
 *      1Y Target Est).
 *   4. News headlines (top 5 from `company.news`).
 *   5. Company overview ({name} Overview — {sector} / {industry}) with a
 *      line-clamped description and Show more toggle.
 *
 * Sections 4-5 hide behind `<details>` when `defaultOpen` is false.
 */
export function StockOverview({
  symbol,
  daily,
  marketCap,
  currency = "USD",
  company,
  defaultOpen = false,
}: StockOverviewProps) {
  // Full range set including 5Y and All so the delta in the header reflects
  // long-horizon performance (per user request 2026-05-17).
  const ranges = RANGES;
  const oneYearIdx = ranges.findIndex((r) => r.label === "1Y");
  const [rangeIdx, setRangeIdx] = useState(oneYearIdx >= 0 ? oneYearIdx : 0);
  const range = ranges[rangeIdx];
  const sliced = useMemo(
    () => sliceForRange(daily, range),
    [daily, range],
  );

  const last = daily[daily.length - 1];
  // Range delta moves with the selected time frame — 1Y shows 1-year change,
  // 5Y shows 5-year change, ALL shows whole-series change.
  const rangeStart = sliced.length >= 2 ? sliced[0].close : null;
  const rangeEnd =
    sliced.length >= 2 ? sliced[sliced.length - 1].close : null;
  const rangePct =
    rangeStart !== null && rangeEnd !== null && rangeStart > 0
      ? ((rangeEnd - rangeStart) / rangeStart) * 100
      : null;
  const rangeAbs =
    rangeStart !== null && rangeEnd !== null
      ? rangeEnd - rangeStart
      : null;

  const upper = symbol.toUpperCase();

  const stats = useMemo(() => buildStatRows(daily, marketCap, currency, company), [
    daily,
    marketCap,
    currency,
    company,
  ]);

  const hasNews = !!company?.news && company.news.length > 0;
  const hasOverview = !!company?.description;

  return (
    <Card className="p-card-padding gap-4">
      {/* Chart row */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="font-h2 text-h2 text-text-primary font-data-mono">
              {upper}
            </h2>
            {company?.name ? (
              <span className="font-body-compact text-body-compact text-text-secondary truncate max-w-[16rem]">
                {company.name}
              </span>
            ) : null}
            {last ? (
              <span className="font-data-mono text-data-mono text-text-primary">
                {fmtMoney(last.close, currency)}
              </span>
            ) : null}
            {rangePct !== null && rangeAbs !== null ? (
              <span
                className={cn(
                  "font-data-mono text-data-mono",
                  rangePct > 0
                    ? "text-regime-risk-on"
                    : rangePct < 0
                      ? "text-regime-risk-off"
                      : "text-text-secondary",
                )}
              >
                {`${rangePct > 0 ? "+" : ""}${rangeAbs.toFixed(2)} (${rangePct > 0 ? "+" : ""}${rangePct.toFixed(2)}%)`}
              </span>
            ) : null}
            <span className="font-label-caps text-label-caps uppercase text-text-secondary">
              {range.label === "ALL" ? "all-time" : `${range.label} change`}
            </span>
          </div>
          <RangePills
            ranges={ranges}
            selectedIdx={rangeIdx}
            onSelect={setRangeIdx}
            className="justify-end"
          />
        </div>
        {sliced.length >= 2 ? (
          <SentimentAreaChart
            data={sliced}
            yKey="close"
            formatY={(n) => fmtMoney(n, currency)}
            height={280}
          />
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
            Not enough data for this range.
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="border-t border-border-subtle pt-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {stats.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-2 border-b border-border-subtle/60 py-1"
            >
              <span className="font-body-compact text-body-compact text-text-secondary">
                {row.label}
              </span>
              <span className="font-data-mono text-data-mono text-text-primary text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* News headlines */}
      {hasNews ? (
        <CollapsibleSection
          title="News headlines"
          icon={<Newspaper className="size-4 text-text-secondary" aria-hidden="true" />}
          defaultOpen={defaultOpen}
        >
          <ul className="space-y-1">
            {company!.news.slice(0, 5).map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline justify-between gap-3 rounded-md border border-transparent px-2 py-1 transition-colors hover:border-border-subtle hover:bg-surface-variant"
                >
                  <span className="min-w-0 flex-1 truncate font-body-compact text-body-compact text-text-primary group-hover:underline">
                    {item.title}
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 font-label-caps text-label-caps uppercase text-text-secondary">
                    {item.publisher} · {formatRelativeTime(item.publishedAt)}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {/* Company overview */}
      {hasOverview ? (
        <CompanyOverviewSection
          company={company!}
          symbol={upper}
          defaultOpen={defaultOpen}
        />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stat-row helpers
// ---------------------------------------------------------------------------

interface StatRow {
  label: string;
  value: React.ReactNode;
}

/**
 * SPEC-030 W14.C — compact "366.4B" / "1.2T" formatter for market cap.
 * Falls back to the local-aware integer format under 1B (small caps).
 */
function fmtCompactNumber(n: number, currencySymbol: string = ""): string {
  if (!Number.isFinite(n)) return MISSING;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${currencySymbol}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${currencySymbol}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${currencySymbol}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${currencySymbol}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${currencySymbol}${abs.toLocaleString()}`;
}

/** Plain integer with thousands separators (for Volume). */
function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return MISSING;
  return Math.round(n).toLocaleString();
}

/** Plain percent like "0.48%" — no leading "+" (used for dividend yield). */
function fmtPlainPercent(n: number, decimals: number = 2): string {
  return `${n.toFixed(decimals)}%`;
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

function buildStatRows(
  daily: QuoteBar[],
  marketCap: number | undefined,
  currency: string,
  company: CompanyInfo | null,
): StatRow[] {
  const last = daily[daily.length - 1];
  const prev = daily.length >= 2 ? daily[daily.length - 2] : undefined;
  const last252 = daily.slice(-252);

  const lows = last252
    .map((b) => b.low)
    .filter((v): v is number => typeof v === "number");
  const highs = last252
    .map((b) => b.high)
    .filter((v): v is number => typeof v === "number");
  const vols = last252
    .map((b) => b.volume)
    .filter((v): v is number => typeof v === "number");

  const week52Low = lows.length > 0 ? Math.min(...lows) : null;
  const week52High = highs.length > 0 ? Math.max(...highs) : null;
  const avgVolume = mean(vols);

  const dayLow = last?.low ?? null;
  const dayHigh = last?.high ?? null;

  const m = company?.metrics;
  const a = company?.analyst;
  const c = company?.calendar;

  // Yahoo prints the dividend yield from QuoteSeries.meta as a decimal
  // (0.0048 → 0.48%). If the value is already > 1 it's almost certainly
  // already in percent form; render conservatively in either case.
  const divYieldFromCompany =
    typeof m?.dividendYield === "number" ? m.dividendYield : null;

  function fmtDivYield(raw: number): string {
    // yfinance returns fractional (0.0048). Some sources return 0.48 already.
    // Use a 1.0 threshold: anything below is fractional and gets *100,
    // anything above is already a percent.
    const pct = raw < 1 ? raw * 100 : raw;
    return fmtPlainPercent(pct);
  }

  const rows: StatRow[] = [
    {
      label: "Previous Close",
      value: prev ? fmtMoney(prev.close, currency) : MISSING,
    },
    {
      label: "Open",
      value: typeof last?.open === "number" ? fmtMoney(last.open, currency) : MISSING,
    },
    {
      label: "Day's Range",
      value:
        typeof dayLow === "number" && typeof dayHigh === "number"
          ? `${fmtMoney(dayLow, currency)} – ${fmtMoney(dayHigh, currency)}`
          : MISSING,
    },
    {
      label: "52-Week Range",
      value:
        week52Low !== null && week52High !== null
          ? `${fmtMoney(week52Low, currency)} – ${fmtMoney(week52High, currency)}`
          : MISSING,
    },
    {
      label: "Volume",
      value: typeof last?.volume === "number" ? fmtInt(last.volume) : MISSING,
    },
    {
      label: "Avg Volume",
      value: avgVolume !== null ? fmtInt(avgVolume) : MISSING,
    },
    {
      label: "Market Cap",
      value:
        typeof marketCap === "number"
          ? fmtCompactNumber(marketCap, currency === "USD" ? "$" : "")
          : MISSING,
    },
    {
      label: "Beta (5Y Monthly)",
      value: typeof m?.beta === "number" ? m.beta.toFixed(2) : MISSING,
    },
    {
      label: "P/E (TTM)",
      value: typeof m?.trailingPE === "number" ? m.trailingPE.toFixed(2) : MISSING,
    },
    {
      label: "Forward P/E",
      value: typeof m?.forwardPE === "number" ? m.forwardPE.toFixed(2) : MISSING,
    },
    {
      label: "EPS (TTM)",
      value:
        typeof m?.trailingEps === "number"
          ? fmtMoney(m.trailingEps, currency)
          : MISSING,
    },
    {
      label: "Earnings Date",
      value: c?.earningsDate ? fmtDate(c.earningsDate) : MISSING,
    },
    {
      label: "Forward Dividend & Yield",
      value: divYieldFromCompany !== null ? fmtDivYield(divYieldFromCompany) : MISSING,
    },
    {
      label: "Ex-Dividend Date",
      value: m?.exDividendDate ? fmtDate(m.exDividendDate) : MISSING,
    },
    {
      label: "1Y Target Est",
      value:
        typeof a?.targetMeanPrice === "number"
          ? fmtMoney(a.targetMeanPrice, currency)
          : MISSING,
    },
  ];

  return rows;
}

// ---------------------------------------------------------------------------
// Collapsible section + company overview
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-border-subtle pt-4 space-y-2">
      <SectionHeader
        title={
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-2 text-left transition-colors hover:text-text-primary"
          >
            <ChevronDown
              className={cn(
                "size-4 text-text-secondary transition-transform",
                open ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden="true"
            />
            {icon}
            <span>{title}</span>
          </button>
        }
      />
      {open ? children : null}
    </section>
  );
}

function CompanyOverviewSection({
  company,
  symbol,
  defaultOpen,
}: {
  company: CompanyInfo;
  symbol: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);
  const sectorIndustry = [company.sector, company.industry]
    .filter((s): s is string => !!s)
    .join(" / ");
  // Prefer company.name when the pipeline captured it; fall back to the
  // ticker symbol so the header is still meaningful for fresh tickers
  // where the cron hasn't ingested `longName` yet.
  const displayName = company.name ?? symbol;
  const titleText =
    sectorIndustry.length > 0
      ? `${displayName} Overview — ${sectorIndustry}`
      : `${displayName} Overview`;

  return (
    <section className="border-t border-border-subtle pt-4 space-y-2">
      <SectionHeader
        title={
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-2 text-left transition-colors hover:text-text-primary"
          >
            <ChevronDown
              className={cn(
                "size-4 text-text-secondary transition-transform",
                open ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden="true"
            />
            <span>{titleText}</span>
          </button>
        }
      />
      {open ? (
        <div className="space-y-1">
          <p
            className={cn(
              "font-body-compact text-body-compact text-text-secondary leading-relaxed",
              expanded ? undefined : "line-clamp-3",
            )}
          >
            {company.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-label-caps text-label-caps uppercase text-text-secondary hover:text-text-primary transition-colors"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
