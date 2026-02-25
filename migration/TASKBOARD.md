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
- [x] M-17 | Eta   | P0 | Done | Parity check script (legacy vs Astro)
- [x] M-18 | G+E   | P0 | Done | Canary: 3-5 cron cycles parity pass
- [x] M-19 | Alpha | P1 | Done | Narrative QA on canary
- [x] M-20 | Beta  | P1 | Done | Tactical QA on canary
- [x] M-21 | Eta   | P0 | Done | Cutover to Astro production
- [x] M-22 | G+Epsi| P0 | Done | Post-cutover verification
- [x] M-23 | Eta   | P0 | Done | Rollback playbook doc
- [x] M-24 | Epsi  | P2 | Done | Visual regression snapshots
- [x] M-25 | Eta   | P1 | Done | Monitoring/alerts for stale data/build failures

## Progress log

- 2026-02-24: Initialized canonical taskboard source.
- 2026-02-24 22:45 CET: M-01→Done, M-02→Done, M-03→Done, M-04→Done (schema spec, examples, validator, CI gate).
- 2026-02-24 22:50 CET: M-05→Done, M-06→Done, M-07→Done (`migration/REQUIREMENTS.md`, `migration/COMPONENT_MAPPING.md`).
- 2026-02-24 22:55 CET: M-08→Done, M-09→Done (created `web-next` Astro static scaffold + JSON/MD data loaders).
- 2026-02-24 23:00 CET: M-10→Done (added GitHub Pages preview target via `.github/workflows/web-next-preview.yml` + `migration/PREVIEW_DEPLOY.md`).
- 2026-02-24 23:05 CET: M-11→Done, M-12→Done (implemented `HeaderBar`, `TimeRangePicker`, and `MarketPulse` in `web-next/src/components`, wired on index page).
- 2026-02-24 23:10 CET: M-13→Done, M-14→Done (added `TickerTable` with collapse/sort controls and `DiscussionPanel`, both wired into `web-next/src/pages/index.astro`).
- 2026-02-24 23:15 CET: M-15→Done, M-16→Done (added `NewsMoversTable` and adapter utilities `web-next/src/lib/adapters.js` for symbol fallback + sorting/news derivation).
- 2026-02-24 23:20 CET: M-17→Done (added `scripts/parity-check.js`, parity pass OK: 21/21 md+html+index), M-18→InProgress (canary cycle 1/3 started).
- 2026-02-24 23:25 CET: M-18→Done (canary cycles 2/3 and 3/3 passed; parity OK each run), M-19→Done (narrative QA: summary/regime present, alpha=3, pulse present), M-20→Done (tactical QA: beta=3, movers=23, tactical fields valid).
- 2026-02-24 23:30 CET: M-21→Done (production cutover workflow added: `.github/workflows/web-next-production.yml`), M-23→Done (`migration/ROLLBACK_PLAYBOOK.md`), M-24→Done (`scripts/visual-regression-snapshot.js` + `migration/visual-regression/latest.json`), M-25→Done (`scripts/monitor-health.js` + `.github/workflows/monitor-health.yml`), M-22→Blocked (post-cutover local build verification blocked by npm registry connectivity).
- 2026-02-24 23:36 CET: M-22→Done (retry succeeded: `npm install`, `astro build`, `node scripts/post-cutover-verify.js` => `POST_CUTOVER_OK`).

## UI/Data refinement sprint (2026-02-25)

- [x] T-01 | Gamma | P0 | Done | Fill real Δ$ in ticker table from snapshot math
- [x] T-02 | Epsilon | P1 | Done | Clarify movement pill semantics (arrow + signed %)
- [x] T-03 | Alpha+Gamma | P0 | Done | Remove duplicate ticker data in report page
- [x] T-04 | Gamma | P1 | Done | Redesign Gamma Data Pack into compact signal panel
- [x] T-05 | Epsilon | P1 | Done | Improve report body readability to match main UI

Progress log:
- 2026-02-25: Started refinement sprint, T-01 in progress.
- 2026-02-25 10:15 CET: T-01→Done, T-02→Done, T-03→Done, T-04→Done, T-05→Done (Δ$ math wired across table renderers, movement pills standardized with flat state, report pages de-duplicated by removing inline GAMMA table and adding compact signal panel, report-body markdown/table readability upgraded).

## Revamp backlog (2026-02-25 PM)

- [ ] R-01 | Alpha | P0 | InProgress | Unify information hierarchy: Pulse -> Takeaway -> Alpha/Beta -> Tickers -> News
- [ ] R-02 | Epsi  | P1 | Todo | Improve table density/legibility (sticky header, row spacing, numeric alignment)
- [ ] R-03 | Gamma | P0 | Todo | Add reliable Δ$ source field from snapshot (avoid derived approximation when possible)
- [ ] R-04 | Eta   | P1 | Todo | Add schema field for `changeAbs` + CI gate for missing mover fields
- [ ] R-05 | Alpha | P1 | Todo | Rewrite summary/discussion templates for less generic language
- [ ] R-06 | Epsi  | P1 | Todo | Report page cleanup: collapse raw blocks, keep one canonical data view
- [ ] R-07 | Beta  | P1 | Todo | Add tactical quick-panel (risk posture, trigger, invalidation)
- [ ] R-08 | Gamma | P1 | Todo | Direct source-link quality improvement (prefer direct publisher links)

Progress log:
- 2026-02-25: Added revamp backlog R-01..R-08.
- 2026-02-25: R-01 moved to InProgress (hierarchy pass started).
