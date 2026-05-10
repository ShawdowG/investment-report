export const dynamic = "force-static";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TickerHeader } from "@/components/ticker/ticker-header";
import { ReportMentionsTable } from "@/components/ticker/report-mentions-table";
import { PersonalNotesWidget } from "@/components/ticker/personal-notes-widget";
import { LatestIntelligenceCard } from "@/components/ticker/latest-intelligence-card";
import {
  listAvailableTickers,
  loadByTicker,
  suggestSymbols,
} from "@/lib/reports/load-by-ticker";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return listAvailableTickers().map((symbol) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} — Investment Report` };
}

export default async function TickerDetailPage({ params }: PageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol);
  const items = loadByTicker(symbol);

  if (items === null) {
    const suggestions = suggestSymbols(symbol, 3);
    return (
      <AppShell>
        <div className="space-y-4">
          <h1 className="font-h1 text-h1 text-text-primary">Ticker not found</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            No report data for{" "}
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

  if (items.length === 0) notFound();

  const upper = symbol.toUpperCase();
  const latestMention = items[0];
  const friendlyName =
    latestMention.movers?.find((m) => m.ticker?.toUpperCase() === upper)?.name;

  return (
    <AppShell>
      <div className="space-y-6">
        <TickerHeader symbol={upper} name={friendlyName} />
        <LatestIntelligenceCard symbol={upper} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-gap">
          <section className="lg:col-span-8 space-y-3">
            <h2 className="font-h2 text-h2 text-text-primary">Report Mentions</h2>
            <p className="font-body-compact text-body-compact text-text-secondary">
              Reverse-chronological history of {items.length} mention
              {items.length === 1 ? "" : "s"} across reports.
            </p>
            <ReportMentionsTable symbol={upper} items={items} limit={10} />
          </section>
          <aside className="lg:col-span-4">
            <PersonalNotesWidget symbol={upper} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
