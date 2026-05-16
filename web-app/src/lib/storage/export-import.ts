/**
 * Export / import the entire localStorage-backed dataset as a single JSON file.
 *
 * Each user-facing store has its own STORAGE_KEY inside its module; for export
 * we read those keys raw so we round-trip every field (even ones not yet on
 * the domain type) and avoid coercing/dropping data on the way out.
 *
 * On import we validate the top-level schema marker and then overwrite each
 * store atomically. Per-item validation is intentionally NOT done here — the
 * stores already coerce on read, so a malformed entry will just be dropped
 * the next time it's loaded, not silently saved as junk.
 */

import { readJson, removeKey, writeJson } from "./local-storage";

export const EXPORT_SCHEMA = "investment-report-v1" as const;

// Storage keys — keep in sync with each *-store.ts module.
const KEYS = {
  watchlist: "watchlist_items",
  portfolio: "portfolio_positions",
  notes: "ticker_notes",
  dispatches: "research_dispatches",
  strategies: "strategies",
  dashboardSettings: "dashboard_settings",
} as const;

export interface ExportPayload {
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  data: {
    watchlist: unknown;
    portfolio: unknown;
    notes: unknown;
    dispatches: unknown;
    strategies: unknown;
    dashboardSettings: unknown;
  };
}

export function buildExportPayload(): ExportPayload {
  return {
    schema: EXPORT_SCHEMA,
    exportedAt: new Date().toISOString(),
    data: {
      watchlist: readJson<unknown>(KEYS.watchlist, []),
      portfolio: readJson<unknown>(KEYS.portfolio, []),
      notes: readJson<unknown>(KEYS.notes, {}),
      dispatches: readJson<unknown>(KEYS.dispatches, []),
      strategies: readJson<unknown>(KEYS.strategies, []),
      dashboardSettings: readJson<unknown>(KEYS.dashboardSettings, null),
    },
  };
}

/** Returns YYYY-MM-DD in the user's locale calendar. */
function formatDateStamp(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function exportAllData(): void {
  if (typeof window === "undefined") return;
  const payload = buildExportPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment-report-export-${formatDateStamp(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type ImportValidationResult =
  | { ok: true; payload: ExportPayload }
  | { ok: false; reason: string };

export function parseImportText(raw: string): ImportValidationResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "File is not valid JSON." };
  }
  if (typeof candidate !== "object" || candidate === null) {
    return { ok: false, reason: "Top-level value must be an object." };
  }
  const obj = candidate as Record<string, unknown>;
  if (obj.schema !== EXPORT_SCHEMA) {
    return {
      ok: false,
      reason: `Unrecognized schema marker (expected "${EXPORT_SCHEMA}").`,
    };
  }
  if (typeof obj.data !== "object" || obj.data === null) {
    return { ok: false, reason: "Missing 'data' object." };
  }
  return { ok: true, payload: obj as unknown as ExportPayload };
}

/**
 * Overwrite every store from the payload. Keys whose value is absent are
 * removed so an import truly mirrors the source. Per-store coercion happens
 * on next read; we don't validate item shapes here.
 */
export function applyImport(payload: ExportPayload): void {
  const d = payload.data;
  writeOrRemove(KEYS.watchlist, d.watchlist);
  writeOrRemove(KEYS.portfolio, d.portfolio);
  writeOrRemove(KEYS.notes, d.notes);
  writeOrRemove(KEYS.dispatches, d.dispatches);
  writeOrRemove(KEYS.strategies, d.strategies);
  writeOrRemove(KEYS.dashboardSettings, d.dashboardSettings);
}

function writeOrRemove(key: string, value: unknown): void {
  if (value === undefined || value === null) {
    removeKey(key);
    return;
  }
  writeJson(key, value);
}
