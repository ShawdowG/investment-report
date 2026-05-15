export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { loadCompactDaily } from "@/lib/quotes/compact-daily";
import { loadAllQuoteSnapshots } from "@/lib/quotes/snapshots";

export default function DashboardPage() {
  const snapshots = loadAllQuoteSnapshots();
  const compactDaily = loadCompactDaily();
  // Most recent bar across the universe — treating one ticker's asOf as the
  // dashboard's "as of" was misleading when symbols pull at different times.
  let asOf = "—";
  for (const snap of Object.values(snapshots)) {
    if (snap.asOf && snap.asOf > asOf) asOf = snap.asOf;
  }

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
