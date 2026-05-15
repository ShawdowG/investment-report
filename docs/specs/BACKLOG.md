# v3 Prioritized Backlog

Inkrementell leveringsrekkefølge. Sjekk `STATUS.md` for live-status før du henter neste oppgave.

## Current focus (2026-05-15)

P0 + P1 + P2 + v4 cockpit (SPEC-014–022) er ferdig. SPEC-003 og SPEC-010 sunset under SPEC-022. SPEC-012 levert som spec-doc. Alle formelle specs er nå avsluttet — produktet er i "polish + extend" -fase.

## Next session — refinement plan (planned 2026-05-15, execute 2026-05-16+)

Page-by-page audit complete (7 parallel Explore agents on 2026-05-15). Every page has refinement work. The plan below is **parallelizable by workstream** — each is scoped to non-overlapping files so multiple agents can pick a stream concurrently.

**Conventions used in tables below:**
- **Effort:** S = <30 min, M = 30–90 min, L = >90 min.
- **Priority:** P1 = correctness/UX bug, P2 = polish/consistency, P3 = nice-to-have.
- **Workstreams labeled W0–W7.** W0 is foundations (run first or in parallel); W1–W7 are per-page.

### Shared themes (every workstream touches some of these)
- **Token drift:** `text-muted-foreground`, `bg-muted`, `border-input`, `bg-background` show up on most pages — replace with Stitch (`text-text-secondary`, `bg-surface-variant`, `border-border-subtle`, `bg-surface`).
- **Duplicated formatters:** `fmtMoney()` and `fmtDate()` / `fmtDateTime()` live in 5+ files — extract to `lib/utils/`.
- **`BadgeSelect` reuse:** currently inline in `watchlist-table.tsx`; wanted on `/ticker` (add-to-watchlist) and possibly `/portfolio`.
- **Form a11y gaps:** missing `htmlFor`, `aria-invalid`, `aria-describedby` across `/portfolio`, `/strategies`, `/settings`, `/research` forms.
- **Native `confirm()` modal** used in `/strategies` and `/settings` reset — needs themed dialog primitive.

### W0 — Foundations (run first; touches files used by many pages)

These should land before W1–W7 to maximize reuse and avoid conflicts.

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W0.1 | Promote `BadgeSelect` to `components/ui/badge-select.tsx`, export from `ui/stitch.ts`; add full keyboard nav (Up/Down/Home/End/Enter), `aria-activedescendant`, focus trap | `web-app/src/components/ui/badge-select.tsx` (new), `web-app/src/components/ui/stitch.ts`, `web-app/src/components/watchlist/watchlist-table.tsx` | M | P1 |
| W0.2 | Extract shared formatters to `lib/utils/format.ts` (`fmtMoney`, `fmtPct`, `fmtDate`, `fmtDateTime`); existing call sites migrate later per page | `web-app/src/lib/utils/format.ts` (new) | S | P2 |
| W0.3 | Fix `ui/card.tsx` token drift — replace `text-muted-foreground` with `text-text-secondary` in CardDescription | `web-app/src/components/ui/card.tsx` | S | P1 |
| W0.4 | Add themed `ConfirmDialog` primitive (Radix-free, portal-rendered) to replace native `confirm()` | `web-app/src/components/ui/confirm-dialog.tsx` (new) | M | P2 |

### W1 — `/research`

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W1.1 | Replace `text-muted-foreground` with `text-text-secondary` in form labels + list items | `web-app/src/components/research/dispatch-form.tsx`, `web-app/src/components/research/dispatch-list.tsx` | S | P2 |
| W1.2 | Migrate date formatters to `lib/utils/format.ts` (depends W0.2) | `web-app/src/components/research/dispatch-list.tsx`, `web-app/src/components/research/dispatch-view.tsx`, `web-app/src/components/ticker/ticker-dispatches.tsx` | S | P2 |
| W1.3 | Refactor list header + empty state to use `SectionHeader` action slot (matches dashboard pattern) | `web-app/src/components/research/dispatch-list.tsx`, `web-app/src/components/research/research-view.tsx` | M | P2 |
| W1.4 | Add try/catch + user-visible error around `writeJson` writes; surface in research-view | `web-app/src/lib/storage/research-dispatches-store.ts`, `web-app/src/components/research/research-view.tsx` | M | P1 |
| W1.5 | Validate & uppercase ticker input in dispatch form | `web-app/src/components/research/dispatch-form.tsx` | S | P3 |

