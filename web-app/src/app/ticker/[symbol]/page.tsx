export const dynamic = "force-static";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TickerHeader } from "@/components/ticker/ticker-header";
import { ReportMentionsTable } from "@/components/ticker/report-mentions-table";
import { PersonalNotesWidget } from "@/components/ticker/personal-notes-widget";
import { LatestIntelligenceCard } from "@/components/ticker/latest-intelligence-card";
import { PriceChart } from "@/components/ticker/price-chart";
import { QuoteSummary } from "@/components/ticker/quote-summary";
import {
  loadByTicker,
  suggestSymbols,
} from "@/lib/reports/load-by-ticker";
import { listQuoteSymbols, loadQuote } from "@/lib/quotes/load-quote";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  // Drive the dynamic-route set from the quote universe (v4 source of truth).
  return listQuoteSymbols().map((symbol) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} — Investment Report` };
}

export default async function TickerDetailPage({ params }: PageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol);
  const upper = symbol.toUpperCase();

  const series = loadQuote(symbol);
  const reportItems = loadByTicker(symbol) ?? [];

  if (!series) {
    const suggestions = suggestSymbols(symbol, 3);
    return (
      <AppShell>
        <div className="space-y-4">
          <h1 className="font-h1 text-h1 text-text-primary">Ticker not found</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            No quote data for{" "}
            <code className="font-data-mono text-text-primary">{symbol}</code>.
          </p>
          {suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="font-body-compact text-body-compact text-text-secondary">
                Did you mean:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Link
                    key={s}
                    href={`/ticker/${encodeURIComponent(s)}`}
                    className="inline-flex items-center px-3 py-1 rounded-lg border border-border-subtle bg-surface-variant font-data-mono text-data-mono text-text-primary hover:bg-surface-bright transition-colors"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <Link
            href="/tickers"
            className="inline-block font-body-compact text-body-compact text-primary hover:text-primary-fixed-dim transition-colors"
          >
            Browse all tickers →
          </Link>
        </div>
      </AppShell>
    );
  }

  const friendlyName =
    series.meta.name ??
    reportItems[0]?.movers?.find((m) => m.ticker?.toUpperCase() === upper)?.name;

  return (
    <AppShell>
      <div className="space-y-6">
        <TickerHeader symbol={upper} name={friendlyName} />
        <QuoteSummary series={series} />
        <PriceChart daily={series.daily} currency={series.meta.currency ?? "USD"} />
        <LatestIntelligenceCard symbol={upper} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-gap">
          <section className="lg:col-span-8 space-y-3">
            <h2 className="font-h2 text-h2 text-text-primary">Report Mentions</h2>
            <p className="font-body-compact text-body-compact text-text-secondary">
              {reportItems.length === 0
                ? "No report mentions for this ticker."
                : `Reverse-chronological history of ${reportItems.length} mention${reportItems.length === 1 ? "" : "s"} across reports.`}
            </p>
            <ReportMentionsTable symbol={upper} items={reportItems} limit={10} />
          </section>
          <aside className="lg:col-span-4">
            <PersonalNotesWidget symbol={upper} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
