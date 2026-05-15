# v3 Prioritized Backlog

Inkrementell leveringsrekkefølge. Sjekk `STATUS.md` for live-status før du henter neste oppgave.

## Current focus (2026-05-15)

P0 + P1 + P2 + v4 cockpit (SPEC-014–022) er ferdig. SPEC-003 og SPEC-010 sunset under SPEC-022. SPEC-012 levert som spec-doc. Alle formelle specs er nå avsluttet — produktet er i "polish + extend" -fase.

Åpne tråder:
- **Real-time / live ticker price** (SPEC-008 follow-up) — krever ekstern API-integrasjon; ikke prioritert.
- **v2 static root cleanup** (`index.html`, `today.html`, `reports.html`, `assets/`) — krever klassifiserings-godkjenning.

Shipped 2026-05-15:
- **Watchlist per-row inline edit** (SPEC-013 follow-up) — native-select overlay på Status/Priority badges, click-to-edit tekstinput for Tags.
- **SPEC-012 Supabase schema draft** — `docs/specs/012-supabase-schema.md` med DDL + RLS + sync-plan for 6 tabeller. Docs-only.
- **Light-mode palette** (ADR-007 follow-up) — Stitch-tokens nå variabel-indirekte; light og dark palette i `:root`/`.dark`. ThemeProvider mister `forcedTheme="dark"`, ny `ThemeToggle` i TopBar (Sun/Moon icon).
- **migration/ folder cleanup** — 9 historiske web-next-filer slettet per ADR-006.
- **Native form-control theming** — `color-scheme: light|dark` på `:root`/`.dark` for å hjelpe native form controls følge temaet. Chrome's `<select>` popup ignorerer hintet → erstattet med custom `BadgeSelect`-dropdown (portal + click-outside + Escape + scroll-to-close) i watchlist-tabellen.
- **Collapsible sidebar** — AppShell client-komponent med `sidebar_collapsed` i localStorage; sidebar krymper til icon-only (`w-16`); toggle via PanelLeft-ikon i bunnen av sidebaren.
- **Watchlist filter chips** — `WatchlistFilters` komponent med Status (radio), Tags (multi), Sector (multi). AND-kombinert. Sector hentes fra `QuoteSnapshot.sector` (tilføyd fra `meta.sector`). Empty state for "filter matcher ingenting".

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
- **Real-time / live ticker price** (SPEC-008 follow-up): now partly covered by SPEC-014 quote pipeline (daily close). Intraday/live would still need external integration.

## Shipped follow-ups
- **Watchlist per-row inline edit** (SPEC-013 follow-up, 2026-05-15): native-select overlay på Status/Priority + click-to-edit tags input. Bruker eksisterende `updateWatchlistItem` fra storage. Ingen nye deps.
- **Light-mode palette** (ADR-007 follow-up, 2026-05-15): Stitch-tokens nå variabel-indirekte via `--st-*` i `:root` (light) og `.dark`. Light palette: hvite surfaces, slate-900 tekst, blå/grønn/rød med mer kontrast. ThemeProvider mister `forcedTheme="dark"`, `enableSystem` aktivert. Ny `ThemeToggle` (Sun/Moon) i TopBar bytter via `next-themes`. Recharts `stroke` hardkodete farger oppgradert til CSS-var.
- **migration/ folder cleanup** (2026-05-15): slettet 9 web-next-era filer (COMPONENT_MAPPING, PREVIEW_DEPLOY, REQUIREMENTS, ROLLBACK_PLAYBOOK, SCHEMA, TASKBOARD, examples/, visual-regression/) per ADR-006. Ingen kode referete dem.

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
