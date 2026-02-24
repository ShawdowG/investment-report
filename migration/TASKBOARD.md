# Investment Report Migration Taskboard

Canonical source for task IDs/status: this file (`migration/TASKBOARD.md`).

Status: Todo | InProgress | Blocked | Done

## Tasks

- [x] M-01 | Gamma | P0 | Done | Define schema v1 (`search-index`, frontmatter, movers/news rows)
- [x] M-02 | Gamma | P0 | Done | Create `SCHEMA.md` + example payloads
- [x] M-03 | Gamma | P0 | Done | Add `scripts/validate-schema.js`
- [x] M-04 | Eta   | P0 | Done | Add CI gate for schema validation
- [x] M-05 | Alpha | P0 | Done | Define required narrative fields
- [x] M-06 | Beta  | P0 | Done | Define required tactical fields
- [x] M-07 | Epsi  | P0 | Done | Field-to-component mapping matrix
- [x] M-08 | Epsi  | P0 | Done | Scaffold Astro app (`web-next` static mode)
- [x] M-09 | Gamma | P0 | Done | Wire data loaders from existing JSON/MD
- [x] M-10 | Eta   | P0 | Done | Setup preview deployment target
- [x] M-11 | Epsi  | P1 | Done | Build `HeaderBar` + `TimeRangePicker`
- [x] M-12 | Epsi  | P1 | Done | Build `MarketPulse`
- [x] M-13 | Epsi  | P1 | Done | Build `TickerTable` (collapse/sort)
- [x] M-14 | Epsi  | P1 | Done | Build `DiscussionPanel`
- [x] M-15 | Epsi  | P1 | Done | Build `NewsMoversTable`
- [x] M-16 | Gamma | P1 | Done | Adapter utilities (sorting/fallbacks)
- [ ] M-17 | Eta   | P0 | Todo | Parity check script (legacy vs Astro)
- [ ] M-18 | G+E   | P0 | Todo | Canary: 3-5 cron cycles parity pass
- [ ] M-19 | Alpha | P1 | Todo | Narrative QA on canary
- [ ] M-20 | Beta  | P1 | Todo | Tactical QA on canary
- [ ] M-21 | Eta   | P0 | Todo | Cutover to Astro production
- [ ] M-22 | G+Epsi| P0 | Todo | Post-cutover verification
- [ ] M-23 | Eta   | P0 | Todo | Rollback playbook doc
- [ ] M-24 | Epsi  | P2 | Todo | Visual regression snapshots
- [ ] M-25 | Eta   | P1 | Todo | Monitoring/alerts for stale data/build failures

## Progress log

- 2026-02-24: Initialized canonical taskboard source.
- 2026-02-24 22:45 CET: M-01→Done, M-02→Done, M-03→Done, M-04→Done (schema spec, examples, validator, CI gate).
- 2026-02-24 22:50 CET: M-05→Done, M-06→Done, M-07→Done (`migration/REQUIREMENTS.md`, `migration/COMPONENT_MAPPING.md`).
- 2026-02-24 22:55 CET: M-08→Done, M-09→Done (created `web-next` Astro static scaffold + JSON/MD data loaders).
- 2026-02-24 23:00 CET: M-10→Done (added GitHub Pages preview target via `.github/workflows/web-next-preview.yml` + `migration/PREVIEW_DEPLOY.md`).
- 2026-02-24 23:05 CET: M-11→Done, M-12→Done (implemented `HeaderBar`, `TimeRangePicker`, and `MarketPulse` in `web-next/src/components`, wired on index page).
- 2026-02-24 23:10 CET: M-13→Done, M-14→Done (added `TickerTable` with collapse/sort controls and `DiscussionPanel`, both wired into `web-next/src/pages/index.astro`).
- 2026-02-24 23:15 CET: M-15→Done, M-16→Done (added `NewsMoversTable` and adapter utilities `web-next/src/lib/adapters.js` for symbol fallback + sorting/news derivation).
