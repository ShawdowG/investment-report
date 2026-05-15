/**
 * SPEC-026 W10.A — write `lastCrossedAt = today` on every TradeLevel that is
 * currently within `proximityPct` of today's close.
 *
 * Called from the dashboard's CrossedZonesCard after it computes crossed
 * zones. Only writes a thesis back when at least one level actually changes
 * (compare-then-write) so we never thrash localStorage. Wrapped in try/catch
 * so a single thesis's bad state can't crash the dashboard render.
 */

import type { Thesis } from "@/lib/domain/thesis";
import { findCrossedZones } from "@/lib/quotes/zones";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { upsertThesis } from "@/lib/storage/thesis-store";
import { fmtDate } from "@/lib/utils/format";

/**
 * Walk every crossed zone in the supplied theses + snapshots, stamping
 * `lastCrossedAt = today` on the matching TradeLevel. Returns the number of
 * level updates persisted.
 */
export function stampCrossedLevels(
  theses: Thesis[],
  snapshots: QuoteSnapshotMap,
  proximityPct: number,
): number {
  const zones = findCrossedZones(theses, snapshots, proximityPct);
  if (zones.length === 0) return 0;
  const today = fmtDate(new Date().toISOString());

  // Group hits by symbol so we make at most one upsert per thesis.
  const hitsBySymbol = new Map<string, Set<string>>();
  for (const zone of zones) {
    const key = `${zone.level.kind}|${zone.level.price}|${zone.level.level ?? ""}`;
    const existing = hitsBySymbol.get(zone.symbol);
    if (existing) {
      existing.add(key);
    } else {
      hitsBySymbol.set(zone.symbol, new Set([key]));
    }
  }

  let updated = 0;
  for (const thesis of theses) {
    const hits = hitsBySymbol.get(thesis.symbol);
    if (!hits) continue;
    let changed = false;
    const nextLevels = thesis.tradeLevels.map((lvl) => {
      const key = `${lvl.kind}|${lvl.price}|${lvl.level ?? ""}`;
      if (!hits.has(key)) return lvl;
      if (lvl.lastCrossedAt === today) return lvl;
      changed = true;
      return { ...lvl, lastCrossedAt: today };
    });
    if (!changed) continue;
    try {
      upsertThesis({ ...thesis, tradeLevels: nextLevels });
      updated += 1;
    } catch (err) {
      console.warn(`[zone-tracker] failed to stamp ${thesis.symbol}`, err);
    }
  }
  return updated;
}