### W2 — `/watchlist`

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W2.1 | Replace `text-muted-foreground` / `bg-muted` / `border-border/50` with Stitch tokens | `web-app/src/components/watchlist/watchlist-view.tsx`, `web-app/src/components/watchlist/add-symbol-form.tsx`, `web-app/src/components/watchlist/import-section.tsx` | S | P1 |
| W2.2 | Migrate inline `BadgeSelect` to `components/ui/badge-select.tsx` import (depends W0.1) | `web-app/src/components/watchlist/watchlist-table.tsx` | S | P2 |
| W2.3 | Add viewport boundary check + smart flip to `BadgeSelect` so dropdowns don't render off-screen | `web-app/src/components/ui/badge-select.tsx` (post-W0.1) | M | P3 |
| W2.4 | Make sortable columns: clickable headers for Last Px / Day Δ | `web-app/src/components/watchlist/watchlist-table.tsx` | M | P3 |
| W2.5 | Add visual focus ring (`focus-visible`) to filter Chip buttons | `web-app/src/components/watchlist/watchlist-filters.tsx` | S | P3 |

### W3 — `/portfolio`

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W3.1 | Replace shadcn tokens with Stitch in portfolio components | `web-app/src/components/portfolio/portfolio-view.tsx`, `web-app/src/components/portfolio/portfolio-table.tsx`, `web-app/src/components/portfolio/add-position-form.tsx` | S | P2 |
| W3.2 | Add P&L table to `/portfolio` (use existing `getPortfolioPnL()`, no duplicate math) | `web-app/src/components/portfolio/portfolio-view.tsx`, `web-app/src/app/portfolio/page.tsx` (load snapshots server-side) | M | P1 |
| W3.3 | Surface portfolio equity chart on `/portfolio` (reuse `components/dashboard/portfolio-equity-chart.tsx` — promote to `components/portfolio/` if shared) | `web-app/src/components/portfolio/portfolio-view.tsx`, `web-app/src/app/portfolio/page.tsx` (load compactDaily server-side) | M | P2 |
| W3.4 | Inline-edit popovers for quantity / avgPrice using `BadgeSelect` (depends W0.1) | `web-app/src/components/portfolio/portfolio-table.tsx`, `web-app/src/lib/storage/portfolio-store.ts` (add `update`) | M | P2 |
| W3.5 | Form a11y: `aria-required`, `aria-describedby` linking error message, remove `min="0"` paste race | `web-app/src/components/portfolio/add-position-form.tsx` | S | P2 |
| W3.6 | Show missing-symbol feedback on the portfolio page (mirror dashboard card) | `web-app/src/components/portfolio/portfolio-view.tsx` | S | P2 |

