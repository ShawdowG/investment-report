# v3 Prioritized Backlog

Inkrementell leveringsrekkefølge. Sjekk `STATUS.md` for live-status før du henter neste oppgave.

## Current focus (2026-05-15)

P0 + P1 + P2 + v4 cockpit (SPEC-014–022) er ferdig. SPEC-003 og SPEC-010 sunset under SPEC-022. SPEC-012 levert som spec-doc. Alle formelle specs er nå avsluttet — produktet er i "polish + extend" -fase.

## Next session — queued

Page-by-page review er i gang. Dashboard ferdig (refining + extracting chart primitives). Neste på listen:

### Page review (continue)
- **`/research`** — review research dispatch surface (read, create, edit, delete, markdown rendering, cross-link til ticker).
- **`/watchlist`** — review inline edit + filters + impact card; nye observasjoner her etter dagens endringer.
- **`/portfolio`** — review add/remove flow, P&L math, missing-symbol handling.
- **`/strategies`** — review strategy definition, backtest engine, equity curve UI på strategy-siden (vurder reuse av nye `SentimentAreaChart`).
- **`/ticker/[symbol]`** — review chart + summary + notes + intelligence + dispatches surface.
- **`/tickers`** — review chip grid + search.
- **`/settings`** — review dashboard preferences panel + demo seed + clear-all.

### Dashboard polish (deferred during 2026-05-15 session)
- **Token consistency cleanup** — siste `text-muted-foreground` / `bg-muted` til Stitch-tokens (`text-text-secondary`, `bg-surface-variant`). Eksempler: `portfolio-impact-card.tsx` (kommentarer + body-tekst), `watchlist-view.tsx` (inline-code label).
- **Settings → dashboard live update** — `storage`-event-listener i `DashboardClient` så endringer i `/settings` (annen tab eller samme) reflekteres uten refresh.
- **Indices clickable** — `IndexPulseRow`-cellene mangler `/ticker/{symbol}`-link i motsetning til `TopMoversCard`. Avgjør om `^GSPC`/`^NDX`/etc skal få egne `/ticker`-sider, eller lev med den asymmetrien.
- **Settings symbol validation** — `DashboardSettingsPanel` index-symbol-feltet aksepterer alt. Sjekk mot `listQuoteSymbols()` (eller la index-symbols være read-only inntil pipeline-utvidelse).
- **Equity curve start annotation** — `buildEquityCurve.startDate` brukes ikke i UI ennå. Vurder å vise "Curve starts {date} (latest position-listing)" når trim faktisk kicker inn.

### Åpne tråder fra før
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
