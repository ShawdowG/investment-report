# [SPEC-029] Research Helpers (Auto-Fetch Company Info + External Source Links)

## 1. Context
The thesis form expects the user to know a lot before they start filling fields. Today the only auto-prefilled values are:
- Current price (from `QuoteSnapshot`)
- Avg entry price + position size (from portfolio)
- Planned action (from watchlist status)
- A few `QuoteMeta` fields (P/E, market cap, dividend, sector, industry) — but they're not actually rendered anywhere on the thesis page.

Users still juggle Yahoo Finance, SEC EDGAR, ChatGPT, and their own scratch docs to gather facts before they can write a thesis. The app could close that loop by surfacing the company info we already have (or could fetch at build time) directly on the thesis page, and by linking to the external sources the user *will* visit with the URLs pre-filled.

## 2. Problem
- `QuoteMeta` has rich data (`longBusinessSummary`, `peRatio`, `marketCap`, `dividendYield`, `sector`, `industry`, `employees`, etc.) that the yfinance pipeline doesn't capture. Today we only persist a subset.
- News headlines aren't fetched at all.
- The user always opens 5 tabs (Yahoo, SEC EDGAR, ChatGPT, Macrotrends, Google) but has to manually type the ticker into each.
- No single "research starting point" for a symbol — the thesis page is purely an authoring tool.

## 3. Scope

### In scope — two layers

#### Layer A: Build-time company info enrichment

1. **Expand `scripts/fetch-quotes.py`** to also pull from yfinance:
   - `longBusinessSummary` — paragraph-length company description.
   - `industry`, `sector` — already in `QuoteMeta`, confirm they're captured.
   - `fullTimeEmployees`, `country`, `website`, `city`, `state`.
   - `recommendationMean`, `targetMeanPrice` — analyst consensus.
   - `trailingPE`, `forwardPE`, `priceToBook`, `enterpriseToEbitda` — extra valuation metrics.
   - `dividendYield`, `payoutRatio`.
   - `profitMargins`, `operatingMargins`, `returnOnAssets`, `returnOnEquity`.
   - Recent earnings: `earningsDate` (next), `lastFiscalYearEnd`.
   - News: top 5 headlines via `yfinance.Ticker(symbol).news` — `{ title, publisher, link, providerPublishTime }`.

2. **New artifact**: `data/company/SYMBOL.json` — committed alongside `data/quotes/SYMBOL.json`. Shape:

```json
{
  "symbol": "AAPL",
  "generatedAt": "2026-05-16T07:00:00Z",
  "description": "Apple Inc. designs, manufactures, and markets…",
  "industry": "Consumer Electronics",
  "sector": "Technology",
  "country": "United States",
  "website": "https://www.apple.com",
  "employees": 161000,
  "city": "Cupertino",
  "state": "CA",
  "metrics": {
    "trailingPE": 28.5,
    "forwardPE": 26.1,
    "priceToBook": 35.2,
    "enterpriseToEbitda": 21.4,
    "dividendYield": 0.0048,
    "payoutRatio": 0.16,
    "profitMargins": 0.245,
    "operatingMargins": 0.297,
    "returnOnAssets": 0.205,
    "returnOnEquity": 1.402
  },
  "analyst": {
    "recommendationMean": 1.9,
    "targetMeanPrice": 192.5
  },
  "calendar": {
    "earningsDate": "2026-08-01",
    "lastFiscalYearEnd": "2025-09-30"
  },
  "news": [
    {
      "title": "Apple announces…",
      "publisher": "Reuters",
      "url": "https://…",
      "publishedAt": "2026-05-15T14:32:00Z"
    }
  ]
}
```

3. **Loader** (`web-app/src/lib/company/load-company.ts`, new): `loadCompany(symbol): CompanyInfo | null`. Server-side only (uses fs). Returns null when file missing.

4. **CI**: `daily-quotes.yml` workflow runs `fetch-quotes.py` then commits both `data/quotes/*.json` and `data/company/*.json`.

#### Layer B: Helpers panel on the thesis page

A new **"Research helpers"** panel rendered as a collapsible Card on the thesis page (above the deep-dive sections or as a sidebar — TBD by the implementer). Two sub-sections:

##### B.1 Company info card

- **Description** (`longBusinessSummary`) — truncated to ~3 lines with a "Show more" toggle.
- **Stats grid** — Sector, Industry, Country, Employees, Website (linked).
- **Valuation metrics** — small table: P/E (trailing + forward), P/B, EV/EBITDA, Dividend yield, Payout ratio. Each value linked to its definition in the framework reference panel (§6).
- **Profitability** — Profit margin, Operating margin, ROA, ROE.
- **Analyst consensus** — Recommendation mean (with verbal interpretation: "Buy / Hold / Sell"), target mean price (with %-distance to current).
- **Calendar** — Next earnings date with countdown ("in 14 days").