### W4 — `/strategies`

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W4.1 | Refactor `backtest-chart.tsx` to use `SentimentAreaChart` primitive (kills hardcoded green/red + manual recharts boilerplate) | `web-app/src/components/strategies/backtest-chart.tsx` | S | P2 |
| W4.2 | Replace `text-muted-foreground` / `border-input` / `bg-background` with Stitch tokens | `web-app/src/components/strategies/strategy-form.tsx`, `web-app/src/components/strategies/strategy-view.tsx`, `web-app/src/components/strategies/symbol-picker.tsx` | M | P2 |
| W4.3 | Validate `startDate ≤ endDate` in form | `web-app/src/components/strategies/strategy-form.tsx` | S | P1 |
| W4.4 | Replace native `confirm()` delete with `ConfirmDialog` (depends W0.4) | `web-app/src/components/strategies/strategy-view.tsx` | S | P2 |
| W4.5 | Add `aria-invalid` + error descriptions to form fields; `role="listbox"` on symbol-picker suggestions | `web-app/src/components/strategies/strategy-form.tsx`, `web-app/src/components/strategies/symbol-picker.tsx` | M | P2 |
| W4.6 | Improve backtest error presentation (warning color/badge, not blended) | `web-app/src/components/strategies/strategy-view.tsx` | S | P2 |
| W4.7 | Move default parameters (shortPeriod=50, longPeriod=200, rsiPeriod=14, etc.) to `lib/domain/strategy.ts` constants | `web-app/src/components/strategies/strategy-form.tsx`, `web-app/src/lib/domain/strategy.ts` | S | P3 |

### W5 — `/ticker/[symbol]`

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W5.1 | Add "Add to watchlist" button/popover in TickerHeader using `BadgeSelect` (status/priority/tags inline; depends W0.1) | `web-app/src/components/ticker/ticker-header.tsx` | M | P1 |
| W5.2 | Fix textarea / input tokens (`border-input` → `border-border-subtle`, `bg-background` → `bg-surface`) | `web-app/src/components/ticker/personal-notes-widget.tsx` | S | P2 |
| W5.3 | Standardize hydration UI: skeleton or placeholder for TickerHeader / PersonalNotesWidget / TickerDispatches (one of: all show loader, all show null) | `web-app/src/components/ticker/ticker-header.tsx`, `web-app/src/components/ticker/personal-notes-widget.tsx`, `web-app/src/components/ticker/ticker-dispatches.tsx` | M | P2 |
| W5.4 | Add empty-state for TickerDispatches ("No dispatches mentioning {symbol} yet") instead of returning null | `web-app/src/components/ticker/ticker-dispatches.tsx` | S | P3 |
| W5.5 | Add `<section>` semantics + aria-labels to QuoteSummary + TickerDispatches containers | `web-app/src/components/ticker/quote-summary.tsx`, `web-app/src/components/ticker/ticker-dispatches.tsx` | S | P3 |
| W5.6 | Quick "Add to portfolio" shortcut on ticker page (button → opens portfolio form prefilled with symbol) | `web-app/src/components/ticker/ticker-header.tsx` | M | P3 |

### W6 — `/tickers`

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W6.1 | Enrich chip grid with snapshot data (name + last close + day Δ + sector color hint) — use `loadAllQuoteSnapshots()` | `web-app/src/app/tickers/page.tsx` | M | P2 |
| W6.2 | Promote `Chip` from `watchlist-filters.tsx` to `components/ui/chip.tsx`; reuse for `/tickers` sector + status filters | `web-app/src/components/ui/chip.tsx` (new), `web-app/src/components/watchlist/watchlist-filters.tsx`, `web-app/src/app/tickers/page.tsx` | M | P2 |
| W6.3 | Add text search input (substring on symbol or name) to `/tickers` | `web-app/src/app/tickers/page.tsx` | S | P3 |
| W6.4 | Add sort toggle (alpha / day Δ desc / day Δ asc / sector) | `web-app/src/app/tickers/page.tsx` | S | P3 |

### W7 — `/settings`

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W7.1 | Validate index symbols against `listQuoteSymbols()` (or `normalizeSymbol()`); reject unknown with visible feedback | `web-app/src/components/settings/dashboard-settings-panel.tsx` | S | P1 |
| W7.2 | Link `<label>` with `htmlFor` + input `id`; add IDs to Radio/Checkbox | `web-app/src/components/settings/dashboard-settings-panel.tsx` | M | P1 |
| W7.3 | Add success toast / "Saved" state after settings update | `web-app/src/components/settings/dashboard-settings-panel.tsx`, `web-app/src/components/settings/settings-actions.tsx` | M | P2 |
| W7.4 | Add export/import of all localStorage as JSON to Data section | `web-app/src/components/settings/settings-actions.tsx`, `web-app/src/lib/storage/export-import.ts` (new) | M | P2 |
| W7.5 | Confirmation dialog on "Reset to defaults" (depends W0.4) | `web-app/src/components/settings/dashboard-settings-panel.tsx` | S | P3 |
| W7.6 | Replace Checkbox hardcoded "Enabled/Disabled" with setting-specific labels | `web-app/src/components/settings/dashboard-settings-panel.tsx` | S | P2 |

