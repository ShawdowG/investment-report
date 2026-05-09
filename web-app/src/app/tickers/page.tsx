export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";

export default function TickersPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="font-h1 text-h1 text-text-primary">Tickers</h1>
        <p className="font-body-compact text-body-compact text-text-secondary">
          Search by symbol and open per-ticker history. Detail page consumes
          <code className="mx-1 px-1.5 py-0.5 rounded bg-surface-variant font-data-mono text-xs">data/by-ticker/SYMBOL.json</code>
          — already generated. Search + detail UI ship in SPEC-007.
        </p>
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          Placeholder — feature under development.
        </div>
      </div>
    </AppShell>
  );
}
