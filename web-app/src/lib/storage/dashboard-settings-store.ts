import {
  DEFAULT_DASHBOARD_SETTINGS,
  type DashboardSettings,
  type TopMoversSource,
} from "@/lib/domain/dashboard-settings";
import { readJson, removeKey, writeJson } from "./local-storage";

const STORAGE_KEY = "dashboard_settings";

const VALID_SOURCES: TopMoversSource[] = ["universe", "watchlist"];

function coerce(raw: unknown): DashboardSettings {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_DASHBOARD_SETTINGS;
  }
  const candidate = raw as Partial<DashboardSettings>;
  const indexSymbols = Array.isArray(candidate.indexSymbols)
    ? candidate.indexSymbols
        .filter((s): s is string => typeof s === "string" && s.trim() !== "")
        .map((s) => s.trim())
    : DEFAULT_DASHBOARD_SETTINGS.indexSymbols;
  const source: TopMoversSource =
    typeof candidate.topMoversSource === "string" &&
    (VALID_SOURCES as string[]).includes(candidate.topMoversSource)
      ? (candidate.topMoversSource as TopMoversSource)
      : DEFAULT_DASHBOARD_SETTINGS.topMoversSource;
  const limit =
    typeof candidate.topMoversLimit === "number" &&
    Number.isFinite(candidate.topMoversLimit) &&
    candidate.topMoversLimit > 0
      ? Math.floor(candidate.topMoversLimit)
      : DEFAULT_DASHBOARD_SETTINGS.topMoversLimit;
  const exclude =
    typeof candidate.topMoversExcludeIndices === "boolean"
      ? candidate.topMoversExcludeIndices
      : DEFAULT_DASHBOARD_SETTINGS.topMoversExcludeIndices;
  const threshold =
    typeof candidate.watchlistHighThresholdPct === "number" &&
    Number.isFinite(candidate.watchlistHighThresholdPct) &&
    candidate.watchlistHighThresholdPct >= 0
      ? candidate.watchlistHighThresholdPct
      : DEFAULT_DASHBOARD_SETTINGS.watchlistHighThresholdPct;
  const collapsed =
    typeof candidate.equityChartCollapsed === "boolean"
      ? candidate.equityChartCollapsed
      : DEFAULT_DASHBOARD_SETTINGS.equityChartCollapsed;
  const proximity =
    typeof candidate.thesisProximityPct === "number" &&
    Number.isFinite(candidate.thesisProximityPct) &&
    candidate.thesisProximityPct >= 0
      ? candidate.thesisProximityPct
      : DEFAULT_DASHBOARD_SETTINGS.thesisProximityPct;
  const staleDays =
    typeof candidate.thesisStaleAfterDays === "number" &&
    Number.isFinite(candidate.thesisStaleAfterDays) &&
    candidate.thesisStaleAfterDays > 0
      ? Math.floor(candidate.thesisStaleAfterDays)
      : DEFAULT_DASHBOARD_SETTINGS.thesisStaleAfterDays;
  return {
    indexSymbols,
    topMoversSource: source,
    topMoversLimit: limit,
    topMoversExcludeIndices: exclude,
    watchlistHighThresholdPct: threshold,
    equityChartCollapsed: collapsed,
    thesisProximityPct: proximity,
    thesisStaleAfterDays: staleDays,
  };
}

export function getDashboardSettings(): DashboardSettings {
  return coerce(readJson<unknown>(STORAGE_KEY, DEFAULT_DASHBOARD_SETTINGS));
}

export function updateDashboardSettings(
  patch: Partial<DashboardSettings>,
): DashboardSettings {
  const current = getDashboardSettings();
  const next = coerce({ ...current, ...patch });
  writeJson(STORAGE_KEY, next);
  return next;
}

export function resetDashboardSettings(): DashboardSettings {
  removeKey(STORAGE_KEY);
  return DEFAULT_DASHBOARD_SETTINGS;
}
