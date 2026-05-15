# [SPEC-023] Thesis System (Structured Stock Research + Trade Plan + Quarterly Review)

## 1. Context
Today `/research` only knows about free-form `ResearchDispatch` notes — a title, a markdown body, an optional ticker. The user's actual research workflow is a structured framework (see `docs/research-framework.md`): start with a thesis, classify points as core vs optional, fact-check fundamentals, define five scenarios, pick green/yellow/red light, then iterate quarterly. The framework is also tightly coupled to a trade plan — explicit add levels and a max position size that need to drive buy/sell decisions when the price moves.

The current dispatch model can't capture any of this. The user keeps the framework in ChatGPT projects + scratch docs, which means the structured data never reaches the rest of the app — not the ticker page, not the dashboard, not the portfolio.

## 2. Problem
Three concrete gaps:

1. **No structured thesis.** Bull/bear arguments, fundamentals snapshots, scenarios, and the current "light" live in free-form prose or in ChatGPT, not in a queryable shape the app can use.
2. **No trade plan visualisation.** Add levels 1–3 (and trim/sell triggers) are written somewhere but never shown on the price chart; the user has to compare current price to a plan stored elsewhere.
3. **No quarterly review loop.** After earnings, the framework expects a fresh quarterly check that updates the thesis status. Today there's no place to record this, and no way to see whether a thesis is stale.

## 3. Scope

### In scope
- New domain types `Thesis` (one per symbol) and `QuarterlyReview` (many per thesis).
- New localStorage stores for both.
- Structured form covering framework sections §1, §2, §4, §5, §6, §7, §8 — collapsible sections so the user can fill in stages.
- Trade plan zones: `tradeLevels: { kind: "add"|"trim"|"sell", price, note?, level? }[]` editable from the form.
- Visualisation:
  - Horizontal lines on `/ticker/[symbol]` PriceChart for each level (color-coded green/amber/red).
  - Dashboard "crossed zone" card listing symbols where today's close is within ±X% of any level on a current thesis.
- "Active thesis" indicators on `/watchlist` (light dot) and `/portfolio` (📖 link).
- Quarterly review form covering §9.
- "Copy to ChatGPT" button that emits a markdown blob built from structured fields + the §10 prompt.
- Reference panel: §3 source hierarchy and §6 valuation metrics as collapsible help blocks inside `/research`.

### Out of scope
- Auto-derivation of the current light from checklist state (manual only — confirmed with user).
- Versioned thesis history (one canonical per symbol — confirmed). If the user wants audit trail later, that's a follow-up.
- Pulling fundamentals from yfinance API beyond what `QuoteMeta` already exposes (`peRatio`, `dividendYield`, `marketCap`, `sector`, `industry`). Other figures stay user-entered.
- Direct ChatGPT API integration. Copy-to-clipboard is the boundary.
- Multi-user / sharing semantics — local-first per ADR-002.
- Earnings calendar / event reminders (separate feature).
- Automating "review me" reminders. The "stale thesis" tag is a passive UI flag, not a notification.

## 4. User stories
- As an investor following the framework, I want to capture every thesis section in the app instead of in ChatGPT scratch docs, so I have one source of truth.
- As an investor with a trade plan, I want my add/trim/sell levels visible on the price chart so I see them every time I look at a ticker.
- As an investor watching multiple tickers, I want the dashboard to tell me which ones crossed a planned zone today so I don't miss the trigger.
- As an investor reviewing quarterly earnings, I want a structured form per earnings report that ties back to the original thesis and forces me to update the light.
- As an investor using ChatGPT to fact-check my thesis, I want a one-click "copy thesis + prompt" so I don't have to retype everything.

## 5. Data contracts

