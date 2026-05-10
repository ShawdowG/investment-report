import { listQuoteSymbols, loadQuote } from "./load-quote";
import type { QuoteBar } from "./types";

/**
 * Load every available ticker's full daily series at server / build time.
 * Used by /strategies to feed the backtest engine. Heavy payload (~7 MB JSON
 * for 23 tickers × ~2.5k bars each); should only be invoked on routes that
 * actually need it.
 */
export function loadAllQuoteSeries(): Record<string, QuoteBar[]> {
  const out: Record<string, QuoteBar[]> = {};
  for (const symbol of listQuoteSymbols()) {
    const series = loadQuote(symbol);
    if (series && series.daily.length > 0) out[symbol] = series.daily;
  }
  return out;
}