All optional — missing fields collapse to "—" or skip.

##### B.2 External research links

A grid of buttons that open external sources with the ticker prefilled:
- **Yahoo Finance** — `https://finance.yahoo.com/quote/{symbol}`
- **Yahoo Statistics** — `…/quote/{symbol}/key-statistics`
- **SEC EDGAR** — `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik OR ticker}&type=10-K`
- **Macrotrends** — `https://www.macrotrends.net/stocks/charts/{symbol}/{slug-of-company-name}`
- **Seeking Alpha search** — `https://seekingalpha.com/symbol/{symbol}`
- **Google Finance** — `https://www.google.com/finance/quote/{symbol}`
- **Google News for ticker** — `https://www.google.com/search?q={symbol}+stock+news&tbm=nws`
- **Stocktwits** — `https://stocktwits.com/symbol/{symbol}`
- **ChatGPT** — copies the §10 prompt to clipboard + opens `https://chat.openai.com/` in a new tab (uses the existing `buildChatGPTPrompt()` from SPEC-023 W8.G).

##### B.3 Recent news headlines

- Top 5 from `company.news`.
- Each row: title (truncated), publisher, age (`formatRelativeTime(publishedAt)`).
- Click → opens the article URL in a new tab.

### Out of scope
- Live fetching from yfinance (or any API) at runtime — all data is build-time.
- API integration with paid providers (Polygon, Alpha Vantage). Free yfinance only.
- Historical news beyond what `yfinance.news` returns (5–10 most recent).
- Per-symbol fundamentals timelines (5-year financials charts). The metrics layer is point-in-time.
- Sentiment analysis on news headlines.
- Auto-creating thesis notes from news headlines. The user still chooses what to read.
- ChatGPT auto-login or deep-link with a specific conversation prefilled — the chat.openai.com URL doesn't support that. Manual paste only.

## 4. User stories
- As a user starting a new thesis, I want a company description and key stats visible on the page so I don't have to Google the ticker first.
- As a user fact-checking my thesis, I want a single panel of buttons that opens Yahoo, SEC EDGAR, Macrotrends with the right ticker so I save 60 seconds per source.
- As a user using ChatGPT for analysis, I want one button that copies my structured thesis + the framework prompt AND opens chat.openai.com so I just paste.
- As a user reviewing a thesis after earnings, I want the next earnings date visible so I know if I'm reviewing too early.
- As a future Supabase user, I want company info stored as build artifacts (not in localStorage) so they don't bloat my user state.

## 5. Data contracts

```ts
// web-app/src/lib/domain/company.ts (new)

export interface CompanyMetrics {
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  enterpriseToEbitda?: number;
  dividendYield?: number;
  payoutRatio?: number;
  profitMargins?: number;
  operatingMargins?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
}

export interface CompanyAnalyst {
  recommendationMean?: number;       // 1.0 = strong buy, 5.0 = strong sell (yfinance scale)
  targetMeanPrice?: number;
}

export interface CompanyCalendar {
  earningsDate?: string;             // ISO date
  lastFiscalYearEnd?: string;        // ISO date
}

export interface CompanyNewsItem {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;               // ISO date
}

export interface CompanyInfo {
  symbol: string;
  generatedAt: string;
  description?: string;
  industry?: string;
  sector?: string;
  country?: string;
  website?: string;
  employees?: number;
  city?: string;
  state?: string;
  metrics: CompanyMetrics;
  analyst: CompanyAnalyst;
  calendar: CompanyCalendar;
  news: CompanyNewsItem[];
}
```

```ts
// web-app/src/lib/company/load-company.ts (new)

export function loadCompany(symbol: string): CompanyInfo | null;
export function listCompanySymbols(): string[];
```

## 6. UX notes

### Helper-panel placement

Inside the thesis page, the Research helpers panel sits **between the sticky live header and the form sections** in Edit mode, and **above the structured fields** in View mode. Collapsible — closed by default after first save (so the form stays primary), open by default on new thesis (so the user sees the helpers before authoring).

### External link grid

```
[ Yahoo Finance ]  [ Yahoo Stats ]  [ SEC EDGAR 10-K ]
[ Macrotrends ]    [ Seeking α ]    [ Google Finance ]
[ Google News ]    [ Stocktwits ]   [ Open ChatGPT ]
```

