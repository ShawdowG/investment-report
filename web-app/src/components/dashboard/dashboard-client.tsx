"use client";

import { useEffect, useMemo, useState } from "react";
import { CrossedZonesCard } from "./crossed-zones-card";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(getDashboardSettings());
    setWatchlistSymbols(getWatchlist().map((w) => w.symbol));
    setMounted(true);
  }, []);

  // Cross-tab sync: settings exported/imported on /settings or edits made in
  // another tab fire `storage` events on this tab. e.key === null means the
  // whole storage was cleared (e.g. the "Clear all" button on /settings).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === "dashboard_settings") {
        setSettings(getDashboardSettings());
      }
      if (e.key === null || e.key === "watchlist_items") {
        setWatchlistSymbols(getWatchlist().map((w) => w.symbol));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Days between asOf and now; null when asOf is unknown. Computed on the
  // client so SSR + client render agree until hydration sets `mounted`.
  const ageDays = useMemo<number | null>(() => {
    if (!mounted || asOf === "—") return null;
    const parsed = new Date(asOf);
    if (Number.isNaN(parsed.getTime())) return null;
    const todayMs = Date.now();
    const diff = Math.floor((todayMs - parsed.getTime()) / 86_400_000);
    return diff;
  }, [mounted, asOf]);

  // Treat >3 calendar days as stale (covers weekends without a calendar lib).
  const isStale = ageDays !== null && ageDays > 3;

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
        <p className="font-body-compact text-body-compact text-text-secondary flex flex-wrap items-center gap-2">
          <span>Daily market snapshot · as of {asOf}</span>
          {ageDays !== null && ageDays > 0 ? (
            <span
              className={
                isStale
                  ? "inline-flex items-center px-2 py-0.5 rounded text-xs bg-regime-neutral/10 text-regime-neutral border border-regime-neutral/20"
                  : "text-xs text-text-secondary"
              }
            >
              {isStale ? `${ageDays} days old — check quote pipeline` : `${ageDays}d ago`}
            </span>
          ) : null}
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

      <CrossedZonesCard
        snapshots={snapshots}
        proximityPct={settings.thesisProximityPct ?? 2}
      />

      <PortfolioImpactCard
        snapshots={snapshots}
        compactDaily={compactDaily}
        equityChartCollapsed={settings.equityChartCollapsed}
        onToggleEquityChart={handleToggleChartCollapsed}
      />
    </div>
  );
}
