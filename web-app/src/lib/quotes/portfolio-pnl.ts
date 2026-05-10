import type { PortfolioPosition } from "@/lib/domain/portfolio";
import type { QuoteSnapshotMap } from "./snapshots";

export interface PortfolioPnLRow {
  symbol: string;
  quantity: number;
  avgPrice: number;
  lastClose: number;
  currency: string;
  currentValue: number;
  costBasis: number;
  totalPnL: number;
  totalPnLPct: number;
  dayPnL: number | null;
  dayPnLPct: number | null;
}

export interface PortfolioPnL {
  rows: PortfolioPnLRow[];
  missing: string[];
  totalCurrentValue: number;
  totalCostBasis: number;
  totalPnL: number;
  totalPnLPct: number;
  totalDayPnL: number;
}

/**
 * Compute real P&L for each position using last-close prices from the
 * quote-snapshot map. Positions whose symbol has no snapshot fall into
 * `missing` and don't contribute to totals.
 */
export function getPortfolioPnL(
  positions: PortfolioPosition[],
  snapshots: QuoteSnapshotMap,
): PortfolioPnL {
  const rows: PortfolioPnLRow[] = [];
  const missing: string[] = [];

  for (const position of positions) {
    const snap = snapshots[position.symbol];
    if (!snap) {
      missing.push(position.symbol);
      continue;
    }
    const currentValue = position.quantity * snap.lastClose;
    const costBasis = position.quantity * position.avgPrice;
    const totalPnL = currentValue - costBasis;
    const totalPnLPct = costBasis === 0 ? 0 : (totalPnL / costBasis) * 100;
    const dayPnL =
      snap.dayDelta !== null ? position.quantity * snap.dayDelta.abs : null;
    const dayPnLPct = snap.dayDelta?.pct ?? null;
    rows.push({
      symbol: position.symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      lastClose: snap.lastClose,
      currency: snap.currency,
      currentValue,
      costBasis,
      totalPnL,
      totalPnLPct,
      dayPnL,
      dayPnLPct,
    });
  }

  rows.sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL));

  const totalCurrentValue = rows.reduce((acc, r) => acc + r.currentValue, 0);
  const totalCostBasis = rows.reduce((acc, r) => acc + r.costBasis, 0);
  const totalPnL = totalCurrentValue - totalCostBasis;
  const totalPnLPct = totalCostBasis === 0 ? 0 : (totalPnL / totalCostBasis) * 100;
  const totalDayPnL = rows.reduce((acc, r) => acc + (r.dayPnL ?? 0), 0);

  return {
    rows,
    missing,
    totalCurrentValue,
    totalCostBasis,
    totalPnL,
    totalPnLPct,
    totalDayPnL,
  };
}