8 buttons in a 3-col grid, plus the ChatGPT button highlighted with the existing pulse pattern when the prompt is copied.

### Slug-of-company-name for Macrotrends

Macrotrends URLs need a kebab-case company name (e.g. `/stocks/charts/AAPL/apple/financial-statements`). Derive from `company.description` first sentence's first noun phrase, fallback to symbol-only URL pattern. Keep simple — if the slug guess is wrong, the user notices on the Macrotrends page.

## 7. Functional requirements
- FR1: `scripts/fetch-quotes.py` writes both `data/quotes/SYMBOL.json` and `data/company/SYMBOL.json` per symbol per run.
- FR2: `loadCompany(symbol)` returns `CompanyInfo | null`.
- FR3: Thesis page renders the Research helpers panel above the form/view, collapsible.
- FR4: Company description truncates to 3 lines with "Show more".
- FR5: Stats grid + valuation metrics + profitability + analyst + calendar all render when data is present; missing fields collapse cleanly.
- FR6: 9-button external link grid opens the right URL in a new tab (`target="_blank" rel="noopener"`).
- FR7: ChatGPT button copies the prompt and opens chat.openai.com in a new tab. Uses the existing `buildChatGPTPrompt`.
- FR8: News list shows top 5 headlines with publisher + relative timestamp, links to article.
- FR9: Symbols without a `data/company/SYMBOL.json` (e.g. macro indices `^GSPC`) skip the helpers panel entirely or show a "Company info not available" placeholder.

## 8. Non-functional requirements
- No new runtime JS deps. The Python script may grow.
- yfinance company info call rate-limited; the daily cron is fine.
- `data/company/*.json` files are small (~5 KB each); 23 symbols = ~120 KB total. Negligible bundle impact since they load server-side at build time.

## 9. Acceptance criteria
- [ ] AC1: Running `scripts/fetch-quotes.py` locally produces `data/company/AAPL.json` with all top-level fields populated.
- [ ] AC2: `/research/thesis/AAPL` shows the Research helpers panel above the form.
- [ ] AC3: Clicking "Yahoo Finance" opens `https://finance.yahoo.com/quote/AAPL` in a new tab.
- [ ] AC4: Clicking "Open ChatGPT" copies the §10 prompt to clipboard + opens chat.openai.com. Pulse confirms "Prompt copied".
- [ ] AC5: A symbol with no `data/company/*.json` (e.g. `^GSPC`) gracefully hides or placeholders the helpers panel — no crash.
- [ ] AC6: News list renders 5 items with title + publisher + relative time; click opens article.
- [ ] AC7: `npm run build` passes. No token drift. The helpers panel is responsive on mobile.

## 10. Test plan
- **Python**: run `fetch-quotes.py` against one symbol, inspect the output JSON shape against the contract.
- **Unit (TS)**: `loadCompany(symbol)` returns null for unknown symbol; returns parsed shape for known symbol.
- **Component**: helpers panel renders sections only when fields present; ChatGPT button calls clipboard + opens URL.
- **Manual**: Verify the 9 external links open the correct page for AAPL.

## 11. Rollout plan
- W13.A: Python — expand `fetch-quotes.py` with company info pull + JSON write.
- W13.B: TS domain + loader (`lib/domain/company.ts`, `lib/company/load-company.ts`).
- W13.C: Helpers panel UI (`components/research/research-helpers.tsx`) — company info card + stats + analyst + calendar.
- W13.D: External links grid + ChatGPT button.
- W13.E: News list + relative time formatting.
- W13.F: CI workflow update (commit `data/company/` artifacts).

Phases A + F land first (data must exist before UI). B, C, D, E in parallel after.

## 12. Risks
- **Risiko:** yfinance changes its API or stops returning some fields.
  **Mitigasjon:** Every CompanyInfo field is optional. The loader and UI handle absence gracefully. Document the fields' source in code.
- **Risiko:** News URLs from yfinance can be flaky (publisher links break, redirects).
  **Mitigasjon:** Open in new tab so the user's app session survives a broken link. Show publisher name + title even if the link fails.
- **Risiko:** Macrotrends slug guessing produces wrong URLs.
  **Mitigasjon:** Worst case the user lands on a "company not found" page. Document and let user file a follow-up to refine the slug logic.
- **Risiko:** "Open ChatGPT" sounds like deep integration but is really "open URL + paste manually".
  **Mitigasjon:** Button label is "Copy prompt & open ChatGPT". Pulse confirms copy. Help text on first use.
