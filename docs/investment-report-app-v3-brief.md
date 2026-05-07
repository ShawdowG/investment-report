# Investment Report App v3 — Product & Technical Brief

## 1. Vision

Build **Investment Report App v3** as a personal investment cockpit.

The app should not try to become another Yahoo Finance, Google Finance, or Nordnet clone. Instead, it should become the user’s central place for:

- Following selected stocks, ETFs, crypto, commodities, and indices
- Reading generated market reports
- Understanding what changed since the last report
- Seeing how the market affects the user’s own watchlist
- Separating “things I follow” from “things I own”
- Collecting notes, insights, and signals over time
- Preparing for optional future integrations with platforms like Yahoo Finance, Google Finance, Nordnet, and Supabase

The current application is already useful because it generates static investment reports through GitHub Actions. Version 3 should keep the strengths of that architecture while improving usability, personal relevance, and extensibility.

---

## 2. Core Problem We Are Solving

The user currently follows investments across multiple places:

- Yahoo Finance
- Google Finance
- Nordnet
- The existing Investment Report App
- Personal notes / manual lists

This creates several problems:

### 2.1 Fragmented watchlists

The same stock may exist in several platforms, but there is no single source of truth.

Example:

```text
NVDA exists in Yahoo Finance
NVDA exists in Google Finance
NVDA may be owned in Nordnet
NVDA is mentioned in generated reports
But the app does not know that all of these refer to the same instrument
```

### 2.2 Reports are not personal enough

The current reports are useful, but they are general market reports.

The user should quickly see:

```text
What happened today?
Which of my tickers are affected?
Which of my owned positions are affected?
What changed since the previous report?
Which tickers need attention?
```

### 2.3 Too much manual checking

The user currently needs to open different platforms to answer simple questions:

```text
What moved today?
Was one of my watched stocks mentioned?
Was there a relevant news catalyst?
Did the market regime change?
Should I be more cautious today?
```

### 2.4 No clean path from watchlist to portfolio

There should be a distinction between:

```text
Watchlist = things I follow
Portfolio = things I own
```

The app should support both without forcing full broker integration in the first version.

---

## 3. Product Goal for v3

Version 3 should introduce a clearer product identity:

> A clean, professional, personal market cockpit powered by generated reports and a user-controlled master watchlist.

The app should help the user answer these questions:

- What is the current market regime?
- What are the top movers today?
- Which of my followed tickers are affected?
- Which of my owned positions are affected?
- What changed compared to the previous report?
- Which tickers need attention?
- What relevant news may explain the move?
- What did I think about this ticker previously?
- What should I monitor next?

---

## 4. Design Direction

Use Stitch to design the visual UI, but Codex should implement the app with a clean, professional, responsive style.

### 4.1 Theme

Direction:

```text
Simple
Professional
Calm
Fast
Investment cockpit
Dashboard-first
Mobile-friendly
```

Avoid:

```text
Too much financial noise
Too many colors
Overly complex trading-terminal UI
Cluttered tables
Unclear chart-heavy layouts
```

### 4.2 Visual style

Suggested style:

- Dark mode first, but support light mode later
- Clean card-based layout
- Soft borders
- Clear hierarchy
- Compact but readable tables
- Dashboard summary cards
- Badges for regime, risk level, ticker status, and signal strength
- Responsive layout for mobile and desktop

### 4.3 UI inspiration

The app should feel like a mix of:

- A lightweight Bloomberg-style personal dashboard
- A clean SaaS analytics product
- A personal investment journal
- A modern finance watchlist app

### 4.4 Main navigation

Suggested top-level navigation:

```text
Dashboard
Reports
Watchlist
Portfolio
Tickers
Settings
```

For v3, not every section needs to be complete, but the structure should exist.

---

## 5. Architecture Principles

### 5.1 Keep static-first architecture

The current architecture is good:

```text
GitHub Actions
→ generate reports
→ build static JSON/index files
→ deploy static site to Cloudflare Pages
```

Keep this as the core.

Static-first gives:

- Fast loading
- Cheap hosting
- Simple deployment
- Fewer runtime errors
- No database dependency for reading reports
- Good compatibility with Cloudflare Pages

### 5.2 Add user data gradually

Do not move reports into a database immediately.

Use this principle:

```text
Reports and generated market data = static files
User-specific data = localStorage first, Supabase later
```

### 5.3 v3 should work without login

The first version of v3 should work without authentication.

Use localStorage for:

