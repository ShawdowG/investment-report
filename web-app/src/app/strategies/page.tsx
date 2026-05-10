export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { StrategiesView } from "@/components/strategies/strategies-view";
import { listQuoteSymbols } from "@/lib/quotes/load-quote";
import { loadAllQuoteSeries } from "@/lib/quotes/load-all-series";

export const metadata = {
  title: "Strategies — Investment Report",
};

export default function StrategiesPage() {
  const available = listQuoteSymbols();
  const seriesBySymbol = loadAllQuoteSeries();

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Strategies</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Define rule-based strategies and backtest them across the {available.length}-ticker
            quote universe. All compute happens locally — no positions are placed.
          </p>
        </header>
        <StrategiesView available={available} seriesBySymbol={seriesBySymbol} />
      </div>
    </AppShell>
  );
}
