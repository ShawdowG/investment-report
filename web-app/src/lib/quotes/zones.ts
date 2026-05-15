/**
 * SPEC-023 W8.E — derive "crossed zone" entries: each thesis trade level
 * whose absolute distance to today's snapshot close is within `proximityPct`.
 *
 * Used by the dashboard `CrossedZonesCard` to surface tickers where the
 * current price is near a buy/trim/sell zone the user planned out earlier.
 */

import type { Thesis, TradeLevel } from "@/lib/domain/thesis";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";

export interface CrossedZone {
  symbol: string;
  level: TradeLevel;
  currentPrice: number;
  /**
   * Signed distance from level price as a percent of the level price.
   *   +  → current price sits ABOVE the level
   *   −  → current price sits BELOW the level
   *   0  → exactly on level
   */
  distancePct: number;
}

/**
 * Walk every thesis's `tradeLevels` and emit one `CrossedZone` per level
 * whose `|currentPrice - level.price| / level.price * 100` is `≤ proximityPct`.
 *
 * Results are sorted by absolute distance ascending so the most-crossed
 * (closest to the level) bubbles to the top.
 */
export function findCrossedZones(
  theses: Thesis[],
  snapshots: QuoteSnapshotMap,
  proximityPct: number,
): CrossedZone[] {
  if (!Number.isFinite(proximityPct) || proximityPct < 0) return [];
  const out: CrossedZone[] = [];

  for (const thesis of theses) {
    const snap = snapshots[thesis.symbol];
    if (!snap) continue;
    const currentPrice = snap.lastClose;
    if (!Number.isFinite(currentPrice)) continue;

    for (const level of thesis.tradeLevels) {
      if (!Number.isFinite(level.price) || level.price <= 0) continue;
      const distancePct = ((currentPrice - level.price) / level.price) * 100;
      if (Math.abs(distancePct) <= proximityPct) {
        out.push({
          symbol: thesis.symbol,
          level,
          currentPrice,
          distancePct,
        });
      }
    }
  }

  out.sort((a, b) => Math.abs(a.distancePct) - Math.abs(b.distancePct));
  return out;
}