- User watchlists
- Favorite tickers
- Basic portfolio draft
- UI preferences
- Saved filters

Later, Supabase can be added for:

- Login
- Sync across devices
- Alerts
- Notes
- Saved reports
- Portfolio data

### 5.4 Platform integrations should be adapters

Do not build the app tightly around Yahoo Finance, Google Finance, or Nordnet.

Use an adapter-based mindset:

```text
Internal app model
→ Yahoo symbol mapping
→ Google symbol mapping
→ Nordnet symbol/id mapping
→ Manual import mapping
```

The app should own the master watchlist.

---

## 6. Current System Summary

The current application appears to work roughly like this:

```text
GitHub Actions schedule
→ Python report generator
→ Yahoo/yfinance market data
→ optional news/catalyst search
→ markdown reports
→ build-index script
→ static JSON and HTML
→ Cloudflare Pages deploy
```

Database does not appear to be required for the current report flow.

Supabase should not be required for v3 unless we add user accounts, syncing, alerts, or persistent user data across devices.

---

## 7. v3 Functional Scope

### 7.1 Dashboard

The dashboard should become the main landing page.

It should show:

```text
Latest report
Market regime
Main driver
Recommended posture
Top winners
Top losers
Watchlist impact
Owned holdings impact
Latest-vs-previous change summary
```

Example dashboard cards:

```text
Market Regime
Mild risk-off

Main Driver
Tech weakness + defensive rotation

Posture
Cautious. Avoid chasing high beta.

Watchlist Impact
5 of your watched tickers moved more than 2%

Top Movers
NVDA +3.1%
TSLA -4.2%
BTC-USD +1.8%
```

### 7.2 Master Watchlist

The app should support one or more user-defined watchlists.

User should be able to:

- Add ticker manually
- Paste many tickers at once
- Import from copied text
- Remove duplicates
- Assign tags
- Assign priority
- Mark ticker status
- Separate watched vs owned

Example statuses:

```text
Watching
Own
Maybe buy
Avoid
High conviction
Research needed
```

Example tags:

```text
AI
Banking
Dividend
Crypto
Nordic
US Tech
Defense
High beta
Long-term
Short-term
```

### 7.3 Paste/import ticker engine

This is an important v3 feature.

The user should be able to paste messy input like:

```text
NVDA, MSFT, AAPL
Tesla TSLA
Novo Nordisk NOVO-B.CO
BTC-USD
DNB.OL
EQNR.OL
```

The app should parse and normalize it into:

```text
NVDA
MSFT
AAPL
TSLA
NOVO-B.CO
BTC-USD
DNB.OL
EQNR.OL
```

The parser should:

- Accept commas, spaces, tabs, and new lines
- Remove duplicates
- Normalize casing
- Keep valid suffixes like `.OL`, `.CO`, `.ST`
- Support crypto symbols like `BTC-USD`
- Support index/commodity symbols like `^GSPC`, `GC=F`
- Allow unknown symbols but flag them as “unverified”

### 7.4 Watchlist impact

The app should compare the latest report against the user’s watchlist.

Example output:

```text
Your watchlist today

High attention:
- TSLA -4.2% and mentioned as a top loser
- NVDA +3.1% and leading tech strength

Medium attention:
- MSFT mentioned but move is small
- BTC-USD moved +1.2%

No report data:
- DNB.OL not mentioned in latest report
```

### 7.5 Portfolio mode

The app should distinguish between watched and owned tickers.

For v3, start simple:

- Manual holdings only
- Store locally first
- No broker connection required
- No trading from the app

Fields:

```text
Ticker
Quantity
Average buy price
Currency
Platform
Account type
Notes
```

Example platform values:

```text
Nordnet
Yahoo Finance
Google Finance
Manual
Other
```

Portfolio dashboard should show:

```text
Owned positions affected today
Owned tickers mentioned in latest report
Owned tickers with large moves
Owned tickers missing from watchlist
```

### 7.6 Ticker detail page

Each ticker should have a detail page.

Path:

```text
/ticker/[symbol]
```

It should show:

- Latest move
- Latest report mention
- All historical report mentions
- User notes
- Tags
- Watchlist status
- Owned status
- Related news/catalyst if available

Example:

```text
NVDA

Status: Own / High priority
Tags: AI, Semiconductor, High beta

Latest report:
NVDA +3.1%, mentioned as top tech leader

Historical mentions:
2026-05-07 EU report
2026-05-06 US open report
2026-05-05 Pre-close report

User notes:
"Watch for pullback before adding."
```

