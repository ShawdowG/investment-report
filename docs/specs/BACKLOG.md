# v3 Prioritized Backlog

Inkrementell leveringsrekkefølge. Sjekk `STATUS.md` for live-status før du henter neste oppgave.

## Current focus (2026-05-10)

Etter SPEC-004 + SPEC-005 + SPEC-011 (step 1) er to parallelle spor naturlige:

**Spor A — close the personal value loop:**
1. **SPEC-006** Watchlist impact vs latest report. Alle deps (002 + 004 + 005) er ✅. Dette er feature som leverer brief §3-verdien ("Which of my followed tickers are affected?"). Bør prioriteres høyere enn full Stitch-skinning fordi det gir umiddelbar produktverdi.

**Spor B — finish Stitch unification:**
2. **SPEC-011 step 2** Layout shell (AppShell / Sidebar / TopBar) — erstatt nåværende `navbar.tsx`. Berører alle ruter, så land før per-route feature-komponenter.
3. **SPEC-011 step 3** Composition primitives (TickerCell, MoverRow, DataTable wrapper).
4. **SPEC-011 step 4** Per-route feature components (Dashboard, Watchlist re-skin, Ticker, Portfolio).

Spor A er low-risk og gir verdi raskt. Spor B er foundation som låser opp visuell konsistens for alle senere features. Anbefalt: kjør Spor A først (enkelt scope, eksisterende primitiver er nok), deretter Spor B step 2 før Spor A SPEC-007.

## P0 — Core product shell and data
1. ✅ SPEC-001 Shell + 6-route navigation (`5d6552d`)
2. ✅ SPEC-002 Static report indexes — strukturert payload (`abd102c`)
3. 🟡 SPEC-003 Dashboard v3 (latest/previous compare) — owner codex-agent
4. ✅ SPEC-004 Watchlist local store (`8479a92`)
5. ✅ SPEC-005 Paste/import ticker parser (`167e06a`)
6. ⬜ SPEC-006 Watchlist impact vs latest report — **next P0, all deps met**

## P1 — User value expansion
7. ⬜ SPEC-007 Ticker detail page + symbol search (depends on SPEC-002)
8. ⬜ SPEC-008 Portfolio holdings local store + impact card (depends on SPEC-004 + SPEC-006)
9. ⬜ SPEC-009 Notes/journal per ticker (depends on SPEC-007)

## P2 — Infra and future sync
10. ⬜ SPEC-010 News adapter abstraction + confidence scoring
11. 🟡 SPEC-011 Stitch design integration — step 1 + core primitives ✅ (`ff8c2e3`); steps 2-4 pending. Owner claude-code.
12. ⬜ SPEC-012 Supabase schema draft + optional sync plan (no runtime dep)

## Execution rules
- Én feature/spec per logisk commit; én spec per branch når praktisk (på `v3-revamp` har vi flere specs samlet — det er OK når de leveres som separate commits).
- AC må være testbar før implementasjon.
- Ingen merge uten lint/typecheck/test/build (der relevant).
- Oppdater `STATUS.md` i samme commit som spec-arbeidet.
- For Stitch-relaterte komponenter: les `design/stitch/README.md` §4-5 før du skriver ny UI — bruk eksisterende primitives (Card, StatusBadge, RegimeDot, PriorityBadge, Tag, Sentiment, SectionHeader) heller enn å hardkode.

## Status legend
- ⬜ todo
- 🟡 in_progress / partially shipped
- ⛔ blocked
- ✅ done
