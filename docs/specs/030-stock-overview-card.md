# [SPEC-030] Stock Overview Card on Thesis Page (Yahoo-style)

## 1. Context
Today the thesis page shows two thin information surfaces:
- **`ThesisLiveHeader`** (sticky) — current price, day Δ, mini sparkline, 52w range.
- **`ResearchHelpers`** (collapsible Card) — company description + valuation metrics + analyst + calendar + 9 external links + news headlines.

The user (per 2026-05-17 feedback) wants a denser, more useful "Stock Overview" panel at the top — matching Yahoo Finance's look — combining a multi-range price chart with a stat grid (Previous Close, Day's Range, 52-Week Range, Volume, P/E, EPS, Earnings Date, etc.) and the news + description content. The existing chart primitives (`SentimentAreaChart`, `RangePills`, `RangeDeltaHeader`) already drive `/ticker` and `/portfolio` charts; reuse them.

## 2. Problem
- The existing `ResearchHelpers` block packs too many roles: company info, stats, news, links. The "look at the price" question forces the user to leave the thesis page and visit `/ticker/[symbol]`.
- The current live header sparkline is decoration — no axes, no range selector, no tooltips.
- Stat grid is small and incomplete vs. Yahoo (no Day's Range, Volume, Avg Volume, EPS, Beta, Ex-Dividend, 1Y Target Est).

## 3. Scope

### In scope
- New component `StockOverview` rendered above the form on `/research/thesis/[symbol]`.
- Multi-range price chart at the top: `1M / 3M / 6M / YTD / 1Y / 3Y` pills, sentiment-colored fill (green when last ≥ first), reuses `SentimentAreaChart` exactly as `PriceChart` does. Default range `1Y`.
- Key-stats grid below the chart with 12+ rows. Use a 2-col-mobile / 4-col-desktop grid like Yahoo. Each row is `{label, value}` data-mono.
- Recent news headlines (top 5) — moved out of `ResearchHelpers` into `StockOverview`.
- Company overview (`longBusinessSummary`) — moved out of `ResearchHelpers`. Collapsible/clamped to 3 lines + "Show more".
- `ResearchHelpers` shrinks to its differentiator: 9 external links + Copy-to-ChatGPT button only.
- Small pipeline addition (W14.B below) for fields not yet captured: `beta`, `trailingEps`, `exDividendDate`.

### Out of scope
- Intraday chart (`1D` / `5D` ranges as in Yahoo). Quote pipeline is daily-close only.
- Bid / Ask (intraday data, not in yfinance daily).
- Advanced charting (technical overlays, drawing tools).
- Watchlist sidebar from Yahoo's UI (we have `/watchlist` for that).
- Key Events / Advanced Chart toggles.

## 4. User stories
- As a user starting a new thesis, I want to see the price chart + key stats *on the thesis page* so I don't have to open `/ticker/[symbol]` in another tab.
- As a user reviewing a thesis after earnings, I want to see "EPS (TTM): 6.42 · Earnings Date: 2026-08-01" inline.
- As a user filling the thesis form, I want recent news visible so I can capture them in concerns/questions without leaving the page.

## 5. Data contracts

```ts
// web-app/src/lib/domain/company.ts — extend CompanyMetrics
export interface CompanyMetrics {
  // … existing fields …
  beta?: number;
  trailingEps?: number;
  exDividendDate?: string;   // ISO date
}
```

Pipeline (`scripts/fetch-quotes.py`) adds `beta`, `trailingEps`, `exDividendDate` from `ticker.info["beta"]`, `["trailingEps"]`, `["exDividendDate"]` (latter is unix → ISO).

```ts
// web-app/src/components/research/stock-overview.tsx (new)
interface StockOverviewProps {
  symbol: string;
  daily: QuoteBar[];                  // full series for the chart
  snapshot: QuoteSnapshot | undefined;
  company: CompanyInfo | null;
  marketCap?: number;                 // from QuoteMeta
  defaultOpen?: boolean;
}
```

The thesis page loads daily series via `loadQuote(symbol)` server-side (already used by `/ticker/[symbol]`) and passes through to `<StockOverview>`. Bundle size: ~756 daily bars per symbol = ~30KB shipped per page; acceptable since each thesis page is its own static route.

## 6. Key-stats grid contents

| Row | Source |
|---|---|
| Previous Close | `daily[-2].close` |
| Open | `daily[-1].open` |
| Day's Range | `daily[-1].low – daily[-1].high` |
| 52-Week Range | `rangeHighLow(daily.slice(-252))` |
| Volume | `daily[-1].volume` |
| Avg Volume | mean of `daily.slice(-252).volume` |
| Market Cap | `meta.marketCap` |
| Beta (5Y Monthly) | `company.metrics.beta` |
| P/E (TTM) | `company.metrics.trailingPE` |
| Forward P/E | `company.metrics.forwardPE` |
| EPS (TTM) | `company.metrics.trailingEps` |
| Earnings Date | `company.calendar.earningsDate` |
| Forward Dividend & Yield | `company.metrics.dividendYield` formatted as "—" or "X.XX (Y.YY%)" |
| Ex-Dividend Date | `company.metrics.exDividendDate` |
| 1Y Target Est | `company.analyst.targetMeanPrice` |

Missing values render as `—`.

## 7. Acceptance criteria
- [ ] AC1: `/research/thesis/AAPL` renders the Stock Overview card above the form with chart + stats grid + news + description.
- [ ] AC2: Range pills change the chart slice without page reload.
- [ ] AC3: Stat grid renders 15 rows on a stocked symbol. Macro indices (`^GSPC`) render the rows they have and `—` for the rest.
- [ ] AC4: News headlines render top 5 from `company.news`. Each row links to the article in a new tab.
- [ ] AC5: Description truncates to 3 lines with "Show more" toggle.
- [ ] AC6: `ResearchHelpers` is reduced to external links + ChatGPT button (no duplicated description/stats/news).
- [ ] AC7: `scripts/fetch-quotes.py` writes `beta`, `trailingEps`, `exDividendDate` into `data/company/SYMBOL.json`.
- [ ] AC8: `npm run build` passes, 55 static pages, no token drift.

## 8. Rollout plan
- W14.A: Pipeline — add 3 new yfinance fields to `fetch-quotes.py`. Tiny Python change.
- W14.B: Extend `CompanyMetrics` TS type for the new fields.
- W14.C: Build `<StockOverview>` component with chart + stats grid.
- W14.D: Mount on `/research/thesis/[symbol]` and shrink `<ResearchHelpers>`.

Phases A + B first (data shape). Then C + D in parallel against the new shape.

## 9. Risks
- **Risiko:** Bundle bloat from shipping per-symbol daily series.
  **Mitigasjon:** `loadQuote` returns the data the existing `/ticker/[symbol]` page already ships. No new payload.
- **Risiko:** yfinance changes the field names for `beta`/`trailingEps`/`exDividendDate`.
  **Mitigasjon:** Every field is optional in `CompanyMetrics`. UI renders `—` on absence.
- **Risiko:** "Show more" UX for description doesn't match the rest of the dashboard's Stitch style.
  **Mitigasjon:** Use the same `<button>` + `text-text-primary hover:underline` pattern as the watchlist tags editor.