### 7.7 Reports page

Improve the reports page.

It should support:

- Date filter
- Slot filter
- Regime filter
- Ticker filter
- Search
- Sort newest first
- Report cards instead of plain links

Report card example:

```text
EU Morning — 2026-05-07
Regime: Mild risk-off
Main driver: Tech weakness
Posture: Cautious
Tickers: NVDA, TSLA, MSFT, BTC-USD
Open report
```

### 7.8 Latest-vs-previous comparison

The app should compare the latest report with the previous report.

Show:

```text
Regime changed from neutral to mild risk-off
Breadth dropped from 58% to 34%
NVDA moved from neutral to leader
TSLA became top loser
Gold strengthened while equities weakened
```

This should be generated from existing report JSON if possible.

### 7.9 News/catalyst section

News should be shown as supporting context, not as the core product.

The app can use Yahoo/yfinance/DDG/other sources through a news abstraction.

Important:

- News fetching should not break report generation
- If no good news is found, show “No clear catalyst found”
- Prefer quality over quantity
- Avoid generic headlines
- Score news relevance

News card example:

```text
TSLA
Move: -4.2%
Possible catalyst:
"Tesla shares fall after..."
Confidence: Medium
Source: Yahoo Finance
```

### 7.10 Notes and journal

User should be able to add notes per ticker.

For v3 local-first:

- Store notes in localStorage
- Attach note to ticker
- Optional date
- Optional report reference

Later with Supabase:

- Sync notes across devices
- Add full investment journal

---

## 8. Data Model

### 8.1 Instrument

```ts
export type AssetType =
  | "stock"
  | "etf"
  | "crypto"
  | "index"
  | "commodity"
  | "fund"
  | "other";

export type Instrument = {
  id: string;
  symbol: string;
  displaySymbol: string;
  name?: string;
  assetType: AssetType;
  currency?: string;
  exchange?: string;
  country?: string;
  sector?: string;

  sourceSymbols?: {
    yahoo?: string;
    google?: string;
    nordnet?: string;
  };

  createdAt: string;
  updatedAt: string;
};
```

### 8.2 Watchlist

```ts
export type Watchlist = {
  id: string;
  name: string;
  description?: string;
  source?: "manual" | "yahoo" | "google" | "nordnet" | "imported";
  createdAt: string;
  updatedAt: string;
};
```

### 8.3 Watchlist item

```ts
export type WatchlistItem = {
  id: string;
  watchlistId: string;
  instrumentId: string;
  symbol: string;

  status:
    | "watching"
    | "own"
    | "maybe_buy"
    | "avoid"
    | "research_needed";

  priority: "low" | "medium" | "high";
  tags: string[];
  notes?: string;

  createdAt: string;
  updatedAt: string;
};
```

### 8.4 Portfolio holding

```ts
export type PortfolioHolding = {
  id: string;
  instrumentId: string;
  symbol: string;

  quantity?: number;
  averageBuyPrice?: number;
  currency?: string;
  platform?: "nordnet" | "manual" | "other";
  accountName?: string;

  notes?: string;

  createdAt: string;
  updatedAt: string;
};
```

### 8.5 Report summary

```ts
export type ReportSummary = {
  date: string;
  slot: "eu" | "us-open" | "pre-close";
  title: string;
  regime?: string;
  summary?: string;
  mainDriver?: string;
  posture?: string;
  tickers: string[];
  htmlFile?: string;
  markdownFile?: string;
};
```

### 8.6 Ticker report mention

```ts
export type TickerReportMention = {
  symbol: string;
  date: string;
  slot: string;
  reportTitle: string;
  reportUrl: string;
  movePct?: number;
  moveAbs?: number;
  role?: "leader" | "laggard" | "mentioned" | "watchlist_impact";
  summary?: string;
};
```

---

## 9. Storage Strategy

### 9.1 v3 local-first

Use localStorage for:

```text
watchlists
watchlist_items
portfolio_holdings
notes
ui_preferences
```

Pros:

- No login required
- Fast to build
- No Supabase dependency
- Good for MVP validation

Cons:

- No cross-device sync
- Data can be lost if browser storage is cleared

### 9.2 Later Supabase migration

Add Supabase only when needed for:

```text
User login
Device sync
Alerts
Saved reports
Shared watchlists
Portfolio history
Investment journal
```

Supabase tables later:

```sql
profiles
instruments
watchlists
watchlist_items
portfolio_holdings
manual_trades
notes
alerts
user_preferences
```

All user-owned tables must have Row Level Security enabled.

