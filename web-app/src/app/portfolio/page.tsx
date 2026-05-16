export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { loadAllQuoteSnapshots } from "@/lib/quotes/snapshots";
import { loadCompactDaily } from "@/lib/quotes/compact-daily";

export default function PortfolioPage() {
  const snapshots = loadAllQuoteSnapshots();
  const compactDaily = loadCompactDaily();
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Portfolio</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Manual holdings stored locally on this device. Real P&amp;L is
            computed against the last close from the daily quote feed.
          </p>
        </header>
        <PortfolioView snapshots={snapshots} compactDaily={compactDaily} />
      </div>
    </AppShell>
  );
}
