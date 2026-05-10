export const dynamic = "force-static";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TickerHeader } from "@/components/ticker/ticker-header";
import { PersonalNotesWidget } from "@/components/ticker/personal-notes-widget";
import { PriceChart } from "@/components/ticker/price-chart";
import { QuoteSummary } from "@/components/ticker/quote-summary";
import { TickerDispatches } from "@/components/ticker/ticker-dispatches";
import { listQuoteSymbols, loadQuote } from "@/lib/quotes/load-quote";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return listQuoteSymbols().map((symbol) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} — Investment Report` };
}

function suggestSymbols(query: string, limit = 3): string[] {
  if (!query) return [];
  const upper = query.toUpperCase();
  const all = listQuoteSymbols();
  const direct = all.filter((s) => s.startsWith(upper));
  if (direct.length >= limit) return direct.slice(0, limit);
  const substring = all.filter((s) => s.includes(upper) && !direct.includes(s));
  return [...direct, ...substring].slice(0, limit);
}

export default async function TickerDetailPage({ params }: PageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol);
  const upper = symbol.toUpperCase();

  const series = loadQuote(symbol);

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

  const friendlyName = series.meta.name;

  return (
    <AppShell>
      <div className="space-y-6">
        <TickerHeader symbol={upper} name={friendlyName} />
        <QuoteSummary series={series} />
        <PriceChart daily={series.daily} currency={series.meta.currency ?? "USD"} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-gap">
          <section className="lg:col-span-8 space-y-stack-gap">
            <TickerDispatches symbol={upper} />
          </section>
          <aside className="lg:col-span-4">
            <PersonalNotesWidget symbol={upper} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
