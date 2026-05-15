export type TopMoversSource = "universe" | "watchlist";

export interface DashboardSettings {
  indexSymbols: string[];
  topMoversSource: TopMoversSource;
  topMoversLimit: number;
  topMoversExcludeIndices: boolean;
  watchlistHighThresholdPct: number;
  equityChartCollapsed: boolean;
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  indexSymbols: ["^GSPC", "^NDX", "BTC-USD", "GC=F"],
  topMoversSource: "universe",
  topMoversLimit: 8,
  topMoversExcludeIndices: true,
  watchlistHighThresholdPct: 3,
  equityChartCollapsed: true,
};
