export const dynamic = 'force-static';

import { loadSearchIndex } from "@/lib/reports";
import { AppShell } from "@/components/layout/app-shell";
import { ReportsFilter } from "@/components/reports-filter";

export const metadata = {
  title: "Reports Archive — Investment Report",
};

export default function ReportsPage() {
  const index = loadSearchIndex();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-h1 text-h1 text-text-primary">Reports Archive</h1>
        <p className="mt-1 font-body-compact text-body-compact text-text-secondary">
          {index.items.length} report{index.items.length !== 1 ? "s" : ""} indexed
        </p>
      </div>
      <ReportsFilter items={index.items} />
    </AppShell>
  );
}