### W8 — SPEC-023 Thesis system (new feature spec)

Structured stock research framework mirroring `docs/research-framework.md`. New `Thesis` (one per symbol) + `QuarterlyReview` (many per thesis) types. Trade plan zones visualised on `/ticker` price chart + dashboard "crossed zone" card. Active thesis indicators on `/watchlist` and `/portfolio`. "Copy to ChatGPT" markdown emitter. See `docs/specs/023-thesis-system.md` for full spec, AC, and risks.

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| W8.A | Domain types + stores + minimal form (§1 + §2) + `/research/thesis/[symbol]` route | `web-app/src/lib/domain/thesis.ts` (new), `web-app/src/lib/storage/thesis-store.ts` (new), `web-app/src/lib/storage/contracts.ts`, `web-app/src/components/research/thesis-form.tsx` (new), `web-app/src/app/research/thesis/[symbol]/page.tsx` (new) | L | P1 |
| W8.B | §4 Fundamentals + §5 Market position + §6 Valuation editors | `web-app/src/components/research/thesis-form.tsx` (sections), `web-app/src/lib/domain/thesis.ts` | M | P1 |
| W8.C | §7 Scenarios editor (5 rows + expected-value calc) | `web-app/src/components/research/scenarios-editor.tsx` (new), `web-app/src/components/research/thesis-form.tsx` | M | P1 |
| W8.D | §8 Light + checklists | `web-app/src/components/research/thesis-checklists.tsx` (new), `web-app/src/components/research/thesis-form.tsx` | M | P1 |
| W8.E | Trade-plan zones: PriceChart `referenceLines`, dashboard `CrossedZonesCard`, `lib/quotes/zones.ts` helper | `web-app/src/components/charts/sentiment-area-chart.tsx`, `web-app/src/components/dashboard/crossed-zones-card.tsx` (new), `web-app/src/lib/quotes/zones.ts` (new), `web-app/src/components/dashboard/dashboard-client.tsx` | M | P1 |
| W8.F | `QuarterlyReview` type + store + form + timeline | `web-app/src/lib/domain/quarterly-review.ts` (new), `web-app/src/lib/storage/quarterly-review-store.ts` (new), `web-app/src/components/research/quarterly-review-form.tsx` (new) | M | P2 |
| W8.G | "Copy to ChatGPT" markdown emitter + button | `web-app/src/lib/research/thesis-markdown.ts` (new), `web-app/src/components/research/thesis-form.tsx` (button) | S | P2 |
| W8.H | Active-thesis indicators on watchlist / portfolio / ticker | `web-app/src/components/watchlist/watchlist-table.tsx`, `web-app/src/components/portfolio/portfolio-table.tsx`, `web-app/src/components/ticker/ticker-header.tsx` | S | P2 |
| W8.I | Reference panel: §3 source hierarchy + §6 valuation methods as collapsible help | `web-app/src/components/research/research-help.tsx` (new), `web-app/src/app/research/page.tsx` | S | P3 |

**Sequencing inside W8:** W8.A first; W8.B/C/D follow on the same form (semi-sequential). W8.E/F/G/H/I parallelizable once W8.A lands.

### Carry-overs from earlier dashboard polish

