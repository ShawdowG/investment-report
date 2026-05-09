# v3 Prioritized Backlog

Inkrementell leveringsrekkefølge. Sjekk `STATUS.md` for live-status før du henter neste oppgave.

## Current focus (2026-05-10, end of day)

P0 + Stitch foundation er ferdig. Tre spor å velge fra som "next":

**Spor A — finish Stitch (SPEC-011 step 4 + follow-ups):**
1. **Watchlist re-skin** for å matche Stitch `watchlist.html`. Krever Brief Task 4.3 (status / priority / tags i `WatchlistItem`) først — separate mini-spec for storage-shape utvidelse, ellers blir re-skin bare visuell.
2. **Mobile sidebar drawer** — slide-in panel for narrow viewports. Liten, isolert.
3. **Ticker detail re-skin + Portfolio re-skin** — avhenger av at SPEC-007 og SPEC-008 lander først.

**Spor B — P1 user value:**
4. **SPEC-007** Ticker detail page (`/ticker/[symbol]`) + symbol search. Konsumerer `data/by-ticker/SYMBOL.json`. Låser opp search-input i TopBar (currently visual-only).
5. **SPEC-008** Portfolio local store + dashboard impact card. Samme mønster som SPEC-004/006 men for owned positions.
6. **SPEC-009** Notes/journal per ticker — depends on SPEC-007.

**Spor C — Infra:**
7. **SPEC-010** News adapter abstraction.
8. **SPEC-012** Supabase schema draft (no runtime dep).

Anbefalt sekvens: SPEC-007 (gir søk + ticker detail = stor brukervekt) → mobile drawer (lille, polish) → SPEC-008 (low-friction når 007 lander) → watchlist re-skin (etter at storage-utvidelses-spec lander).

## P0 — Core product shell and data
1. ✅ SPEC-001 Shell + 6-route navigation (`5d6552d`)
2. ✅ SPEC-002 Static report indexes — strukturert payload (`abd102c`)
3. 🟡 SPEC-003 Dashboard v3 (latest/previous compare) — owner codex-agent
4. ✅ SPEC-004 Watchlist local store (`8479a92`)
5. ✅ SPEC-005 Paste/import ticker parser (`167e06a`)
6. ✅ SPEC-006 Watchlist impact vs latest report (`cd188b8`)

## P1 — User value expansion
7. ⬜ SPEC-007 Ticker detail page + symbol search (depends on SPEC-002)
8. ⬜ SPEC-008 Portfolio holdings local store + impact card (depends on SPEC-004 + SPEC-006)
9. ⬜ SPEC-009 Notes/journal per ticker (depends on SPEC-007)

## P2 — Infra and future sync
10. ⬜ SPEC-010 News adapter abstraction + confidence scoring
11. 🟡 SPEC-011 Stitch design integration:
    - step 1 tokens + core primitives ✅ (`ff8c2e3`)
    - step 2 layout shell ✅ (`718ec34`)
    - step 3 composition primitives (TickerCell, MoverRow) ✅ (`6557da4`); IconButton + DataTable deferred
    - step 4 per-route re-skin: Dashboard top bento ✅ (`5d799ec`); Watchlist + Ticker + Portfolio pending
    - mobile sidebar drawer ⬜
    - Owner claude-code
12. ⬜ SPEC-012 Supabase schema draft + optional sync plan (no runtime dep)

## Pending mini-specs (no formal doc yet)
- **Watchlist storage shape extension** (Brief Task 4.3): add `status`, `priority`, `tags?` fields to `WatchlistItem`. Required before watchlist re-skin matches Stitch.
- **Light-mode palette** (ADR-007 follow-up): Stitch is dark-only. Either drop the toggle or design a light palette.
- **migration/ folder cleanup**: historical web-next migration docs/baselines, kept post-ADR-006. Safe to delete when convenient.

## Execution rules
- Én feature/spec per logisk commit; én spec per branch når praktisk (på `v3-revamp` har vi flere specs samlet — det er OK når de leveres som separate commits).
- AC må være testbar før implementasjon.
- Ingen merge uten lint/typecheck/test/build (der relevant).
- Oppdater `STATUS.md` i samme commit som spec-arbeidet.
- For Stitch-relaterte komponenter: les `design/stitch/README.md` §3-5 før du skriver ny UI — bruk eksisterende primitives (Card, StatusBadge, RegimeDot, PriorityBadge, Tag, Sentiment, SectionHeader, TickerCell, MoverRow) heller enn å hardkode.

## Status legend
- ⬜ todo
- 🟡 in_progress / partially shipped
- ⛔ blocked
- ✅ done
