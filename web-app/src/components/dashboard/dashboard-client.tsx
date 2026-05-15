"use client";

import { useEffect, useState } from "react";
import { IndexPulseRow } from "./index-pulse-row";
import { PortfolioImpactCard } from "./portfolio-impact-card";
import { TopMoversCard } from "./top-movers-card";
import { WatchlistImpactCard } from "./watchlist-impact-card";
import { DEFAULT_DASHBOARD_SETTINGS } from "@/lib/domain/dashboard-settings";
import type { CompactDailyMap } from "@/lib/quotes/compact-daily";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import {
  getDashboardSettings,
  updateDashboardSettings,
} from "@/lib/storage/dashboard-settings-store";
import { getWatchlist } from "@/lib/storage/watchlist-store";

interface DashboardClientProps {
  snapshots: QuoteSnapshotMap;
  compactDaily: CompactDailyMap;
  asOf: string;
}

export function DashboardClient({
  snapshots,
  compactDaily,
  asOf,
}: DashboardClientProps) {
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

  useEffect(() => {
    setSettings(getDashboardSettings());
    setWatchlistSymbols(getWatchlist().map((w) => w.symbol));
  }, []);

  function handleToggleChartCollapsed() {
    setSettings((prev) => {
      const next = updateDashboardSettings({
        equityChartCollapsed: !prev.equityChartCollapsed,
      });
      return next;
    });
  }

  const topMoversExclude = settings.topMoversExcludeIndices
    ? settings.indexSymbols
    : [];
  const useWatchlistForMovers =
    settings.topMoversSource === "watchlist" && watchlistSymbols.length > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-h1 text-h1 text-text-primary">Dashboard</h1>
        <p className="font-body-compact text-body-compact text-text-secondary">
          Daily market snapshot · as of {asOf}
        </p>
      </header>

      <IndexPulseRow snapshots={snapshots} symbols={settings.indexSymbols} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-gap">
        <TopMoversCard
          snapshots={snapshots}
          limit={settings.topMoversLimit}
          exclude={topMoversExclude}
          includeOnly={useWatchlistForMovers ? watchlistSymbols : undefined}
          sourceLabel={useWatchlistForMovers ? "watchlist" : "universe"}
        />
        <WatchlistImpactCard
          snapshots={snapshots}
          highThresholdPct={settings.watchlistHighThresholdPct}
        />
      </div>

      <PortfolioImpactCard
        snapshots={snapshots}
        compactDaily={compactDaily}
        equityChartCollapsed={settings.equityChartCollapsed}
        onToggleEquityChart={handleToggleChartCollapsed}
      />
    </div>
  );
}
