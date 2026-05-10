export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { PortfolioView } from "@/components/portfolio/portfolio-view";

export default function PortfolioPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Portfolio</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Manual holdings stored locally on this device. Dashboard surfaces
            estimated dollar impact of today&apos;s report on your positions.
          </p>
        </header>
        <PortfolioView />
      </div>
    </AppShell>
  );
}