| # | Task | Files | Effort | Priority |
|---|---|---|---|---|
| D.1 | `storage` event listener in `DashboardClient` for cross-tab settings sync | `web-app/src/components/dashboard/dashboard-client.tsx` | S | P3 |
| D.2 | Decide on `IndexPulseRow` clickability (`/ticker/{symbol}` for indices, or document the asymmetry) | `web-app/src/components/dashboard/index-pulse-row.tsx` | S | P3 |
| D.3 | Surface `EquityCurve.startDate` in the chart UI when trim kicks in | `web-app/src/components/dashboard/portfolio-equity-chart.tsx` | S | P3 |

### Parallelization map (which workstreams can run concurrently)

```
W0 ──┬─→ W1, W2, W3, W4, W5, W6, W7   (W0.1 unblocks W2.2, W3.4, W5.1)
     │                                  (W0.2 unblocks formatter migrations in W1.2 + W3 + dashboard)
     │                                  (W0.4 unblocks W4.4, W7.5)
W1 ─── concurrent with W2…W7
W2 ─── concurrent with W1, W3, W4, W5, W6, W7
W3 ─── concurrent with everything else
W4 ─── concurrent with W1, W2, W3, W5, W7
W5 ─── concurrent with W1, W2, W3, W4, W6, W7
W6 ─── concurrent with W1, W3, W4, W5, W7 (touches watchlist-filters via W6.2 — needs to coordinate with W2.5)
W7 ─── concurrent with everything else
```

**Coordination notes:**
- W6.2 promotes `Chip` from `watchlist-filters.tsx`; if W2.5 (filter focus ring) is in-flight, do W6.2 first or both touch the post-promotion file.
- W1.2 + W3 (formatter migration) all consume `lib/utils/format.ts` from W0.2 — land W0.2 first.
- After W0.1, W2.2 should be the first consumer to validate the contract before W3.4 and W5.1 pile on.
- **W8** is its own feature spec, mostly orthogonal to W1–W7. W8.E touches `dashboard-client.tsx` (new `CrossedZonesCard` mount) and `sentiment-area-chart.tsx` (adds `referenceLines` prop) — coordinate with anyone touching those files. W8.H lightly edits `watchlist-table.tsx`, `portfolio-table.tsx`, `ticker-header.tsx` — these collide with W2.4 (sortable watchlist columns) and W5.1 (Add-to-watchlist popover); sequence W8.H after those land.

### Åpne tråder fra før (carry forward)
- **Real-time / live ticker price** (SPEC-008 follow-up) — krever ekstern API-integrasjon; ikke prioritert.
- **v2 static root cleanup** (`index.html`, `today.html`, `reports.html`, `assets/`) — krever klassifiserings-godkjenning.

