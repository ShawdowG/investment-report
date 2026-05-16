"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
import type { CompanyInfo } from "@/lib/domain/company";
import type { Thesis } from "@/lib/domain/thesis";
import { buildChatGPTPrompt } from "@/lib/research/thesis-markdown";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface ResearchHelpersProps {
  /** Company info from `data/company/SYMBOL.json` — null when the file doesn't exist. */
  company: CompanyInfo | null;
  symbol: string;
  /**
   * Existing saved thesis — used by the "Open ChatGPT" button to build the
   * prompt. Null when the user is on a fresh thesis (the button stays
   * disabled until the user saves at least once).
   */
  thesis: Thesis | null;
  /** Live price from snapshot — drives the analyst-target delta. */
  currentPrice?: number;
  /** Currency for `fmtMoney` formatting in analyst target. */
  currency?: string;
  /** Whether the panel renders open on first mount. */
  defaultOpen?: boolean;
}

/**
 * SPEC-029 Layer B — Research helpers panel rendered above the thesis form.
 *
 * Composed of three optional sub-sections:
 *  - Company info (W13.C): renders only when `company !== null`.
 *  - External research links (W13.D): always renders, even without company info.
 *  - Recent news (W13.E): renders only when `company.news` is non-empty.
 *
 * The whole panel is collapsible — open by default for new theses, collapsed
 * for existing ones (controlled by the caller via `defaultOpen`).
 */
