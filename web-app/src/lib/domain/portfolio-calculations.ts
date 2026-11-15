import type { PortfolioPosition } from "./portfolio";
import type { CompactDailyMap, QuoteSnapshotMap } from "./quote-data";

export interface PortfolioPnLRow {
  symbol: string; quantity: number; avgPrice: number; lastClose: number; currency: string;
  currentValue: number; costBasis: number; totalPnL: number; totalPnLPct: number;
  dayPnL: number | null; dayPnLPct: number | null;
}

export interface CurrencyTotals {
  currency: string; currentValue: number; costBasis: number; totalPnL: number;
  totalPnLPct: number; dayPnL: number; dayPnLPct: number | null;
}

export interface PortfolioPnL {
  rows: PortfolioPnLRow[];
  missing: string[];
  totalCurrentValue: number;
  totalCostBasis: number;
  totalPnL: number;
  totalPnLPct: number;
  totalDayPnL: number;
  totalDayPnLPct: number | null;
  totalsByCurrency: Record<string, CurrencyTotals>;
  hasMixedCurrencies: boolean;
}

const round = (value: number, places = 8): number => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

function summarize(rows: PortfolioPnLRow[], currency: string): CurrencyTotals {
  const currentValue = round(rows.reduce((sum, row) => sum + row.currentValue, 0));
  const costBasis = round(rows.reduce((sum, row) => sum + row.costBasis, 0));
  const totalPnL = round(currentValue - costBasis);
  const dayPnL = round(rows.reduce((sum, row) => sum + (row.dayPnL ?? 0), 0));
  const yesterdayValue = rows.reduce(
    (sum, row) => sum + (row.dayPnL === null ? 0 : row.currentValue - row.dayPnL),
    0,
  );
  return {
    currency,
    currentValue,
    costBasis,
    totalPnL,
    totalPnLPct: costBasis === 0 ? 0 : round((totalPnL / costBasis) * 100),
    dayPnL,
    dayPnLPct: yesterdayValue > 0 ? round((dayPnL / yesterdayValue) * 100) : null,
  };
}

export function getPortfolioPnL(
  positions: PortfolioPosition[],
  snapshots: QuoteSnapshotMap,
): PortfolioPnL {
  const rows: PortfolioPnLRow[] = [];
  const missing: string[] = [];
  for (const position of positions) {
    const snapshot = snapshots[position.symbol];
    if (!snapshot) { missing.push(position.symbol); continue; }
    const currentValue = round(position.quantity * snapshot.lastClose);
    const costBasis = round(position.quantity * position.avgPrice);
    const totalPnL = round(currentValue - costBasis);
    rows.push({
      symbol: position.symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      lastClose: snapshot.lastClose,
      currency: snapshot.currency,
      currentValue,
      costBasis,
      totalPnL,
      totalPnLPct: costBasis === 0 ? 0 : round((totalPnL / costBasis) * 100),
      dayPnL: snapshot.dayDelta ? round(position.quantity * snapshot.dayDelta.abs) : null,
      dayPnLPct: snapshot.dayDelta?.pct ?? null,
    });
  }
  rows.sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL));
  const groups = Map.groupBy(rows, (row) => row.currency);
  const totalsByCurrency = Object.fromEntries(
    [...groups].map(([currency, currencyRows]) => [currency, summarize(currencyRows, currency)]),
  );
  const currencies = Object.keys(totalsByCurrency);
  const aggregate = currencies.length === 1
    ? totalsByCurrency[currencies[0]]
    : { currency: "MULTI", currentValue: 0, costBasis: 0, totalPnL: 0, totalPnLPct: 0, dayPnL: 0, dayPnLPct: null };
  return {
    rows,
    missing,
    totalsByCurrency,
    hasMixedCurrencies: currencies.length > 1,
    totalCurrentValue: aggregate.currentValue,
    totalCostBasis: aggregate.costBasis,
    totalPnL: aggregate.totalPnL,
    totalPnLPct: aggregate.totalPnLPct,
    totalDayPnL: aggregate.dayPnL,
    totalDayPnLPct: aggregate.dayPnLPct,
  };
}

export interface EquityPoint { date: string; value: number; pnl: number }
export interface EquityCurve { points: EquityPoint[]; costBasis: number; missing: string[]; startDate?: string }

export function buildEquityCurve(
  positions: PortfolioPosition[],
  compactDaily: CompactDailyMap,
): EquityCurve {
  const tracks: { position: PortfolioPosition; map: Map<string, number>; firstDate: string }[] = [];
  const missing: string[] = [];
  for (const position of positions) {
    const series = compactDaily[position.symbol];
    if (!series?.length) { missing.push(position.symbol); continue; }
    tracks.push({ position, map: new Map(series.map((bar) => [bar.date, bar.close])), firstDate: series[0].date });
  }
  const costBasis = round(tracks.reduce((sum, track) => sum + track.position.quantity * track.position.avgPrice, 0));
  if (!tracks.length) return { points: [], costBasis: 0, missing };
  const startDate = tracks.reduce((latest, track) => track.firstDate > latest ? track.firstDate : latest, tracks[0].firstDate);
  const dates = [...new Set(tracks.flatMap((track) => [...track.map.keys()].filter((date) => date >= startDate)))].sort();
  const lastClose = new Map<string, number>();
  const points: EquityPoint[] = [];
  for (const date of dates) {
    let value = 0;
    let contributors = 0;
    for (const track of tracks) {
      const close = track.map.get(date) ?? lastClose.get(track.position.symbol);
      const current = track.map.get(date);
      if (current !== undefined) lastClose.set(track.position.symbol, current);
      if (close !== undefined) { value += track.position.quantity * close; contributors += 1; }
    }
    if (contributors === tracks.length) points.push({ date, value: round(value), pnl: round(value - costBasis) });
  }
  return { points, costBasis, missing, startDate };
}
