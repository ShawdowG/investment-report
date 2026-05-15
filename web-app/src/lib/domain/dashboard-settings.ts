export type TopMoversSource = "universe" | "watchlist";

export interface DashboardSettings {
  indexSymbols: string[];
  topMoversSource: TopMoversSource;
  topMoversLimit: number;
  topMoversExcludeIndices: boolean;
  watchlistHighThresholdPct: number;
  equityChartCollapsed: boolean;
  /**
   * SPEC-023 §6: how close (in %) current price must be to a thesis trade
   * level before it surfaces on the dashboard's CrossedZonesCard. W10 will
   * expose this in the settings panel; for now the storage shape lets W8.E
   * read it with the default.
   */
  thesisProximityPct: number;
  /**
   * SPEC-023: number of days after which a thesis without a quarterly review
   * is considered stale. Surfaced by /research thesis list as a "review me"
   * pill in W8.G/W10.
   */
  thesisStaleAfterDays: number;
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  indexSymbols: ["^GSPC", "^NDX", "BTC-USD", "GC=F"],
  topMoversSource: "universe",
  topMoversLimit: 8,
  topMoversExcludeIndices: true,
  watchlistHighThresholdPct: 3,
  equityChartCollapsed: true,
  thesisProximityPct: 2,
  thesisStaleAfterDays: 90,
};
