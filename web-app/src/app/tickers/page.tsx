export const dynamic = "force-static";

import { Navbar } from "@/components/navbar";

export default function TickersPage() {
  return (
    <>
      <Navbar currentPath="/tickers" />
      <main className="mx-auto max-w-6xl px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tickers</h1>
        <p className="text-muted-foreground">
          Search by symbol and open per-ticker history. Detail page consumes
          <code className="mx-1 px-1.5 py-0.5 rounded bg-muted font-mono text-xs">data/by-ticker/SYMBOL.json</code>
          — already generated. Search + detail UI ship in SPEC-007.
        </p>
        <div className="rounded-lg border border-border/50 bg-card p-6 text-sm text-muted-foreground">
          Placeholder — feature under development.
        </div>
      </main>
    </>
  );
}
