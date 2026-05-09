export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { WatchlistView } from "@/components/watchlist/watchlist-view";

export default function WatchlistPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Watchlist</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Your master list, stored locally on this device. Paste/import lands
            in SPEC-005; report-impact view in SPEC-006.
          </p>
        </header>
        <WatchlistView />
      </div>
    </AppShell>
  );
}
