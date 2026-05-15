import { listQuoteSymbols, loadQuote } from "./load-quote";

export interface CompactBar {
  date: string;
  close: number;
}

export type CompactDailyMap = Record<string, CompactBar[]>;

/**
 * Build a `{ symbol -> [{date, close}] }` map for every available quote
 * file, sliced to the last `lookbackBars` daily bars. Server-side only
 * (uses fs via loadQuote). Default lookback ≈ 3 trading years.
 *
 * Used by the dashboard's portfolio equity chart to compute historical
 * portfolio value without shipping full OHLCV arrays to the client.
 */
export function loadCompactDaily(lookbackBars = 756): CompactDailyMap {
  const map: CompactDailyMap = {};
  for (const symbol of listQuoteSymbols()) {
    const series = loadQuote(symbol);
    if (!series || series.daily.length === 0) continue;
    const slice = series.daily.slice(-lookbackBars);
    map[symbol] = slice.map((bar) => ({ date: bar.date, close: bar.close }));
  }
  return map;
}
