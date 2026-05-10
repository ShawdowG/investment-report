import type { PortfolioPosition } from "@/lib/domain/portfolio";
import type { MoverEntry, ReportItem } from "@/types/reports";

export interface PortfolioImpactRow {
  symbol: string;
  quantity: number;
  avgPrice: number;
  pct: number;
  dollarDelta: number;
  level: "high" | "medium";
}

export interface PortfolioImpact {
  rows: PortfolioImpactRow[];
  missing: string[];
  totalDollarDelta: number;
}

export const HIGH_THRESHOLD_PCT = 3;

export function getPortfolioImpact(
  latest: ReportItem | null | undefined,
  positions: PortfolioPosition[],
): PortfolioImpact {
  if (!latest || positions.length === 0) {
    return {
      rows: [],
      missing: positions.map((p) => p.symbol),
      totalDollarDelta: 0,
    };
  }

  const moversByTicker = new Map<string, MoverEntry>();
  for (const mover of latest.movers ?? []) {
    if (!mover.ticker) continue;
    moversByTicker.set(mover.ticker.toUpperCase(), mover);
  }

  const rows: PortfolioImpactRow[] = [];
  const missing: string[] = [];

  for (const position of positions) {
    const mover = moversByTicker.get(position.symbol);
    if (!mover || typeof mover.pct !== "number") {
      missing.push(position.symbol);
      continue;
    }
    const pct = mover.pct;
    const dollarDelta = position.quantity * position.avgPrice * (pct / 100);
    rows.push({
      symbol: position.symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      pct,
      dollarDelta,
      level: Math.abs(pct) >= HIGH_THRESHOLD_PCT ? "high" : "medium",
    });
  }

  rows.sort((a, b) => Math.abs(b.dollarDelta) - Math.abs(a.dollarDelta));

  const totalDollarDelta = rows.reduce((acc, r) => acc + r.dollarDelta, 0);

  return { rows, missing, totalDollarDelta };
}
