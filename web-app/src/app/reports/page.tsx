export const dynamic = 'force-static';

import { loadSearchIndex } from "@/lib/reports";
import { Navbar } from "@/components/navbar";
import { ReportsFilter } from "@/components/reports-filter";

export const metadata = {
  title: "Reports Archive — Investment Report",
};

export default function ReportsPage() {
  const index = loadSearchIndex();

  return (
    <>
      <Navbar currentPath="/reports" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Reports Archive</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {index.items.length} report{index.items.length !== 1 ? "s" : ""} indexed
          </p>
        </div>
        <ReportsFilter items={index.items} />
      </main>
    </>
  );
}
