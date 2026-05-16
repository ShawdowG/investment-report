export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { TickersGrid } from "@/components/tickers/tickers-grid";
import { loadAllQuoteSnapshots } from "@/lib/quotes/snapshots";

export const metadata = {
  title: "Tickers — Investment Report",
};

export default function TickersPage() {
  const snapshots = loadAllQuoteSnapshots();
  const count = Object.keys(snapshots).length;

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Tickers</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            {count} symbol{count === 1 ? "" : "s"} in the quote universe.
            Click one to see its price chart + history.
          </p>
        </header>
        <TickersGrid snapshots={snapshots} />
      </div>
    </AppShell>
  );
}
