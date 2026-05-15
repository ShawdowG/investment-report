import { listQuoteSymbols, loadQuote } from "./load-quote";
import { dayDelta, lastClose, type Delta } from "./quote-utils";

export interface QuoteSnapshot {
  symbol: string;
  lastClose: number;
  dayDelta: Delta | null;
  currency: string;
  name?: string;
  sector?: string;
  asOf: string;
}

export type QuoteSnapshotMap = Record<string, QuoteSnapshot>;

/**
 * Build a compact { symbol -> { lastClose, dayDelta, … } } map from every
 * available quote file. Server-side only (uses fs via loadQuote).
 *
 * Pages call this once at build time and pass the map to client components
 * so the heavy 10y OHLCV arrays don't ship to the browser per row.
 */
export function loadAllQuoteSnapshots(): QuoteSnapshotMap {
  const map: QuoteSnapshotMap = {};
  for (const symbol of listQuoteSymbols()) {
    const series = loadQuote(symbol);
    if (!series) continue;
    const close = lastClose(series.daily);
    if (close === null) continue;
    const last = series.daily[series.daily.length - 1];
    map[symbol] = {
      symbol,
      lastClose: close,
      dayDelta: dayDelta(series.daily),
      currency: series.meta.currency ?? "USD",
      name: series.meta.name,
      sector: series.meta.sector,
      asOf: last.date,
    };
  }
  return map;
}
