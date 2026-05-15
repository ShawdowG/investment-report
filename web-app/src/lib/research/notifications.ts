/**
 * SPEC-026 W10.D — best-effort browser notifications for newly-crossed
 * thesis zones.
 *
 * Strategy: read each TradeLevel's `lastCrossedAt`. If it's today and we
 * haven't already notified the user about that exact level this session,
 * fire a `new Notification(...)`. If 4+ zones cross at once, batch them
 * into a single "N thesis levels crossed" message so the user doesn't
 * get spammed.
 *
 * Session de-dup: a module-level Set holds keys we've already notified
 * for; cleared on hard refresh. Persisting across tab refreshes is
 * deliberately *not* done — the user might genuinely want a re-prompt
 * after killing the tab on a noisy day.
 *
 * Guards: returns early if notifications are disabled, the OS-level
 * permission isn't granted, or the API isn't available in the current
 * environment (Notification doesn't exist on SSR).
 */

import type { Thesis } from "@/lib/domain/thesis";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { findCrossedZones } from "@/lib/quotes/zones";
import { getDashboardSettings } from "@/lib/storage/dashboard-settings-store";
import { fmtMoney } from "@/lib/utils/format";

const BATCH_THRESHOLD = 3;

const notifiedThisSession = new Set<string>();

function zoneKey(symbol: string, kind: string, price: number): string {
  return `${symbol}|${kind}|${price}`;
}

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) === today;
}

export function maybeNotifyCrossings(
  theses: Thesis[],
  snapshots: QuoteSnapshotMap,
  proximityPct: number,
): void {
  // Environment guard — SSR / older browsers / private mode without the API.
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  // Settings guard — user must have explicitly opted in.
  let settings;
  try {
    settings = getDashboardSettings();
  } catch {
    return;
  }
  if (!settings.notificationsEnabled) return;
  if (!settings.notificationsPermissionGranted) return;

  // Identify levels that crossed today and haven't fired this session.
  const zones = findCrossedZones(theses, snapshots, proximityPct).filter(
    (zone) => {
      if (!isToday(zone.level.lastCrossedAt)) return false;
      const key = zoneKey(zone.symbol, zone.level.kind, zone.level.price);
      return !notifiedThisSession.has(key);
    },
  );
  if (zones.length === 0) return;

  // Stamp first so a failed delivery doesn't loop on every re-render.
  for (const zone of zones) {
    notifiedThisSession.add(
      zoneKey(zone.symbol, zone.level.kind, zone.level.price),
    );
  }

  try {
    if (zones.length > BATCH_THRESHOLD) {
      new Notification(
        `${zones.length} thesis levels crossed`,
        {
          body: "Open the dashboard to review.",
          tag: "thesis-crossings-batch",
        },
      );
      return;
    }
    for (const zone of zones) {
      const snap = snapshots[zone.symbol];
      const currency = snap?.currency ?? "USD";
      const trancheSuffix =
        zone.level.kind !== "sell" && zone.level.level
          ? ` L${zone.level.level}`
          : "";
      const kindLabel =
        zone.level.kind === "add"
          ? "Add"
          : zone.level.kind === "trim"
            ? "Trim"
            : "Sell";
      new Notification(`${zone.symbol} — ${kindLabel}${trancheSuffix} in range`, {
        body: `${fmtMoney(zone.level.price, currency)} target · current ${fmtMoney(
          zone.currentPrice,
          currency,
        )}`,
        tag: `thesis-crossing-${zone.symbol}-${zone.level.price}`,
      });
    }
  } catch (err) {
    console.warn("[notifications] delivery failed", err);
  }
}
