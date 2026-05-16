# [SPEC-031] Thesis Auto-suggest from Company Data

## 1. Context
SPEC-023 ships a structured Thesis form mirroring the user's framework. SPEC-029 ships a `data/company/SYMBOL.json` pipeline with company description, valuation metrics, analyst consensus, earnings calendar, and recent news. But filling the thesis form is still a manual chore — users re-type things the pipeline already knows.

The W9 ChatGPT import feature already proved the diff-preview pattern: parse external content, propose per-field updates, user accepts/skips. SPEC-031 applies the same pattern to **our own data**: pre-compute suggestions from `CompanyInfo` + `QuoteSeries` + the planned financials extension, surface them via a "Suggest from data" button.

## 2. Problem
- The framework's §4 Fundamentals section asks for revenue growth, margins, FCF, balance sheet, guidance, capital allocation — all derivable from yfinance financials, but never auto-filled.
- §6 Valuation section asks "what does the current price assume?" — `analyst.targetMeanPrice` + `metrics.*` give the user a starting point they have to look up manually.
- §7 Scenarios — Yahoo's `targetMeanPrice` is a natural seed for the "base case" price target. We don't surface it.
- The user keeps copy-pasting from Yahoo / Macrotrends / earnings releases into the form.

## 3. Scope

### In scope — two layers

#### Layer A: Pipeline expansion (W15.A)

Extend `scripts/fetch-quotes.py` to also pull yfinance financials:

```python
ticker.income_stmt              # annual income statement
ticker.quarterly_income_stmt    # quarterly income statement
ticker.cashflow                 # annual cashflow
ticker.balance_sheet            # annual balance sheet
ticker.recommendations          # analyst rec history
```

Compute and write to `data/company/SYMBOL.json` as new top-level sub-objects:

```json
{
  "symbol": "AAPL",
  // … existing fields …
  "financials": {
    "revenue": {
      "latestAnnual": 425_000_000_000,
      "latestAnnualDate": "2025-09-30",
      "yoyPct": 8.2,
      "cagr5y": 9.2
    },
    "operatingMargin": {
      "latest": 0.297,
      "fiveYearHigh": 0.305,
      "fiveYearLow": 0.241,
      "trend": "stable"     // "expanding" | "stable" | "compressing"
    },
    "freeCashFlow": {
      "latestAnnual": 99_000_000_000,
      "fiveYearAvg": 92_000_000_000,
      "trend": "stable"
    },
    "balanceSheet": {
      "totalDebt": 109_000_000_000,
      "totalCash": 165_000_000_000,
      "netCash": 56_000_000_000,         // positive = net cash, negative = net debt
      "currentRatio": 0.99
    }
  },
  "recommendations": {
    "lastChangedAt": "2026-04-12",
    "lastChange": "upgrade",              // "upgrade" | "downgrade" | "init" | "reiterate"
    "lastFirm": "Morgan Stanley",
    "lastFromGrade": "Equal-Weight",
    "lastToGrade": "Overweight"
  }
}
```

Skip the section gracefully when yfinance returns no statements (common for ETFs / indices).

#### Layer B: Autofill helper + UI (W15.B, W15.C)

**Helper** (`web-app/src/lib/research/thesis-autofill.ts`, new):

```ts
import type { Thesis, FundamentalsSnapshot, MarketPositionNotes, ValuationNotes, Scenario, Concerns } from "@/lib/domain/thesis";
import type { CompanyInfo } from "@/lib/domain/company";
import type { QuoteSnapshot } from "@/lib/quotes/snapshots";

export interface ThesisSuggestion {
  // Sparse subset of Thesis fields the helper was confident about
  thesisPoints?: string[];
  concerns?: Partial<Concerns>;
  fundamentals?: Partial<FundamentalsSnapshot>;
  marketPosition?: Partial<MarketPositionNotes>;
  valuation?: Partial<ValuationNotes>;
  scenarios?: Partial<Scenario>[];      // sparse, indexed by kind
  questions?: string[];
}

export interface SuggestionReport {
  parsed: ThesisSuggestion;
  matchedFieldCount: number;
  totalFieldCount: number;
  warnings: string[];
}

export function suggestFromData(
  company: CompanyInfo | null,
  snapshot: QuoteSnapshot | undefined,
): SuggestionReport;
```

Suggestion logic per section:

| Thesis field | Suggestion from |
|---|---|
| `marketPosition.dominanceToday` | `company.description` first ~200 chars |
| `marketPosition.realCompetition` | "Sector: {sector}; Industry: {industry}" |
| `fundamentals.revenueGrowth` | "Revenue {fmtMoney(latestAnnual)} YoY {fmtPct(yoyPct)}; 5y CAGR {fmtPct(cagr5y)}" |
| `fundamentals.margins` | "Op margin {fmtPct(latest*100)} ({trend} vs 5y); range {fmtPct(low*100)}–{fmtPct(high*100)}" |
| `fundamentals.fcf` | "TTM FCF {fmtMoney(latestAnnual)}; 5y avg {fmtMoney(fiveYearAvg)}; {trend}" |
| `fundamentals.balanceSheet` | "Net {cash/debt} {fmtMoney(\|netCash\|)}; current ratio {currentRatio.toFixed(2)}" |
| `fundamentals.guidance` | "Next earnings: {fmtDate(earningsDate)}. Watch: revenue growth + op margin + guidance." |
| `valuation.metricsTracked` | "P/E (TTM) {trailingPE}; Forward P/E {forwardPE}; P/B {priceToBook}; EV/EBITDA {enterpriseToEbitda}" |
| `valuation.notes` | "Analyst consensus: {ratingLabel} ({recommendationMean}). 1Y target: {fmtMoney(targetMeanPrice)} ({fmtPct(impliedDelta)})" |
| `scenarios[base].priceTarget` | `analyst.targetMeanPrice` |
| `scenarios[base].businessAssumptions` | "Management delivers consensus; mid-cycle margins hold" |
| `questions` | `["Will next quarter's revenue track {revenueYoY}%?", "Can margins hold above {operatingMargin}%?", "Capital allocation: buybacks vs M&A?"]` |

Helper is **deterministic**: same inputs → same suggestions. No LLM call, no fetch.

**UI** (`web-app/src/components/research/thesis-autofill-panel.tsx`, new):

- Button "Suggest from data" near the Copy-to-ChatGPT button on the thesis form.
- Click → opens a diff panel (or expands an inline section) showing the same per-field accept/skip UI as `ThesisImportPanel` (W9):
  - Summary: "Computed N suggestions from the company data."
  - Per-field diff: current vs proposed, Accept/Skip per row.
  - Accept-all button.
  - Cancel closes the panel without applying.
- After applying, the form's state has the new values; user still must hit Save.

