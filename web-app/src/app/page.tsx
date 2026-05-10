export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { IndexPulseRow } from "@/components/dashboard/index-pulse-row";
import { TopMoversCard } from "@/components/dashboard/top-movers-card";
import { WatchlistImpactCard } from "@/components/dashboard/watchlist-impact-card";
import { PortfolioImpactCard } from "@/components/dashboard/portfolio-impact-card";
import { loadAllQuoteSnapshots } from "@/lib/quotes/snapshots";

const INDEX_SYMBOLS = ["^GSPC", "^NDX", "BTC-USD", "GC=F"];

export default function DashboardPage() {
  const snapshots = loadAllQuoteSnapshots();
  const sample = Object.values(snapshots)[0];
  const asOf = sample?.asOf ?? "—";

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Dashboard</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Daily market snapshot · as of {asOf}
          </p>
        </header>

        <IndexPulseRow snapshots={snapshots} symbols={INDEX_SYMBOLS} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-gap">
          <TopMoversCard snapshots={snapshots} />
          <WatchlistImpactCard snapshots={snapshots} />
        </div>

        <PortfolioImpactCard snapshots={snapshots} />
      </div>
    </AppShell>
  );
}
