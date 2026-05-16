/**
 * Pre-fill defaults for a brand-new thesis. Pulls the current price snapshot,
 * any held position, and the watchlist status so the form starts populated
 * with everything the app already knows. Only called when there is NO
 * existing thesis for the symbol — once one exists, the stored values win.
 */

import type { PlannedAction } from "@/lib/domain/thesis";
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import type { WatchlistItem, WatchlistStatus } from "@/lib/domain/watchlist";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";

export interface ThesisPrefill {
  currentPriceAtCreation?: number;
  avgEntryPrice?: number;
  positionSize?: number;
  plannedAction?: PlannedAction;
}

function plannedActionFor(
  status: WatchlistStatus | undefined,
  hasPosition: boolean,
): PlannedAction | undefined {
  if (!status) return undefined;
  switch (status) {
    case "own":
      return "hold";
    case "watching":
      return "watch";
    case "research":
      return "watch";
    case "avoid":
      return hasPosition ? "sell" : "watch";
    default:
      return undefined;
  }
}

export function buildPrefill(
  symbol: string,
  snapshots: QuoteSnapshotMap,
  portfolio: PortfolioPosition[],
  watchlistItems: WatchlistItem[],
): ThesisPrefill {
  const sym = symbol.trim().toUpperCase();
  const out: ThesisPrefill = {};

  const snap = snapshots[sym];
  if (snap && Number.isFinite(snap.lastClose)) {
    out.currentPriceAtCreation = snap.lastClose;
  }

  const position = portfolio.find((p) => p.symbol === sym);
  if (position) {
    if (Number.isFinite(position.avgPrice)) out.avgEntryPrice = position.avgPrice;
    if (Number.isFinite(position.quantity)) out.positionSize = position.quantity;
  }

  const watch = watchlistItems.find((w) => w.symbol === sym);
  const action = plannedActionFor(watch?.status, Boolean(position));
  if (action) out.plannedAction = action;

  return out;
}