## Shipped 2026-05-15
- **Watchlist per-row inline edit** (SPEC-013 follow-up) — native-select først, deretter erstattet av custom `BadgeSelect` (portal + click-outside + Escape + scroll-to-close) fordi Chrome's native popup ignorerer `color-scheme` i dark mode.
- **SPEC-012 Supabase schema draft** — `docs/specs/012-supabase-schema.md` med DDL + RLS + sync-plan for 6 tabeller. Docs-only.
- **Light-mode palette** (ADR-007 follow-up) — Stitch-tokens nå variabel-indirekte; light og dark palette i `:root`/`.dark`. ThemeProvider mister `forcedTheme="dark"`, ny `ThemeToggle` i TopBar (Sun/Moon icon). Recharts `stroke` farger oppgradert til CSS-var.
- **migration/ folder cleanup** — 9 historiske web-next-filer slettet per ADR-006.
- **Native form-control theming** — `color-scheme: light|dark` på `:root`/`.dark`.
- **Collapsible sidebar** — AppShell client-komponent med `sidebar_collapsed` i localStorage; sidebar krymper til icon-only (`w-16`).
- **Watchlist filter chips** — `WatchlistFilters` med Status / Tags / Sector. AND-kombinert. Sector via `QuoteSnapshot.sector`.
- **Dashboard settings store** — `dashboard_settings` i localStorage; defaults i `lib/domain/dashboard-settings.ts`; `DashboardSettingsPanel` på `/settings`.
- **Day P&L %** — `PortfolioPnL.totalDayPnLPct` (gain mot gårsdagens portefølje-verdi); rendres både i topp-stat og per posisjon.
- **Top movers source-valg** — universe (default) eller watchlist; faller tilbake til universe når watchlist er tom. `limit * 2`-doblingen er borte; `limit` betyr nå totalt antall rader.
- **Hardcodes ut av cards** — `IndexPulseRow.symbols`, `TopMoversCard.{limit, exclude, includeOnly}`, `WatchlistImpactCard.highThresholdPct`, `equityChartCollapsed` drives nå alle av settings via `DashboardClient`-orchestratoren.
- **Portfolio equity chart** — collapsible (default skjult), 1M/3M/6M/YTD/1Y/3Y, Value/P&L view-toggle, gains-header (% + $) som matcher `/ticker`.
- **Chart primitives extracted** — `lib/quotes/chart-ranges.ts` + `components/charts/{range-pills,range-delta-header,sentiment-area-chart}.tsx`. Både `PriceChart` og `PortfolioEquityChart` komponert av disse. `price-chart.tsx` 189 → ~65 linjer.
- **Dashboard fixes** — equity chart bruker `EQUITY_RANGES` (cap 3Y) for å matche compact-daily lookback; `asOf` er nå `max(snapshots.asOf)` med staleness-chip (>3d); `buildEquityCurve` trim'er start til siste "first bar" så % over range alltid dekker full portefølje.

## P0 — Core product shell and data — ✅ done
1. ✅ SPEC-001 Shell + 6-route navigation (`5d6552d`)
2. ✅ SPEC-002 Static report indexes — strukturert payload (`abd102c`)
3. 🟡 SPEC-003 Dashboard latest/previous compare — owner codex-agent
4. ✅ SPEC-004 Watchlist local store (`8479a92`)
5. ✅ SPEC-005 Paste/import ticker parser (`167e06a`)
6. ✅ SPEC-006 Watchlist impact card on dashboard (`cd188b8`)

## P1 — User value expansion — ✅ done
7. ✅ SPEC-007 Ticker detail page + symbol search (`39c8472`)
8. ✅ SPEC-008 Portfolio local store + dashboard impact card (`5697971`)
9. ✅ SPEC-009 Notes/journal per ticker on `/ticker/[symbol]` (`52693e9`)

## P2 — Infra and future sync
10. ✅ SPEC-010 News adapter abstraction + LatestIntelligenceCard (`f0ce28d`)
11. ✅ SPEC-011 Stitch design integration — full lift (`ff8c2e3`, `718ec34`, `6557da4`, `5d799ec`, `84306d9`)
12. ⬜ SPEC-012 Supabase schema draft + optional sync plan (no runtime dep) — **next**
13. ✅ SPEC-013 Watchlist storage shape extension (status / priority / tags) — Brief Task 4.3 (`84306d9`)

## Pending mini-specs / follow-ups (no formal doc yet)
- See "Next session — queued" at the top of this file.

## Obsolete / superseded
- ~~**Yahoo / Google Finance news adapter** (SPEC-010 follow-up)~~ — SPEC-010 sunset under SPEC-022 (2026-05-10). News surface removed from app.

## Execution rules
- Én feature/spec per logisk commit; én spec per branch når praktisk (på `v3-revamp` har vi flere specs samlet — det er OK når de leveres som separate commits).
- AC må være testbar før implementasjon.
- Ingen merge uten lint/typecheck/test/build (der relevant).
- Oppdater `STATUS.md` i samme commit som spec-arbeidet.
- For Stitch-relaterte komponenter: les `design/stitch/README.md` §3-5 før du skriver ny UI — bruk eksisterende primitives heller enn å hardkode.

## Status legend
- ⬜ todo
- 🟡 in_progress / partially shipped
- ⛔ blocked
- ✅ done
