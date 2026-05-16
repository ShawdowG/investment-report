/**
 * "If all my add levels trigger, where am I?" — answers the question the
 * thesis form asks below the trade plan block. Inputs are the add-level
 * tradeLevels and an optional maxPositionSize. Returns total dollars,
 * total shares, per-level share counts, and a percent-of-max readout so
 * the UI can color-code the result.
 *
 * Sizing convention for W8.A's quick-start form: the user enters a
 * `maxPositionSize` (max dollars) and 1-3 add prices. We model an
 * equal-weight split of `maxPositionSize` across the N add levels — at
 * each price, the per-tranche dollars buy `maxPositionSize / N / price`
 * shares. When no max is set we fall back to 1 share per level so the
 * dollar total is still meaningful. W8.H will introduce explicit
 * per-tranche dollar sizing in the form.
 */

import type { TradeLevel } from "@/lib/domain/thesis";

export interface PositionCalcResult {
  totalDollars: number;
  totalShares: number;
  /** Shares acquired per add level, in input order. */
  shareEquivalent: number[];
  /** Total cost as a percent of `maxPositionSize`, or null if no max provided. */
  pctOfMax: number | null;
  /** True when `totalDollars > maxPositionSize` (and a max is set). */
  exceedsMax: boolean;
}

function hasValidMax(max?: number): max is number {
  return typeof max === "number" && Number.isFinite(max) && max > 0;
}

/**
 * Compute the position you'd hold if every add level triggers exactly once.
 * Assumes the max-position dollars are split equally across N add levels.
 * When no max is set, falls back to 1 share per level so the dollar total
 * is still reportable.
 */
export function calcAllAddsTriggered(
  addLevels: TradeLevel[],
  maxPositionSize?: number,
): PositionCalcResult {
  const adds = addLevels.filter(
    (l) => l.kind === "add" && Number.isFinite(l.price) && l.price > 0,
  );
  if (adds.length === 0) {
    return {
      totalDollars: 0,
      totalShares: 0,
      shareEquivalent: [],
      pctOfMax: hasValidMax(maxPositionSize) ? 0 : null,
      exceedsMax: false,
    };
  }

  let shareEquivalent: number[];
  let totalDollars: number;

  if (hasValidMax(maxPositionSize)) {
    const perTranche = maxPositionSize / adds.length;
    shareEquivalent = adds.map((l) => perTranche / l.price);
    totalDollars = shareEquivalent.reduce((acc, s, i) => acc + s * adds[i].price, 0);
  } else {
    // No max — fall back to 1 share per level so dollar total is still useful.
    shareEquivalent = adds.map(() => 1);
    totalDollars = adds.reduce((acc, l) => acc + l.price, 0);
  }

  const totalShares = shareEquivalent.reduce((acc, s) => acc + s, 0);

  const pctOfMax = hasValidMax(maxPositionSize)
    ? (totalDollars / maxPositionSize) * 100
    : null;
  const exceedsMax = hasValidMax(maxPositionSize)
    ? totalDollars > maxPositionSize
    : false;

  return {
    totalDollars,
    totalShares,
    shareEquivalent,
    pctOfMax,
    exceedsMax,
  };
}
