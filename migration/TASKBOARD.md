# Investment Report Migration Taskboard

Canonical source for task IDs/status: this file (`migration/TASKBOARD.md`).

Status: Todo | InProgress | Blocked | Done

## Tasks

- [ ] M-01 | Gamma | P0 | Todo | Define schema v1 (`search-index`, frontmatter, movers/news rows)
- [ ] M-02 | Gamma | P0 | Todo | Create `SCHEMA.md` + example payloads
- [ ] M-03 | Gamma | P0 | Todo | Add `scripts/validate-schema.js`
- [ ] M-04 | Eta   | P0 | Todo | Add CI gate for schema validation
- [ ] M-05 | Alpha | P0 | Todo | Define required narrative fields
- [ ] M-06 | Beta  | P0 | Todo | Define required tactical fields
- [ ] M-07 | Epsi  | P0 | Todo | Field-to-component mapping matrix
- [ ] M-08 | Epsi  | P0 | Todo | Scaffold Astro app (`web-next` static mode)
- [ ] M-09 | Gamma | P0 | Todo | Wire data loaders from existing JSON/MD
- [ ] M-10 | Eta   | P0 | Todo | Setup preview deployment target
- [ ] M-11 | Epsi  | P1 | Todo | Build `HeaderBar` + `TimeRangePicker`
- [ ] M-12 | Epsi  | P1 | Todo | Build `MarketPulse`
- [ ] M-13 | Epsi  | P1 | Todo | Build `TickerTable` (collapse/sort)
- [ ] M-14 | Epsi  | P1 | Todo | Build `DiscussionPanel`
- [ ] M-15 | Epsi  | P1 | Todo | Build `NewsMoversTable`
- [ ] M-16 | Gamma | P1 | Todo | Adapter utilities (sorting/fallbacks)
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
