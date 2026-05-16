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
  /**
   * SPEC-026 W10.D — user has opted in to browser notifications for crossed
   * thesis levels. The actual delivery only fires when this *and* the
   * browser-level permission below are both granted.
   */
  notificationsEnabled: boolean;
  /**
   * SPEC-026 W10.D — mirrors `Notification.permission === "granted"` at the
   * time the user last toggled the setting. Persisted so the UI can show
   * "Permission denied" help text on revisits without re-requesting on load.
   */
  notificationsPermissionGranted: boolean;
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
  notificationsEnabled: false,
  notificationsPermissionGranted: false,
};