export function ResearchHelpers({
  company,
  symbol,
  thesis,
  currentPrice,
  currency = "USD",
  defaultOpen = false,
}: ResearchHelpersProps) {
  const [open, setOpen] = useState(defaultOpen);
  const upper = symbol.toUpperCase();

  return (
    <Card className="p-card-padding gap-3">
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
            Research helpers
          </button>
        }
        caption={
          open
            ? "Company snapshot, external sources, and recent news for your starting point."
            : undefined
        }
      />
      {open ? (
        <div className="space-y-4">
          {company ? (
            <CompanyInfoSection
              company={company}
              currentPrice={currentPrice}
              currency={currency}
            />
          ) : (
            <p className="font-body-compact text-body-compact text-text-secondary">
              Company info not available for this ticker — the quote feed
              doesn&apos;t include <span className="font-data-mono">^GSPC</span>
              -style indices, only equities.
            </p>
          )}
          <ExternalLinksSection symbol={upper} thesis={thesis} />
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Company info sub-section (W13.C)
// ---------------------------------------------------------------------------

interface CompanyInfoSectionProps {
  company: CompanyInfo;
  currentPrice?: number;
  currency: string;
}

function CompanyInfoSection({
  company,
  currentPrice,
  currency,
}: CompanyInfoSectionProps) {
  return (
    <div className="space-y-4">
      {company.description ? <Description text={company.description} /> : null}
      <StatsGrid company={company} />
      <ValuationMetrics company={company} />
      <ProfitabilityMetrics company={company} />
      <AnalystSection
        company={company}
        currentPrice={currentPrice}
        currency={currency}
      />
      <CalendarSection company={company} />
    </div>
  );
}

/**
 * Long company description with a 3-line clamp + "Show more" toggle. The clamp
 * uses Tailwind's built-in `line-clamp-3` (Tailwind v4).
 */
function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="space-y-1">
      <p
        className={cn(
          "font-body-compact text-body-compact text-text-secondary leading-relaxed",
          expanded ? undefined : "line-clamp-3",
        )}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="font-label-caps text-label-caps uppercase text-text-secondary hover:text-text-primary transition-colors"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

interface StatRow {
  label: string;
  value: React.ReactNode;
}

/** Sector / Industry / Country / Employees / Website — 2-col on mobile, 4 on sm+. */
function StatsGrid({ company }: { company: CompanyInfo }) {
  const rows: StatRow[] = [];
  if (company.sector) rows.push({ label: "Sector", value: company.sector });
  if (company.industry)
    rows.push({ label: "Industry", value: company.industry });
  if (company.country)
    rows.push({ label: "Country", value: company.country });
  if (typeof company.employees === "number")
    rows.push({
      label: "Employees",
      value: company.employees.toLocaleString(),
    });
  if (company.website)
    rows.push({
      label: "Website",
      value: (
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-primary hover:underline"
        >
          {prettifyWebsite(company.website)}
        </a>
      ),
    });

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="space-y-0.5">
          <div className="font-label-caps text-label-caps uppercase text-text-secondary">
            {row.label}
          </div>
          <div className="font-body-compact text-body-compact text-text-primary">
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function prettifyWebsite(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface MetricRow {
  label: string;
  value: number | undefined;
  format: (n: number) => string;
}

function MetricsTable({ title, rows }: { title: string; rows: MetricRow[] }) {
  const shown = rows.filter((r) => typeof r.value === "number");
  if (shown.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="font-label-caps text-label-caps uppercase text-text-secondary">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
        {shown.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-2 border-b border-border-subtle py-1"
          >
            <span className="font-label-caps text-label-caps uppercase text-text-secondary">
              {row.label}
            </span>
            <span className="font-data-mono text-data-mono text-text-primary">
              {row.format(row.value as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

function fmtPercent(n: number, decimals: number = 2): string {
  // Helper for fractional → "%" values without the leading `+` from `fmtPct`.
  return `${(n * 100).toFixed(decimals)}%`;
}

function ValuationMetrics({ company }: { company: CompanyInfo }) {
  const m = company.metrics;
  return (
    <MetricsTable
      title="Valuation"
      rows={[
        { label: "P/E (TTM)", value: m.trailingPE, format: fmtRatio },
        { label: "P/E (Fwd)", value: m.forwardPE, format: fmtRatio },
        { label: "P/B", value: m.priceToBook, format: fmtRatio },
        { label: "EV/EBITDA", value: m.enterpriseToEbitda, format: fmtRatio },
        { label: "Div yield", value: m.dividendYield, format: (n) => fmtPercent(n) },
        { label: "Payout", value: m.payoutRatio, format: (n) => fmtPercent(n) },
      ]}
    />
  );
}

function ProfitabilityMetrics({ company }: { company: CompanyInfo }) {
  const m = company.metrics;
  // fmtPct emits a "+" prefix on positive values which reads awkwardly for
  // margin metrics that are almost always positive. Use a plain percent
  // formatter for these rows.
  const fmt = (n: number) => fmtPercent(n);
  return (
    <MetricsTable
      title="Profitability"
      rows={[
        { label: "Profit margin", value: m.profitMargins, format: fmt },
        { label: "Op. margin", value: m.operatingMargins, format: fmt },
        { label: "ROA", value: m.returnOnAssets, format: fmt },
        { label: "ROE", value: m.returnOnEquity, format: fmt },
      ]}
    />
  );
}

function recommendationLabel(mean: number): string {
  if (mean <= 1.5) return "Strong buy";
  if (mean <= 2.5) return "Buy";
  if (mean <= 3.5) return "Hold";
  if (mean <= 4.5) return "Sell";
  return "Strong sell";
}

function recommendationToneClass(mean: number): string {
  if (mean <= 2.5) return "text-regime-risk-on";
  if (mean <= 3.5) return "text-regime-neutral";
  return "text-regime-risk-off";
}

function AnalystSection({
  company,
  currentPrice,
  currency,
}: {
  company: CompanyInfo;
  currentPrice?: number;
  currency: string;
}) {
  const { recommendationMean, targetMeanPrice } = company.analyst;
  if (recommendationMean === undefined && targetMeanPrice === undefined) {
    return null;
  }
  const targetDelta =
    typeof targetMeanPrice === "number" &&
    typeof currentPrice === "number" &&
    currentPrice > 0
      ? ((targetMeanPrice - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="space-y-1">
      <div className="font-label-caps text-label-caps uppercase text-text-secondary">
        Analyst consensus
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-body-compact text-body-compact text-text-primary">
        {typeof recommendationMean === "number" ? (
          <span>
            <span className={recommendationToneClass(recommendationMean)}>
              {recommendationLabel(recommendationMean)}
            </span>
            <span className="ml-1 font-data-mono text-text-secondary">
              ({recommendationMean.toFixed(2)})
            </span>
          </span>
        ) : null}
        {typeof targetMeanPrice === "number" ? (
          <span>
            Target{" "}
            <span className="font-data-mono">
              {fmtMoney(targetMeanPrice, currency)}
            </span>
            {targetDelta !== null ? (
              <span
                className={cn(
                  "ml-1 font-data-mono",
                  targetDelta > 0
                    ? "text-regime-risk-on"
                    : targetDelta < 0
                      ? "text-regime-risk-off"
                      : "text-text-secondary",
                )}
              >
                ({fmtPct(targetDelta, 1)})
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function daysBetween(isoDate: string, now: Date): number {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return NaN;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((then.getTime() - now.getTime()) / msPerDay);
}

function CalendarSection({ company }: { company: CompanyInfo }) {
  const { earningsDate, lastFiscalYearEnd } = company.calendar;
  if (!earningsDate && !lastFiscalYearEnd) return null;
  const now = new Date();

  return (
    <div className="space-y-1">
      <div className="font-label-caps text-label-caps uppercase text-text-secondary">
        Calendar
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-body-compact text-body-compact text-text-primary">
        {earningsDate ? (
          <span>
            Next earnings{" "}
            <span className="font-data-mono">{fmtDate(earningsDate)}</span>
            <EarningsCountdown isoDate={earningsDate} now={now} />
          </span>
        ) : null}
        {lastFiscalYearEnd ? (
          <span className="text-text-secondary">
            FY end{" "}
            <span className="font-data-mono">{fmtDate(lastFiscalYearEnd)}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EarningsCountdown({ isoDate, now }: { isoDate: string; now: Date }) {
  const days = daysBetween(isoDate, now);
  if (!Number.isFinite(days)) return null;
  let text: string;
  if (days > 0) text = `in ${days} day${days === 1 ? "" : "s"}`;
  else if (days < 0)
    text = `${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  else text = "today";
  return <span className="ml-1 text-text-secondary">({text})</span>;
}

// ---------------------------------------------------------------------------
// External research links sub-section (W13.D)
// ---------------------------------------------------------------------------

interface ExternalLinkSpec {
  label: string;
  href: string;
}

function buildExternalLinks(symbol: string): ExternalLinkSpec[] {
  const encoded = encodeURIComponent(`${symbol} stock news`);
  return [
    { label: "Yahoo Finance", href: `https://finance.yahoo.com/quote/${symbol}` },
    {
      label: "Yahoo Stats",
      href: `https://finance.yahoo.com/quote/${symbol}/key-statistics`,
    },
    {
      label: "SEC EDGAR 10-K",
      href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=10-K&dateb=&owner=include&count=40`,
    },
    {
      label: "Macrotrends",
      href: `https://www.macrotrends.net/stocks/charts/${symbol}/research`,
    },
    {
      label: "Seeking Alpha",
      href: `https://seekingalpha.com/symbol/${symbol}`,
    },
    {
      label: "Google Finance",
      href: `https://www.google.com/finance/quote/${symbol}`,
    },
    {
      label: "Google News",
      href: `https://www.google.com/search?q=${encoded}&tbm=nws`,
    },
    { label: "Stocktwits", href: `https://stocktwits.com/symbol/${symbol}` },
  ];
}

function ExternalLinksSection({
  symbol,
  thesis,
}: {
  symbol: string;
  thesis: Thesis | null;
}) {
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Match the existing "Saved" pulse pattern from thesis-form: auto-dismiss
  // the confirmation after a short window so the user sees confirmation but
  // the UI doesn't stay stuck on it.
  useEffect(() => {
    if (copiedAt === null) return;
    const handle = setTimeout(() => setCopiedAt(null), 2500);
    return () => clearTimeout(handle);
  }, [copiedAt]);

  async function handleChatGPT() {
    if (!thesis) return;
    const prompt = buildChatGPTPrompt(thesis);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setCopiedAt(Date.now());
      setCopyError(null);
      window.open("https://chat.openai.com/", "_blank", "noopener,noreferrer");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[research-helpers] copy failed", err);
      }
      setCopyError("Couldn't copy — select the thesis manually.");
    }
  }

  const links = buildExternalLinks(symbol);

  return (
    <div className="space-y-2">
      <div className="font-label-caps text-label-caps uppercase text-text-secondary">
        External research
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {links.map((link) => (
          <Button
            key={link.label}
            asChild
            variant="outline"
            size="sm"
            className="justify-between"
          >
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              <span>{link.label}</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleChatGPT}
          disabled={!thesis}
          aria-label="Copy thesis prompt and open ChatGPT"
          className="justify-between"
          title={
            thesis
              ? "Copy the §10 prompt and open chat.openai.com"
              : "Save your thesis first to enable the ChatGPT prompt"
          }
        >
          <span>Open ChatGPT</span>
          <Sparkles className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      {copiedAt !== null ? (
        <p
          role="status"
          aria-live="polite"
          className="font-label-caps text-label-caps uppercase text-regime-risk-on animate-pulse"
        >
          Prompt copied — paste into ChatGPT
        </p>
      ) : copyError ? (
        <p
          role="alert"
          className="font-body-compact text-body-compact text-regime-risk-off"
        >
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
