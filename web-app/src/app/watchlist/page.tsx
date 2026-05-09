export const dynamic = "force-static";

import { Navbar } from "@/components/navbar";
import { WatchlistView } from "@/components/watchlist/watchlist-view";

export default function WatchlistPage() {
  return (
    <>
      <Navbar currentPath="/watchlist" />
      <main className="mx-auto max-w-6xl px-4 py-12 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">
            Your master list, stored locally on this device. Paste/import lands
            in SPEC-005; report-impact view in SPEC-006.
          </p>
        </header>
        <WatchlistView />
      </main>
    </>
  );
}
