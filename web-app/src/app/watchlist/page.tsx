export const dynamic = "force-static";

import { Navbar } from "@/components/navbar";

export default function WatchlistPage() {
  return (
    <>
      <Navbar currentPath="/watchlist" />
      <main className="mx-auto max-w-6xl px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground">
          Your master watchlist. Local CRUD ships in SPEC-004; paste/import
          parser in SPEC-005; report-impact view in SPEC-006.
        </p>
        <div className="rounded-lg border border-border/50 bg-card p-6 text-sm text-muted-foreground">
          Placeholder — feature under development.
        </div>
      </main>
    </>
  );
}