---

## 10. Performance Requirements

### 10.1 Keep the app fast

The app should avoid loading huge JSON files on first page load.

Generate smaller index files:

```text
data/latest.json
data/reports-lite.json
data/by-date/YYYY-MM-DD.json
data/by-ticker/SYMBOL.json
```

### 10.2 Dashboard data loading

Dashboard should load:

```text
data/latest.json
localStorage watchlist
localStorage holdings
```

Only load larger data when needed.

### 10.3 Reports page loading

Reports page should load:

```text
data/reports-lite.json
```

Full report content should only load when opening a report.

### 10.4 Ticker page loading

Ticker page should load:

```text
data/by-ticker/SYMBOL.json
```

### 10.5 Empty and loading states

Every page should have:

- Loading state
- Empty state
- Error state
- Helpful fallback text

No blank screens.

---

## 11. Proposed Folder Structure

Suggested frontend structure:

```text
web-app/src/
  app/
    page.tsx
    reports/
      page.tsx
    watchlist/
      page.tsx
    portfolio/
      page.tsx
    ticker/
      [symbol]/
        page.tsx
    settings/
      page.tsx

  components/
    dashboard/
    reports/
    watchlist/
    portfolio/
    ticker/
    layout/
    ui/

  lib/
    domain/
      instrument.ts
      watchlist.ts
      portfolio.ts
      report.ts
    storage/
      local-storage.ts
      watchlist-store.ts
      portfolio-store.ts
    reports/
      load-reports.ts
      compare-reports.ts
      ticker-impact.ts
    parsing/
      parse-tickers.ts
      normalize-symbol.ts
```

If the app is currently not using this exact structure, Codex should adapt the structure to the existing app while keeping the separation of concerns.

---

## 12. Ticker Parsing Requirements

Create a ticker parser that can handle messy input.

### 12.1 Input examples

```text
NVDA, MSFT, AAPL
TSLA
Novo Nordisk NOVO-B.CO
DNB.OL EQNR.OL
BTC-USD
GC=F
^GSPC
```

### 12.2 Output

```ts
[
  { symbol: "NVDA", verified: false },
  { symbol: "MSFT", verified: false },
  { symbol: "AAPL", verified: false },
  { symbol: "TSLA", verified: false },
  { symbol: "NOVO-B.CO", verified: false },
  { symbol: "DNB.OL", verified: false },
  { symbol: "EQNR.OL", verified: false },
  { symbol: "BTC-USD", verified: false },
  { symbol: "GC=F", verified: false },
  { symbol: "^GSPC", verified: false }
]
```

### 12.3 Parser rules

The parser should:

- Split by comma, whitespace, tabs, semicolon, and newlines
- Preserve symbols with:
  - `-`
  - `.`
  - `=`
  - `^`
- Uppercase symbols
- Remove obvious company-name words when paired with ticker-like symbols
- Remove duplicates
- Return invalid/unknown tokens separately if needed

---

## 13. Codex Implementation Roadmap

### Epic 1 — Product shell and navigation

#### Task 1.1 — Create v3 navigation structure

Create or update the app navigation with:

```text
Dashboard
Reports
Watchlist
Portfolio
Tickers
Settings
```

Acceptance criteria:

- Navigation is visible on desktop
- Navigation is usable on mobile
- Current page is highlighted
- Placeholder pages exist where features are not complete

---

### Epic 2 — Static report data improvements

#### Task 2.1 — Generate lightweight report index files

Update the report build process to generate:

```text
data/latest.json
data/reports-lite.json
data/by-date/YYYY-MM-DD.json
data/by-ticker/SYMBOL.json
```

Acceptance criteria:

- Existing report generation still works
- Dashboard can read `latest.json`
- Reports page can read `reports-lite.json`
- Ticker page can read `by-ticker/SYMBOL.json`
- Existing static site deploy still works

#### Task 2.2 — Add latest-vs-previous report comparison

Create utility:

```text
compareReports(latest, previous)
```

It should return:

```text
Regime change
Ticker changes
Top winners/losers changes
Breadth change if available
```

Acceptance criteria:

- Dashboard shows comparison summary
- Handles missing previous report
- Does not crash on incomplete data

---

### Epic 3 — Dashboard v3

#### Task 3.1 — Build v3 dashboard

Dashboard should show:

```text
Latest report
Market regime
Main driver
Posture
Top winners
Top losers
Watchlist impact
Owned holdings impact
Latest-vs-previous changes
```

