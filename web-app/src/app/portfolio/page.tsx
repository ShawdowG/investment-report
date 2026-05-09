export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";

export default function PortfolioPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="font-h1 text-h1 text-text-primary">Portfolio</h1>
        <p className="font-body-compact text-body-compact text-text-secondary">
          Manual holdings: ticker, quantity, avg buy price, platform. Local
          store ships in SPEC-008. Latest-report impact card surfaces on the
          dashboard once SPEC-008 lands.
        </p>
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          Placeholder — feature under development.
        </div>
      </div>
    </AppShell>
  );
}
