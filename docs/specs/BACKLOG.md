# v3 Prioritized Backlog

Inkrementell leveringsrekkefølge. Sjekk `STATUS.md` for live-status før du henter neste oppgave.

## Current focus (2026-05-11)

P0 + P1 + P2 + v4 cockpit (SPEC-014–022) er ferdig. SPEC-003 og SPEC-010 sunset under SPEC-022. Eneste åpne core-spec er **SPEC-012 (Supabase schema draft)** — no-runtime-dep, ikke blokkerende.

Åpne tråder (queued for pickup):
- **SPEC-012 Supabase schema draft** — skriv `docs/specs/012-supabase-schema.md` (tables for watchlist, portfolio, notes, quotes, research, strategies). No runtime code.
- **Watchlist per-row inline edit** (SPEC-013 follow-up) — inline dropdowns for status / priority / tags på `/watchlist`.
- **Light-mode palette** (ADR-007 follow-up) — design light variant for Stitch tokens + wire opp theme toggle. Bekreftet 2026-05-11: skal designes, ikke droppes.
- **migration/ folder cleanup** — 9 historiske web-next-filer, safe å slette per ADR-006.

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
- **Light-mode palette** (ADR-007 follow-up): design light variant — confirmed 2026-05-11.
- **Watchlist per-row inline edit** (SPEC-013 follow-up): inline dropdowns instead of remove+re-add.
- **migration/ folder cleanup**: 9 historical web-next files, safe to delete post-ADR-006.
- **Real-time / live ticker price** (SPEC-008 follow-up): now partly covered by SPEC-014 quote pipeline (daily close). Intraday/live would still need external integration.

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
