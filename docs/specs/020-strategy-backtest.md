# [SPEC-020] Strategy Definition + Backtest Engine

## 1. Context
v4 cockpit anchored on daily quote data (SPEC-014). Brief mentions "strategy analysis and backtracking" as a v4 surface alongside research dispatches. With 10y of OHLCV per ticker, we can backtest simple rule-based strategies across a basket and visualise the equity curve.

## 2. Problem
User has no programmatic way to test "if I had run rule X across these tickers from year Y to year Z, what would have happened?" Without that loop, strategy ideas in dispatches stay opinion-only. A simple backtest engine + 4 representative strategy types covers the immediate need.

## 3. Scope

### In scope
- `web-app/src/lib/domain/strategy.ts` — discriminated union typing 4 strategy variants.
- `web-app/src/lib/storage/strategies-store.ts` — CRUD over `localStorage["strategies"]`. Conform to `StrategyRepository`.
- `web-app/src/lib/storage/contracts.ts` extends with `StrategyRepository`.
- `web-app/src/lib/backtest/indicators.ts` — pure `sma`, `rsi` helpers.
- `web-app/src/lib/backtest/engine.ts` — pure `runBacktest(strategy, seriesBySymbol)` returning `BacktestResult` with trades + equity curve + stats.
- `/strategies` route — list / new / view modes via internal state machine (same pattern as /research).
- Components: `StrategyList`, `StrategyForm` (4 variants share base fields + type-specific tail), `StrategyView` (renders backtest result).
- Equity curve via Recharts LineChart inside `BacktestChart`.
- Sidebar adds "Strategies" as 7th item (ChartLine icon). Bottom nav drops Settings cell to keep 6-cell layout — Settings reachable via the desktop sidebar only on mobile.
- Update STATUS.md.

### Out of scope
- Live optimisation / parameter sweep ("which MA periods are best?").
- Walk-forward / out-of-sample validation.
- Risk metrics beyond max drawdown + win rate (no Sharpe, Sortino, Calmar yet).
- Slippage / commission modelling — trades execute at the day's close.
- Short / leverage — long-only.
- Saved-result archive — every view re-runs the backtest from current quote data. (Cheap operation; tens of ms.)
- Strategy comparison view (run multiple side-by-side).
- Cross-ticker rules ("buy NVDA when MSFT crosses…") — each rule applies per-ticker independently.

## 4. Strategy types

All strategies share `name`, `symbols[]`, `initialCapital`, `positionSizing`, optional `startDate`/`endDate`. Long-only, one position per symbol at a time.

### 4.1 Buy & hold
Baseline benchmark. Buy on the first effective bar, hold to end.

### 4.2 MA crossover
Entry: short SMA crosses above long SMA. Exit: opposite. User configures `shortPeriod` (default 50) and `longPeriod` (default 200).

### 4.3 RSI threshold
Entry: RSI < `buyThreshold` (default 30). Exit: RSI > `sellThreshold` (default 70). User configures `period` (default 14).

### 4.4 Price threshold
Entry: close ≤ `buyPrice`. Exit: close ≥ `sellPrice`. **Single-symbol only** — multi-symbol with one absolute price doesn't make sense. Form validates.

## 5. Position sizing

Two modes:
- `equal-weight`: divide `initialCapital` evenly across `symbols.length` to get per-ticker dollar slot.
- `fixed-dollar`: `fixedAmount` per ticker per entry.

On buy: shares = floor(dollarSlot / close). Cash decremented. On sell: full position closed at close.

## 6. Backtest output

```ts
interface Trade { date; symbol; side: "buy"|"sell"; shares; price; value; }
interface EquityPoint { date; equity; }
interface BacktestStats {
  initialEquity; finalEquity;
  totalReturn; totalReturnPct;
  maxDrawdown; maxDrawdownPct;
  numTrades;
  winRate: number | null;       // round-trip basis
}
interface BacktestResult { trades; equityCurve; stats; errors[]; }
```

Win rate = winning round-trips / total round-trips (FIFO match buys to sells per symbol).

## 7. UX

- `/strategies` — list of strategies with name + type + symbol count + last total-return-%.
- New / edit form: type selector (4 buttons or radio) → conditional fields. Symbol picker = multi-chip from `listQuoteSymbols()`. Capital + sizing inputs.
- View: name + params summary + Run button (or auto-run on mount). Equity curve chart (LineChart, dark Stitch palette). Stats grid. Trade table (date / symbol / side / shares / price / value).

## 8. Acceptance criteria
- [ ] AC1: Buy & hold on NVDA + MSFT with $100k initial → final equity matches `(100k * 0.5 / nvda.first) * nvda.last + (100k * 0.5 / msft.first) * msft.last` ± rounding.
- [ ] AC2: MA crossover on NVDA shortPeriod=50 longPeriod=200 generates trades during the 10y window. Win rate is computed.
- [ ] AC3: RSI strategy on AAPL with period=14, buy=30, sell=70 generates trades.
- [ ] AC4: Price threshold validates single-symbol only.
- [ ] AC5: Equity curve renders as LineChart spanning startDate to endDate.
- [ ] AC6: tsc + build pass.
- [ ] AC7: Strategy persists across refresh (localStorage).
- [ ] AC8: STATUS.md SPEC-020 row updated.

## 9. Risks
- **Risiko**: Backtest with 10y × 23 tickers + every-bar indicator computation could be slow.
  **Mitigasjon**: indicators precomputed once per symbol; main loop is O(days × symbols). For 2500 days × 8 symbols ≈ 20k iterations — sub-100ms.
- **Risiko**: Look-ahead bias if signal uses today's close to enter today.
  **Mitigasjon**: Documented assumption — entry/exit at same bar's close. Future spec can add 1-bar-delay execution.
- **Risiko**: Multi-ticker date alignment — different IPO dates, weekend/holiday gaps.
  **Mitigasjon**: engine uses union of all dates, skips per-ticker on missing bars.
