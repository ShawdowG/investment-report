export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { ResearchView } from "@/components/research/research-view";
import { ResearchHelp } from "@/components/research/research-help";
import { loadAllQuoteSnapshots } from "@/lib/quotes/snapshots";

export const metadata = {
  title: "Research — Investment Report",
};

export default function ResearchPage() {
  const snapshots = loadAllQuoteSnapshots();
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Research</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Your dispatches — market views, strategy notes, post-mortems. Stored
            locally on this device.
          </p>
        </header>
        <ResearchView snapshots={snapshots} />
        <ResearchHelp />
      </div>
    </AppShell>
  );
}
