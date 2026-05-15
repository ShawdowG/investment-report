export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { loadCompactDaily } from "@/lib/quotes/compact-daily";
import { loadAllQuoteSnapshots } from "@/lib/quotes/snapshots";

export default function DashboardPage() {
  const snapshots = loadAllQuoteSnapshots();
  const compactDaily = loadCompactDaily();
  const sample = Object.values(snapshots)[0];
  const asOf = sample?.asOf ?? "—";

  return (
    <AppShell>
      <DashboardClient
        snapshots={snapshots}
        compactDaily={compactDaily}
        asOf={asOf}
      />
    </AppShell>
  );
}
