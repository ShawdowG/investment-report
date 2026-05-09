import type { MoverEntry, ReportItem } from "@/types/reports";

export interface ImpactRow {
  symbol: string;
  pct: number;
  name?: string;
  level: "high" | "medium";
}

export interface WatchlistImpact {
  high: ImpactRow[];
  medium: ImpactRow[];
  missing: string[];
}

export const HIGH_THRESHOLD_PCT = 3;

export function getWatchlistImpact(
  latest: ReportItem | null | undefined,
  watchlistSymbols: string[],
): WatchlistImpact {
  if (!latest || watchlistSymbols.length === 0) {
    return { high: [], medium: [], missing: [...watchlistSymbols] };
  }

  const moversByTicker = new Map<string, MoverEntry>();
  for (const mover of latest.movers ?? []) {
    if (!mover.ticker) continue;
    moversByTicker.set(mover.ticker.toUpperCase(), mover);
  }

  const high: ImpactRow[] = [];
  const medium: ImpactRow[] = [];
  const missing: string[] = [];

  for (const raw of watchlistSymbols) {
    const symbol = raw.toUpperCase();
    const mover = moversByTicker.get(symbol);
    if (!mover || typeof mover.pct !== "number") {
      missing.push(symbol);
      continue;
    }
    const row: ImpactRow = {
      symbol,
      pct: mover.pct,
      name: mover.name,
      level: Math.abs(mover.pct) >= HIGH_THRESHOLD_PCT ? "high" : "medium",
    };
    if (row.level === "high") {
      high.push(row);
    } else {
      medium.push(row);
    }
  }

  high.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  medium.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  return { high, medium, missing };
}
