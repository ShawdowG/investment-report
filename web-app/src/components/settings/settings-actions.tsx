"use client";

import { useState } from "react";
import { Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
import { clearAllUserData, loadDemoData } from "@/lib/storage/demo-seed";

export function SettingsActions() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "warn">("info");

  function handleLoadDemo() {
    loadDemoData();
    setStatusKind("info");
    setStatus(
      "Demo data loaded. Refresh /watchlist, /portfolio, /research, /ticker/NVDA to see the populated state.",
    );
  }

  function handleClear() {
    const confirmed = window.confirm(
      "Clear watchlist, portfolio, ticker notes, and research dispatches? This cannot be undone.",
    );
    if (!confirmed) return;
    clearAllUserData();
    setStatusKind("warn");
    setStatus("All local user data cleared.");
  }

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Data"
        caption="Seed the four local-storage stores with example content, or wipe them."
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleLoadDemo}>
          <Database className="size-4 mr-1" aria-hidden="true" />
          Load demo data
        </Button>
        <Button type="button" variant="outline" onClick={handleClear}>
          <Trash2 className="size-4 mr-1" aria-hidden="true" />
          Clear all data
        </Button>
      </div>
      {status ? (
        <p
          role="status"
          className={
            statusKind === "warn"
              ? "font-body-compact text-body-compact text-regime-risk-off"
              : "font-body-compact text-body-compact text-text-secondary"
          }
        >
          {status}
        </p>
      ) : null}
      <ul className="list-disc list-inside font-body-compact text-body-compact text-text-secondary space-y-1 marker:text-text-secondary/60">
        <li>Watchlist: 8 symbols across all status / priority levels with tags.</li>
        <li>Portfolio: 5 positions (NVDA / MSFT / AAPL / BTC-USD / TSLA).</li>
        <li>Research: 3 dispatches, one linked to NVDA.</li>
        <li>Notes: 4 ticker notes spread across NVDA / MSFT / AAPL.</li>
      </ul>
    </Card>
  );
}