```ts
// lib/domain/thesis.ts

export type PlannedAction = "hold" | "add" | "trim" | "sell" | "watch";
export type Light = "green" | "yellow" | "red";
export type ScenarioKind = "worst" | "bear" | "base" | "better" | "moonshot";
export type TradeLevelKind = "add" | "trim" | "sell";
export type ClassifiedPointType = "core" | "optional" | "valuation" | "risk";

export interface ClassifiedThesisPoint {
  point: string;
  type: ClassifiedPointType;
  needsProof: boolean;
}

export interface TradeLevel {
  kind: TradeLevelKind;
  price: number;
  level?: 1 | 2 | 3;  // for "add" levels following the framework's 3 tranches
  note?: string;
}

export interface FundamentalsSnapshot {
  revenueGrowth?: string;
  margins?: string;
  fcf?: string;
  balanceSheet?: string;
  segmentGrowth?: string;
  guidance?: string;
  capitalAllocation?: string;
}

export interface MarketPositionNotes {
  realCompetition?: string;
  dominanceToday?: string;
  durability?: string;
  newMarkets?: string;
  newAreasProven?: string;
}

export interface ValuationNotes {
  metricsTracked?: string;
  growthAssumed?: string;
  marginAssumed?: string;
  multipleAssumed?: string;
  notes?: string;
}

export interface Scenario {
  kind: ScenarioKind;
  businessAssumptions?: string;
  valuationAssumptions?: string;
  priceTarget?: number;
  probability?: number;    // 0..100
  meaning?: string;
}

export interface Concerns {
  valuation?: string;
  competition?: string;
  macro?: string;
  execution?: string;
  other?: string;
}

export interface Thesis {
  symbol: string;          // uppercase, the primary key
  createdAt: string;
  updatedAt: string;

  // §1 Input snapshot
  currentPriceAtCreation?: number;
  avgEntryPrice?: number;
  positionSize?: number;
  timeHorizon?: string;
  plannedAction?: PlannedAction;

  // §1 Narrative
  thesisPoints: string[];
  concerns: Concerns;
  questions: string[];

  // §2 Classification
  classifiedPoints: ClassifiedThesisPoint[];

  // §1 + §8 Trade plan
  tradeLevels: TradeLevel[];
  maxPositionSize?: number;

  // §4 Fundamentals
  fundamentals: FundamentalsSnapshot;

  // §5 Market position
  marketPosition: MarketPositionNotes;
  coreDrivers: string[];
  optionalDrivers: string[];

  // §6 Valuation
  valuation: ValuationNotes;

  // §7 Scenarios — array of 5, one per kind. Pre-stubbed on create.
  scenarios: Scenario[];

  // §8 Checklist state + light
  currentLight: Light;
  greenChecks: boolean[];   // length = 9 per framework
  yellowChecks: boolean[];  // length = 6
  redChecks: boolean[];     // length = 8
  trimSellChecks: boolean[]; // length = 6

  // §10 Round-trip
  analysisNotes?: string;   // markdown the user pastes back from ChatGPT
}
```

```ts
// lib/domain/quarterly-review.ts

export interface QuarterlyReview {
  id: string;
  thesisSymbol: string;     // FK to Thesis.symbol
  quarterLabel: string;     // e.g. "Q3 2026" or "2026-Q3"
  createdAt: string;

  changes: {
    revenue?: string;
    margins?: string;
    fcf?: string;
    guidance?: string;
    segmentGrowth?: string;
    productRoadmap?: string;
    risks?: string;
  };
  thesisStatus: {
    stronger: string[];
    weaker: string[];
    unchanged: string[];
  };
  light: Light;
  lightWhy: string;
  nextReportWatch: string[];
  updatedView: {
    companyQuality?: string;
    valuation?: string;
    thesisStrength?: string;
    averagingDownRisk?: string;
    mostImportantNextCheck?: string;
  };
}
```

```ts
// lib/storage/thesis-store.ts (sketch)
export function getTheses(): Record<string, Thesis>;
export function getThesis(symbol: string): Thesis | null;
export function upsertThesis(thesis: Thesis): Thesis;
export function deleteThesis(symbol: string): void;

// lib/storage/quarterly-review-store.ts (sketch)
export function listQuarterlyReviews(symbol: string): QuarterlyReview[];
export function getQuarterlyReview(id: string): QuarterlyReview | null;
export function createQuarterlyReview(input: Omit<QuarterlyReview, "id" | "createdAt">): QuarterlyReview;
export function deleteQuarterlyReview(id: string): void;
```