Acceptance criteria:

- Dashboard uses static JSON + localStorage
- Works without login
- Works without watchlist
- Mobile-friendly
- No blank screens

---

### Epic 4 — Watchlist MVP

#### Task 4.1 — Create local watchlist store

Implement localStorage-backed watchlists.

Acceptance criteria:

- User can create watchlist
- User can add ticker
- User can remove ticker
- Data persists after refresh
- Multiple watchlists are supported or architecture allows it

#### Task 4.2 — Create paste/import ticker engine

Implement a paste/import UI.

Acceptance criteria:

- User can paste many tickers at once
- Parser normalizes tickers
- Duplicates are removed
- Preview is shown before saving
- User can choose destination watchlist
- Unknown tokens are shown separately

#### Task 4.3 — Add tags, priority, and status

Acceptance criteria:

- Watchlist item supports tags
- Watchlist item supports priority
- Watchlist item supports status
- Dashboard can highlight high-priority tickers

---

### Epic 5 — Watchlist impact

#### Task 5.1 — Match latest report against watchlist

Create utility:

```text
getWatchlistImpact(latestReport, watchlistItems)
```

Acceptance criteria:

- Shows watched tickers mentioned in latest report
- Shows watched tickers with large moves
- Shows watched tickers not present in latest report
- Categorizes attention level: high, medium, low

---

### Epic 6 — Ticker pages

#### Task 6.1 — Create ticker detail page

Path:

```text
/ticker/[symbol]
```

Acceptance criteria:

- Loads ticker history from static by-ticker JSON
- Shows latest mention
- Shows report history
- Shows watchlist status if present
- Shows portfolio status if present
- Handles missing ticker history

#### Task 6.2 — Add ticker search

Acceptance criteria:

- User can search by symbol
- Results show symbol and number of report mentions
- Clicking opens ticker detail page

---

### Epic 7 — Portfolio MVP

#### Task 7.1 — Create manual holdings store

Implement localStorage-backed portfolio holdings.

Acceptance criteria:

- User can add holding
- User can edit holding
- User can delete holding
- Holding can be linked to ticker/instrument
- Portfolio dashboard separates owned from watched

#### Task 7.2 — Add portfolio impact to dashboard

Acceptance criteria:

- Dashboard shows owned tickers mentioned in latest report
- Dashboard highlights large moves in owned positions
- Dashboard shows owned tickers missing from latest report

---

### Epic 8 — Notes and journal

#### Task 8.1 — Add local ticker notes

Acceptance criteria:

- User can add note to ticker
- Notes persist locally
- Ticker page shows notes
- Notes can optionally link to a report date

---

### Epic 9 — News source abstraction

#### Task 9.1 — Refactor news fetching into source adapters

Suggested structure:

```text
scripts/news/
  news_service.py
  sources/
    yahoo.py
    ddg.py
```

Acceptance criteria:

- Report generator uses news service instead of directly calling source logic
- Failed news source does not break report generation
- News result has source, title, url if available, confidence score

#### Task 9.2 — Add news scoring

Acceptance criteria:

- News headlines are scored
- Generic market headlines are penalized
- Company/ticker-specific headlines are preferred
- Report logs selected catalyst headline

---

### Epic 10 — Supabase-ready architecture

#### Task 10.1 — Prepare Supabase schema file but do not require Supabase

Create:

```text
supabase/schema.sql
```

Include draft tables:

```sql
profiles
instruments
watchlists
watchlist_items
portfolio_holdings
manual_trades
notes
alerts
user_preferences
```

Acceptance criteria:

- Schema is documented
- RLS policies are included
- App does not require Supabase to run
- Supabase is treated as future sync layer, not required for static reports

---

## 14. Non-goals for v3

Do not do these in the first v3 implementation:

- Do not require login
- Do not require Supabase to run
- Do not move reports fully into database
- Do not require Nordnet API
- Do not implement trading
- Do not store broker credentials
- Do not build complex charting before the dashboard and watchlist work
- Do not make the app dependent on one external finance platform

---

## 15. Future Ideas

Later versions can add:

- Supabase login
- Cross-device watchlist sync
- Alert rules
- Email/push notifications
- Portfolio performance tracking
- Nordnet CSV import
- Direct Nordnet API if access is available
- AI-generated summary for user watchlist
- Weekly investment digest
- Trade journal
- Risk dashboard
- Sector exposure dashboard
- Earnings/calendar integration

---

## 16. Recommended Build Order

Recommended order for Codex:

