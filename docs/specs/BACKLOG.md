# v3 Prioritized Backlog

Dette er prioritert rekkefølge for inkrementell levering.

## P0 — Core product shell and data
1. SPEC-002: Koble frontend til `data/latest.json` + `data/reports-lite.json`.
2. SPEC-003: Dashboard v3 med latest/previous compare og fallback states.
3. SPEC-004: Watchlist local store (create/add/remove/persist).
4. SPEC-005: Ticker paste/import parser + normalize + unknown bucket.
5. SPEC-006: Watchlist impact-modul med attention levels.

## P1 — User value expansion
6. SPEC-007: Ticker detail page + symbol search.
7. SPEC-008: Portfolio holdings local store + impact kort.
8. SPEC-009: Notes/journal per ticker.

## P2 — Infra and future sync
9. SPEC-010: News adapter abstraction + confidence scoring.
10. SPEC-011: Stitch design integration (token mapping + incremental layout alignment).
11. SPEC-012: Supabase schema draft + optional sync plan (no runtime dependency).

## Execution rules
- Én spec per branch.
- AC må være testbar før implementasjon.
- Ingen merge uten lint/typecheck/test/build (der relevant).
- Oppdater `STATUS.md` i samme PR som spec-arbeidet.