Both stores follow the SPEC-016 `_conforms` pattern — `contracts.ts` gains `ThesisRepository` and `QuarterlyReviewRepository`.

localStorage keys:
- `theses` — `Record<symbol, Thesis>`.
- `quarterly_reviews` — `QuarterlyReview[]`.

## 6. UX notes

### `/research` page
- New tabs at top: "Dispatches" | "Theses" (default to Theses if the user has any).
- Theses tab: list of symbol cards with current light dot, plannedAction, last updated date, and a small thesis-points preview.
- "New thesis" CTA opens a per-symbol form (or navigates to `/research/thesis/[symbol]` for a new symbol).
- Quarterly review timeline appears below a thesis when viewed.

### `/research/thesis/[symbol]`
Collapsible sections:
1. **Snapshot** (§1 input) — auto-fills `currentPriceAtCreation` from `loadAllQuoteSnapshots()`.
2. **Classification** (§2) — table editor for `classifiedPoints` (point, type chip, needsProof checkbox).
3. **Fundamentals** (§4) — 7 fields from the framework's table.
4. **Market position** (§5) — 5 fields + two bulleted lists (core / optional drivers, pre-stubbed with framework defaults you can drop or extend).
5. **Valuation** (§6) — 5 fields.
6. **Scenarios** (§7) — 5 row editor.
7. **Trade plan** (§1 buying plan + sell/trim levels) — repeatable rows.
8. **Light + checklists** (§8) — 4 checklist groups, manually-set current light at the top.
9. **Analysis notes** (§10) — markdown textarea, rendered via existing `MarkdownBody`.
10. Footer actions: "Copy to ChatGPT", "Delete thesis", "+ Quarterly review".

### `/ticker/[symbol]`
- Active thesis summary card at the top (current light, plannedAction, last updated).
- `tradeLevels` rendered as horizontal lines on `PriceChart` (the chart primitive in `components/charts/sentiment-area-chart.tsx` gains an optional `referenceLines` prop). Color: green for `add`, red for `sell`, amber for `trim`. Labels show price + level number.

### Dashboard
- New `CrossedZonesCard` (lives between watchlist impact and portfolio impact):
  - Reads all theses.
  - For each symbol with a thesis, checks current snapshot close vs every `tradeLevel.price`. If `|close - price| / price ≤ proximityPct` (default 2%, configurable in dashboard settings), surface as a row.
  - Empty state when nothing is in range.

### `/watchlist`
- Symbol cell gains a small light dot when a thesis exists. Click → `/research/thesis/[symbol]`.

### `/portfolio`
- Symbol cell gains a 📖 link when a thesis exists. Same destination.

### Reference panel
- Collapsible help on `/research`: "Source hierarchy" (§3) and "Valuation methods" (§6 reference table). Pure markdown, no logic.

## 7. Functional requirements
- FR1: Create / read / update / delete a thesis per symbol.
- FR2: Create / read / list / delete quarterly reviews per thesis.
- FR3: Render `tradeLevels` as horizontal reference lines on `PriceChart` for any symbol with an active thesis.
- FR4: Dashboard `CrossedZonesCard` lists symbols whose latest close is within `proximityPct` (default 2%) of any trade level on its thesis.
- FR5: "Copy to ChatGPT" button builds markdown from thesis fields in the §1 input template shape, prepends the §10 prompt, and writes to clipboard.
- FR6: All seven framework sections (§1, §2, §4–§8) editable inside one form with collapsible sections; no field is required to save (drafts are valid).
- FR7: Active thesis indicators on `/watchlist`, `/portfolio`, and `/ticker/[symbol]`.

## 8. Non-functional requirements
- All persistence stays in localStorage — local-first per ADR-002.
- Storage schema reachable from SPEC-012's planned Supabase tables (add `theses` + `quarterly_reviews` to that draft when this lands).
- No new runtime deps. Markdown rendering reuses the existing `MarkdownBody` (which uses `marked`).
- Form should not lose state on tab switch — section state lives in component state, persisted via `upsertThesis` on blur/explicit save.
- Build stays static (`force-static` where possible). Thesis data is client-side only.

