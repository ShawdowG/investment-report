export const dynamic = "force-static";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { listQuoteSymbols } from "@/lib/quotes/load-quote";

export const metadata = {
  title: "Tickers — Investment Report",
};

export default function TickersPage() {
  const symbols = listQuoteSymbols();

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Tickers</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            {symbols.length} symbol{symbols.length === 1 ? "" : "s"} in the quote universe.
            Click one to see its price chart + history.
          </p>
        </header>
        {symbols.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
            No tickers indexed yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol: string) => (
              <Link
                key={symbol}
                href={`/ticker/${encodeURIComponent(symbol)}`}
                className="inline-flex items-center px-3 py-2 rounded-lg border border-border-subtle bg-surface hover:bg-surface-variant font-data-mono text-data-mono text-text-primary transition-colors"
              >
                {symbol}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