### Out of scope
- AI / LLM-driven suggestions. This is deterministic prose generation.
- Suggestions for `classifiedPoints` (the user knows their own thesis points; we don't).
- Suggestions for `tradeLevels` or `maxPositionSize` — too personal.
- Suggestions for `currentLight` or checklists — too personal.
- Live-fetching financials at runtime. All from the build-time `data/company/SYMBOL.json`.

## 4. User stories
- As a user starting a thesis on `AAPL`, I want a one-click way to seed `fundamentals.*` and `valuation.metricsTracked` with the latest numbers so I can focus on the analysis layer.
- As a user, I want to see what the autofill would put in each field BEFORE it overwrites my draft.
- As a user, I want to accept some suggestions and skip others (e.g. take revenue growth but not balance sheet because I want to phrase it differently).

## 5. Data contracts

```ts
// web-app/src/lib/domain/company.ts — additive
export interface FinancialMetric {
  latest?: number;
  fiveYearHigh?: number;
  fiveYearLow?: number;
  trend?: "expanding" | "stable" | "compressing";
}

export interface RevenueSummary {
  latestAnnual?: number;
  latestAnnualDate?: string;
  yoyPct?: number;
  cagr5y?: number;
}

export interface FreeCashFlowSummary {
  latestAnnual?: number;
  fiveYearAvg?: number;
  trend?: "expanding" | "stable" | "compressing";
}

export interface BalanceSheetSummary {
  totalDebt?: number;
  totalCash?: number;
  netCash?: number;
  currentRatio?: number;
}

export interface CompanyFinancials {
  revenue: RevenueSummary;
  operatingMargin: FinancialMetric;
  freeCashFlow: FreeCashFlowSummary;
  balanceSheet: BalanceSheetSummary;
}

export interface RecommendationsSummary {
  lastChangedAt?: string;
  lastChange?: "upgrade" | "downgrade" | "init" | "reiterate";
  lastFirm?: string;
  lastFromGrade?: string;
  lastToGrade?: string;
}

export interface CompanyInfo {
  // … existing fields …
  financials?: CompanyFinancials;
  recommendations?: RecommendationsSummary;
}
```

## 6. UX notes

### Button placement
The "Suggest from data" button sits next to the existing "Copy to ChatGPT" and "Save thesis" buttons at the bottom of the form. Visual style: outline variant with a `Sparkles` lucide icon.

### Diff preview panel
Mirrors `ThesisImportPanel` (W9) exactly:
- Per-section grouped diffs (Fundamentals → 4 rows, Valuation → 2 rows, Scenarios → 1 row, Concerns → 0-N rows, Market position → 2 rows, Questions → 3 rows).
- Each row: field label, current value (muted, may be empty), proposed value (highlighted).
- Per-row Accept / Skip buttons.
- "Accept all" at top.
- "Cancel" closes panel; nothing applied.

### Disable when no data
The button is disabled with a tooltip "No company data for this symbol — pipeline hasn't ingested it yet" when `company === null`.

## 7. Functional requirements
- FR1: `scripts/fetch-quotes.py` writes `financials` + `recommendations` sub-objects to `data/company/SYMBOL.json`. Gracefully skips when yfinance returns no statement data.
- FR2: `CompanyInfo` TS type extended with the new fields (all optional).
- FR3: `suggestFromData(company, snapshot)` returns a sparse `ThesisSuggestion` — deterministic, no I/O.
- FR4: "Suggest from data" button on thesis form opens a diff preview. Disabled when `company` is null.
- FR5: Accepted fields merge into form state. Skipped fields untouched. Save thesis still required to persist.
- FR6: After apply, the panel closes (clear-and-close like W9).

## 8. Acceptance criteria
- [ ] AC1: `scripts/fetch-quotes.py` outputs `data/company/AAPL.json` with `financials` and `recommendations` populated.
- [ ] AC2: For a symbol with no statements (e.g. `^GSPC`), the script writes the existing fields but omits `financials` / `recommendations` (or sets them to empty objects).
- [ ] AC3: Loading a thesis with `company !== null` enables the "Suggest from data" button.
- [ ] AC4: Clicking the button shows ≥6 suggested fields for a stocked symbol (AAPL, NVDA, MSFT).
- [ ] AC5: Accept-all merges all suggestions into form state.
- [ ] AC6: Skip on a row leaves the form field untouched.
- [ ] AC7: `npm run build` passes. `loadCompany` still tolerates absent file.

## 9. Test plan
- **Python**: run `fetch-quotes.py` against AAPL; inspect output JSON shape against the spec.
- **Unit (TS)**: `suggestFromData` with mocked `CompanyInfo` fixtures — verify each suggestion string format.
- **Component**: diff panel renders, accept/skip per row works, accept-all merges all.
- **Manual**: open `/research/thesis/AAPL`, click "Suggest from data", verify the proposed values look right.

## 10. Rollout plan
- W15.A: Python pipeline expansion. Tiny code change; adds ~4 new yfinance API calls per symbol. Daily-cron friendly.
- W15.B: TS domain extension + autofill helper.
- W15.C: Diff-preview UI ("Suggest from data" button + panel).
- W15.D: Inline "Use this" buttons in wizard step bodies (stretch — defer if scope tight).

Phases A + B can ship together (data + helper) before C lands. A also depends on no other pipeline change racing it.

## 11. Risks
- **Risiko:** yfinance financial statements are rate-limited or sparse for non-US tickers.
  **Mitigasjon:** Every financials field is optional. Helper short-circuits when data is missing. Daily cron is generous on rate limits (one pull per symbol per day).
- **Risiko:** Auto-generated prose feels generic ("Revenue grew 8% YoY") and users replace every suggestion anyway.
  **Mitigasjon:** This is fine. The win is the user starts from "8% YoY" instead of "what was revenue growth again?".
- **Risiko:** Wrong yoy% / CAGR due to acquisition / divestiture noise.
  **Mitigasjon:** Don't claim authority. Suggestions are prose drafts. User edits before save.
- **Risiko:** "Recommended target = $192.50" anchors the user's base-case scenario.
  **Mitigasjon:** Spec'd as a SCENARIOS suggestion, not a trade level. User must explicitly accept it AS a base-case price target.