## 9. Acceptance criteria
- [ ] AC1: Creating a thesis for `AAPL`, filling §1 + §7 (scenarios) + one add level, saving, reloading the page — all fields persist.
- [ ] AC2: The `/ticker/AAPL` price chart shows a green horizontal line at the saved add level after refresh.
- [ ] AC3: If the latest `AAPL` close is within 2% of any thesis trade level, the dashboard shows it in `CrossedZonesCard`. Move the level so it's outside 2% — the row disappears after refresh.
- [ ] AC4: Watchlist row for `AAPL` shows a light dot matching `currentLight`.
- [ ] AC5: "Copy to ChatGPT" produces clipboard content that begins with the §10 prompt and ends with a markdown rendering of §1 in the template shape.
- [ ] AC6: Creating a quarterly review for the `AAPL` thesis adds a row to the review timeline under the thesis, with the entered light and date.
- [ ] AC7: Deleting the thesis removes the price-chart lines, the dashboard row, the watchlist dot, the portfolio 📖, and all attached quarterly reviews.
- [ ] AC8: `_conforms` assertions on both new stores pass `tsc --noEmit`. `npm run build` passes.
- [ ] AC9: STATUS.md SPEC-023 row updated.

## 10. Test plan
- **Unit:** thesis store coerce (malformed localStorage → defaults), quarterly review store CRUD, markdown emitter for "Copy to ChatGPT".
- **Component:** thesis form section state persistence; `PriceChart` with `referenceLines` prop; `CrossedZonesCard` with mocked snapshots.
- **E2E (manual via demo seed):** load demo data, create a thesis for one demo symbol with one add level near current price, verify all surfaces light up.

## 11. Rollout plan
Phases below correspond to the parallelizable units logged in `BACKLOG.md` (W8.A…W8.I). Phase A must land first; B, C, D follow on the same form; E/F/G/H/I are parallelizable once A is in.

| Phase | Slice | Effort |
|---|---|---|
| W8.A | Domain types + stores + minimal form (§1 + §2) + `/research/thesis/[symbol]` route | L |
| W8.B | §4 Fundamentals + §5 Market position + §6 Valuation editors | M |
| W8.C | §7 Scenarios editor (5 rows + expected-value calc) | M |
| W8.D | §8 Light + checklists | M |
| W8.E | Trade plan visualisation: chart `referenceLines`, dashboard `CrossedZonesCard`, `lib/quotes/zones.ts` | M |
| W8.F | `QuarterlyReview` type + store + form + timeline | M |
| W8.G | "Copy to ChatGPT" markdown emitter + button | S |
| W8.H | Active-thesis indicators on watchlist / portfolio / ticker | S |
| W8.I | Reference panel: §3 + §6 tables as collapsible help | S |

No feature flag — local-first, no risk of breaking other users.

## 12. Risks
- **Risiko:** Form sprawl — 9+ sections in one page becomes overwhelming.
  **Mitigasjon:** Sections are collapsible and individually optional. Default to "Snapshot only" expanded on new thesis creation.
- **Risiko:** Trade-level proximity check is naive (today's close ±2%) — could miss intraday crossings.
  **Mitigasjon:** Daily-close pipeline is the data source; intraday is out of scope here. Document the limitation in the card caption ("based on last close").
- **Risiko:** localStorage size: 9+ string fields × N symbols × M quarterly reviews per symbol could push the 5MB cap.
  **Mitigasjon:** Realistic personal scale (10–50 symbols, 4 reviews/year/symbol over 5 years) is well under 1MB even with verbose markdown. Document; if it ever matters, SPEC-024 (Supabase sync) is the real fix.
- **Risiko:** Schema drift between TS domain types and `docs/research-framework.md` over time.
  **Mitigasjon:** When the framework doc changes, this spec gets a follow-up. The framework doc is the source of truth for section names and check-list items.
