export const dynamic = "force-static";

import { Navbar } from "@/components/navbar";

export default function PortfolioPage() {
  return (
    <>
      <Navbar currentPath="/portfolio" />
      <main className="mx-auto max-w-6xl px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">
          Manual holdings: ticker, quantity, avg buy price, platform. Local
          store ships in SPEC-008. Latest-report impact card surfaces on the
          dashboard once SPEC-008 lands.
        </p>
        <div className="rounded-lg border border-border/50 bg-card p-6 text-sm text-muted-foreground">
          Placeholder — feature under development.
        </div>
      </main>
    </>
  );
}
