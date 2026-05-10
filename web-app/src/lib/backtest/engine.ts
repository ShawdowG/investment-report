import type { Strategy } from "@/lib/domain/strategy";
import type { QuoteBar } from "@/lib/quotes/types";
import { rsi, sma } from "./indicators";

export interface Trade {
  date: string;
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  value: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface BacktestStats {
  initialEquity: number;
  finalEquity: number;
  totalReturn: number;
  totalReturnPct: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  numTrades: number;
  winRate: number | null;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: EquityPoint[];
  stats: BacktestStats;
  errors: string[];
}

interface Position {
  shares: number;
  costBasis: number;
}

const emptyStats = (initial: number): BacktestStats => ({
  initialEquity: initial,
  finalEquity: initial,
  totalReturn: 0,
  totalReturnPct: 0,
  maxDrawdown: 0,
  maxDrawdownPct: 0,
  numTrades: 0,
  winRate: null,
});

/**
 * Multi-ticker, long-only backtest. Entry/exit at the bar's close (no
 * intraday slippage modeling). Position per symbol toggles between
 * 0-shares and full-allocation; rules apply per-symbol independently.
 */
export function runBacktest(
  strategy: Strategy,
  seriesBySymbol: Record<string, QuoteBar[]>,
): BacktestResult {
  const errors: string[] = [];
  const validSymbols = strategy.symbols.filter(
    (s) => Array.isArray(seriesBySymbol[s]) && seriesBySymbol[s].length > 0,
  );
  for (const s of strategy.symbols) {
    if (!validSymbols.includes(s)) errors.push(`No quote data for ${s}.`);
  }
  if (validSymbols.length === 0) {
    return {
      trades: [],
      equityCurve: [],
      stats: emptyStats(strategy.initialCapital),
      errors: errors.length > 0 ? errors : ["No quote data for any symbol."],
    };
  }

  // Build per-symbol bar-index lookup so indicator arrays can be aligned.
  const barIndexBySymbol: Record<string, Record<string, number>> = {};
  for (const sym of validSymbols) {
    const map: Record<string, number> = {};
    seriesBySymbol[sym].forEach((bar, i) => {
      map[bar.date] = i;
    });
    barIndexBySymbol[sym] = map;
  }

  // Pre-compute indicators per symbol, keyed by strategy type.
  const indicators: Record<
    string,
    { short?: number[]; long?: number[]; rsi?: number[] }
  > = {};
  for (const sym of validSymbols) {
    const closes = seriesBySymbol[sym].map((b) => b.close);
    indicators[sym] = {};
    if (strategy.type === "ma-crossover") {
      indicators[sym].short = sma(closes, strategy.shortPeriod);
      indicators[sym].long = sma(closes, strategy.longPeriod);
    } else if (strategy.type === "rsi") {
      indicators[sym].rsi = rsi(closes, strategy.period);
    }
  }

  // Sorted union of dates across all valid symbols.
  const dateSet = new Set<string>();
  for (const sym of validSymbols) {
    for (const bar of seriesBySymbol[sym]) dateSet.add(bar.date);
  }
  const dates = [...dateSet].sort();

  const startDate = strategy.startDate ?? dates[0];
  const endDate = strategy.endDate ?? dates[dates.length - 1];
  const effectiveDates = dates.filter((d) => d >= startDate && d <= endDate);
  if (effectiveDates.length === 0) {
    return {
      trades: [],
      equityCurve: [],
      stats: emptyStats(strategy.initialCapital),
      errors: [...errors, "Date window has no overlap with available quotes."],
    };
  }

  // Per-ticker dollar slot.
  const dollarPerTicker =
    strategy.positionSizing.type === "equal-weight"
      ? strategy.initialCapital / validSymbols.length
      : (strategy.positionSizing.fixedAmount ??
        strategy.initialCapital / validSymbols.length);

  const positions: Record<string, Position> = {};
  for (const sym of validSymbols) positions[sym] = { shares: 0, costBasis: 0 };
  let cash = strategy.initialCapital;
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  for (let i = 0; i < effectiveDates.length; i++) {
    const date = effectiveDates[i];

    for (const sym of validSymbols) {
      const barIdx = barIndexBySymbol[sym][date];
      if (barIdx === undefined) continue;
      const bar = seriesBySymbol[sym][barIdx];
      const close = bar.close;
      const pos = positions[sym];

      let signal: "buy" | "sell" | "hold" = "hold";

      switch (strategy.type) {
        case "buy-hold": {
          // Buy on the first effective bar where this symbol has a quote.
          if (pos.shares === 0) signal = "buy";
          break;
        }
        case "ma-crossover": {
          const ind = indicators[sym];
          const s = ind.short?.[barIdx];
          const l = ind.long?.[barIdx];
          const sPrev = ind.short?.[barIdx - 1];
          const lPrev = ind.long?.[barIdx - 1];
          if (
            s !== undefined && !isNaN(s) &&
            l !== undefined && !isNaN(l) &&
            sPrev !== undefined && !isNaN(sPrev) &&
            lPrev !== undefined && !isNaN(lPrev)
          ) {
            const crossUp = s > l && sPrev <= lPrev;
            const crossDown = s < l && sPrev >= lPrev;
            if (crossUp && pos.shares === 0) signal = "buy";
            else if (crossDown && pos.shares > 0) signal = "sell";
          }
          break;
        }
        case "rsi": {
          const r = indicators[sym].rsi?.[barIdx];
          if (r !== undefined && !isNaN(r)) {
            if (r < strategy.buyThreshold && pos.shares === 0) signal = "buy";
            else if (r > strategy.sellThreshold && pos.shares > 0) signal = "sell";
          }
          break;
        }
        case "price-threshold": {
          if (close <= strategy.buyPrice && pos.shares === 0) signal = "buy";
          else if (close >= strategy.sellPrice && pos.shares > 0) signal = "sell";
          break;
        }
      }

      if (signal === "buy" && cash >= close) {
        const shares = Math.floor(dollarPerTicker / close);
        if (shares > 0) {
          const value = shares * close;
          if (cash >= value) {
            cash -= value;
            pos.shares += shares;
            pos.costBasis += value;
            trades.push({ date, symbol: sym, side: "buy", shares, price: close, value });
          }
        }
      } else if (signal === "sell" && pos.shares > 0) {
        const shares = pos.shares;
        const value = shares * close;
        cash += value;
        trades.push({ date, symbol: sym, side: "sell", shares, price: close, value });
        pos.shares = 0;
        pos.costBasis = 0;
      }
    }

    // Mark-to-market equity for the day.
    let positionValue = 0;
    for (const sym of validSymbols) {
      const barIdx = barIndexBySymbol[sym][date];
      if (barIdx === undefined) {
        // No quote today — fall back to most recent prior close (carry value).
        // Simplification: skip; drift in equity for this day is treated as 0.
        continue;
      }
      const close = seriesBySymbol[sym][barIdx].close;
      positionValue += positions[sym].shares * close;
    }
    equityCurve.push({ date, equity: cash + positionValue });
  }

  const initialEquity = strategy.initialCapital;
  const finalEquity =
    equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialEquity;
  const totalReturn = finalEquity - initialEquity;
  const totalReturnPct = initialEquity === 0 ? 0 : (totalReturn / initialEquity) * 100;

  let peak = initialEquity;
  let maxDD = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak - point.equity;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDrawdownPct = peak === 0 ? 0 : (maxDD / peak) * 100;

  // FIFO round-trip win rate.
  const buyQueue: Record<string, { shares: number; price: number }[]> = {};
  for (const sym of validSymbols) buyQueue[sym] = [];
  let wins = 0;
  let totalRoundTrips = 0;
  for (const t of trades) {
    if (t.side === "buy") {
      buyQueue[t.symbol].push({ shares: t.shares, price: t.price });
    } else {
      const matched = buyQueue[t.symbol].shift();
      if (matched) {
        totalRoundTrips++;
        if (t.price > matched.price) wins++;
      }
    }
  }
  const winRate = totalRoundTrips > 0 ? (wins / totalRoundTrips) * 100 : null;

  return {
    trades,
    equityCurve,
    stats: {
      initialEquity,
      finalEquity,
      totalReturn,
      totalReturnPct,
      maxDrawdown: maxDD,
      maxDrawdownPct,
      numTrades: trades.length,
      winRate,
    },
    errors,
  };
}