```text
1. Add v3 navigation and page structure
2. Improve static data generation with lightweight JSON files
3. Build dashboard v3
4. Build local watchlist store
5. Build ticker paste/import engine
6. Match watchlist against latest report
7. Build ticker detail pages
8. Add manual portfolio holdings
9. Add notes
10. Refactor news source abstraction
11. Add Supabase schema as future-ready optional layer
```

---

## 17. Definition of Done for v3 MVP

v3 MVP is done when:

- App has a clear dashboard-first experience
- User can create a local master watchlist
- User can paste/import many tickers
- Dashboard shows impact on watched tickers
- Reports page is easier to browse
- Ticker detail page exists
- Portfolio section exists with manual holdings
- App remains static-first and fast
- App does not require Supabase or Nordnet API
- Existing GitHub Actions report generation still works
- Existing Cloudflare deployment still works

---

## 18. Product Positioning

The app should be positioned as:

```text
A personal investment cockpit that turns generated market reports into actionable watchlist insights.
```

Not:

```text
A trading platform
A broker replacement
A Yahoo Finance clone
A complex analytics terminal
```

---

## 19. Key Principle

The most important principle:

> The app should answer “what matters to me today?” faster than any generic finance platform.

Everything in v3 should support that.

---

## 20. Stitch + MCP Integration Strategy

Yes — Stitch can be used as a UI design source while implementation remains code-first in the web app.

### 20.1 Goal

Use Stitch for:

- Layout exploration
- Visual direction
- Component variants
- UX flow validation

Use app code as source of truth for:

- Production UI
- Data fetching
- Accessibility
- State handling
- Performance

### 20.2 MCP usage model

Treat Stitch MCP as a design adapter, not a runtime dependency.

```text
Stitch design exploration (MCP)
→ export design decisions / specs
→ map to app component system
→ implement in Next.js codebase
→ validate responsiveness + accessibility
```

### 20.3 Guardrails

- Never block app runtime on Stitch availability
- Keep tokens/styles in code (`theme`, `tailwind.config`, or CSS vars)
- Convert generated design output into reusable components
- Review every generated component for semantics and accessibility

---

## 21. Frontend Framework Recommendation

### 21.1 Recommended stack for v3

Use **Next.js (App Router) + TypeScript** as the primary framework.

Why this is a good fit:

- Strong component architecture for dashboard + nested routes
- Works well with static generation and hybrid rendering
- Easy deployment with static export/Cloudflare-compatible setup
- Good ecosystem for linting, testing, and typed APIs
- Clean path for future auth/sync integrations

### 21.2 Component/UI layer

Recommended approach:

- Tailwind CSS for consistent styling velocity
- Reusable UI component layer in `components/ui`
- Feature components grouped by domain (`dashboard`, `watchlist`, `reports`, `ticker`, `portfolio`)
- Optional use of headless component primitives for accessibility

### 21.3 Alternatives

Possible alternatives (if constraints change):

- Remix (great routing/data primitives)
- Astro (excellent for static-heavy sites)
- Vite + React Router (lean and flexible)

Default recommendation remains **Next.js** unless a specific constraint requires another framework.

---

## 22. Code Quality, Linting, and Testing Standards

### 22.1 Baseline quality gates

Set up mandatory checks for every PR:

```text
Type check
Lint
Unit tests
Build
```

Suggested commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### 22.2 Linting + formatting

- ESLint with strict TypeScript + React rules
- Prettier for consistent formatting
- Import/order and unused-import rules enabled
- Fail CI on lint/type errors

### 22.3 Testing strategy

Use a test pyramid adapted for this app:

1. **Unit tests** (utilities and parsers)
   - `parse-tickers`
   - `normalize-symbol`
   - `compareReports`
   - `getWatchlistImpact`

2. **Component tests** (critical UI behavior)
   - Dashboard summary cards
   - Watchlist import preview
   - Empty/error states

3. **End-to-end smoke tests**
   - Open dashboard
   - Open reports list
   - Open ticker detail
   - Add/remove watchlist item

### 22.4 CI pipeline recommendation

For GitHub Actions, add a `web-app-ci` workflow:

```text
on: pull_request
  - install deps
  - lint
  - typecheck
  - test
  - build
```

Optional on main branch:

- Lighthouse/performance budget check
- Bundle size tracking

### 22.5 Definition of done extension

A feature is not done unless:

- Types are clean
- Lint passes
- Tests cover critical logic paths
- Loading/empty/error states are present
- Mobile and desktop layouts are verified
