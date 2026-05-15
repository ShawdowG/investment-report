import type { PortfolioPosition } from "@/lib/domain/portfolio";
import type { CompactDailyMap } from "./compact-daily";

export interface EquityPoint {
  date: string;
  value: number;
  pnl: number;
}

export interface EquityCurve {
  points: EquityPoint[];
  costBasis: number;
  /** Positions excluded because no quote series was available. */
  missing: string[];
  /** First date emitted — determined by the latest "first bar" across positions. */
  startDate?: string;
}

/**
 * Compute the portfolio's historical equity curve from compact daily data.
 *
 * Aligns on the union of all dates across position symbols, forward-filling
 * each symbol from its last-known close on dates it didn't trade (e.g. BTC
 * fills weekend stock-trading dates implicitly). Holdings are assumed
 * static over the lookback — there's no per-position purchase date yet.
 */
export function buildEquityCurve(
  positions: PortfolioPosition[],
  compactDaily: CompactDailyMap,
): EquityCurve {
  const tracks: {
    position: PortfolioPosition;
    map: Map<string, number>;
    firstDate: string;
  }[] = [];
  const missing: string[] = [];
  for (const position of positions) {
    const series = compactDaily[position.symbol];
    if (!series || series.length === 0) {
      missing.push(position.symbol);
      continue;
    }
    const map = new Map<string, number>();
    for (const bar of series) map.set(bar.date, bar.close);
    tracks.push({ position, map, firstDate: series[0].date });
  }

  const costBasis = tracks.reduce(
    (acc, t) => acc + t.position.quantity * t.position.avgPrice,
    0,
  );

  if (tracks.length === 0) {
    return { points: [], costBasis: 0, missing };
  }

  // Trim start to the latest first-date across all tracks so every emitted
  // point is computed against the full portfolio. Without this the curve
  // jumps up when a newly-listed symbol's history comes online, which makes
  // the range delta % misleading.
  let startDate = tracks[0].firstDate;
  for (const t of tracks) if (t.firstDate > startDate) startDate = t.firstDate;

  const dateSet = new Set<string>();
  for (const t of tracks) {
    for (const date of t.map.keys()) {
      if (date >= startDate) dateSet.add(date);
    }
  }
  const dates = Array.from(dateSet).sort();

  const lastClose = new Map<string, number>();
  const points: EquityPoint[] = [];

  for (const date of dates) {
    let value = 0;
    let contributorCount = 0;
    for (const t of tracks) {
      const close = t.map.get(date);
      if (close !== undefined) {
        lastClose.set(t.position.symbol, close);
        value += t.position.quantity * close;
        contributorCount += 1;
      } else {
        const lc = lastClose.get(t.position.symbol);
        if (lc !== undefined) {
          value += t.position.quantity * lc;
          contributorCount += 1;
        }
      }
    }
    // After the start-date trim every track is guaranteed to have established
    // a last-close, so we only emit a point when all tracks contribute.
    if (contributorCount === tracks.length) {
      points.push({ date, value, pnl: value - costBasis });
    }
  }

  return { points, costBasis, missing, startDate };
}
