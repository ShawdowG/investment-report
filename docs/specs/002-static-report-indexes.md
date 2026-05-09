# [SPEC-002] Static Report Indexes — Structured Payload

## 1. Context
Earlier work shipped the lightweight index files (`data/latest.json`, `data/reports-lite.json`, `data/by-date/`, `data/by-ticker/`) so the v3 dashboard could be built without crawling the markdown archive at runtime. STATUS.md marked SPEC-002 ✅ done at commit `99f6eea` (2026-05-07).

Reality check on 2026-05-09: `data/latest.json` does include `sections.{gamma,alpha,beta,pulse}` and `movers[]`, but **the dashboard never reads them**. `web-app/src/app/page.tsx` re-loads the markdown source at build time and re-extracts sections via heading match. That defeats the purpose of the indexes — every cosmetic rename in `generate-report.py` will silently break the dashboard.

This spec retroactively documents SPEC-002 and finishes the work it was meant to deliver.

## 2. Problem
The dashboard parses markdown sections at render time using fragile string matching. Several pieces of structured data the dashboard needs (`mainDriver`, `posture`, `discussion.{agreement,disagreement,resolution}`, `catalysts`) are not exposed in the JSON payload at all, even though they are deterministic outputs of the rule-based generator and trivially derivable from the markdown.

## 3. Scope

### In scope
- Extend `scripts/build-index.js` to extract:
  - `mainDriver` — value of the `- **Main driver:** …` body line
  - `posture` — value of the `- **Posture:** …` body line
  - `discussion: { agreement, disagreement, resolution }` — bullets in `## 4) Agent Discussion`
  - `catalysts: { [ticker]: headline }` — bullets in `## 7) Catalyst Signals`
  - `sections.checklist` — Section 5 bullets (the dashboard already needs these; they are currently mis-sourced from a non-existent Section 0)
- Extend `web-app/src/types/reports.ts` so `ReportItem` covers the new optional fields
- Rewrite `web-app/src/app/page.tsx` to consume the structured payload instead of `loadReportMarkdown` + `extractSection`. Drop the imports that are no longer needed
- Regenerate `data/latest.json`, `data/search-index.json`, `data/reports-lite.json`, `data/by-date/`, `data/by-ticker/` by running `node scripts/build-index.js`
- Update `docs/specs/STATUS.md` SPEC-002 row with the new commit hash and date

### Out of scope
- Restructuring the existing `sections.{gamma,alpha,beta,pulse}` shape (kept as raw bullet lines for back-compat with the static HTML side that consumes `data/search-index.json` via `assets/app.js`)
- Modifying `scripts/generate-report.py` markdown output format
- Per-ticker mention metadata enrichment in `data/by-ticker/*.json` — covered by future SPEC-007
- Sector reads as structured fields — not present in current markdown; tracked separately when the markdown gains a structured GAMMA payload section
- Restoring the static-HTML-side dashboard (`index.html`) to use the new fields — separate concern

## 4. User stories
- As the v3 dashboard, I want a single JSON file (`data/latest.json`) that contains every field I render, so I do not need to read or parse markdown at build time.
- As a future agent picking up this work, I want one place (`build-index.js`) where every report-derived field is computed, so I can add a new field without touching the dashboard.

## 5. Functional requirements
- FR1: `data/latest.json` exposes top-level `mainDriver`, `posture`, `discussion`, `catalysts`, and `sections.checklist` when the source markdown contains them.
- FR2: `web-app/src/app/page.tsx` does not import `loadReportMarkdown`, `parseFrontmatter`, or `extractSection`.
- FR3: The structured fields are emitted on every item in `data/search-index.json` (not just `data/latest.json`), so per-date and per-ticker views can use them later without re-running extraction.
- FR4: When a field cannot be parsed (e.g. a report without Section 4), the field is the empty string / empty object. No nulls bleed into render code as exceptions.

## 6. Non-functional requirements
- Build-index.js stays a single file; no new module split for this spec.
- Parser regexes are anchored to the exact bold-prefix format produced by `generate-report.py` to keep the contract explicit.
- Existing static HTML output (`reports/html/*.html`, `index.html`) is byte-stable apart from the regenerated index timestamp and the new fields appearing in `data/search-index.json`.

## 7. Data contracts
```ts
ReportItem extends previous shape with:
  mainDriver?: string
  posture?: string
  sections?: {
    gamma?: string[]
    alpha?: string[]
    beta?: string[]
    pulse?: string[]      // legacy; reports do not currently emit Section 0
    checklist?: string[]  // Section 5 — what the dashboard actually wants
  }
  movers?: Mover[]
  discussion?: { agreement: string; disagreement: string; resolution: string }
  catalysts?: Record<string, string>  // ticker → headline
```

## 8. UX notes
No user-visible UX change. Dashboard renders the same content it tried to render before, but reliably. If a section is missing in source markdown, the corresponding panel renders the existing empty/fallback state.

## 9. Acceptance criteria
- [ ] AC1: `data/latest.json` after regeneration contains non-empty `mainDriver`, `posture`, `discussion.agreement`, `discussion.disagreement`, `discussion.resolution`, and `catalysts` for the latest report.
- [ ] AC2: `web-app/src/app/page.tsx` does not call `loadReportMarkdown`, `parseFrontmatter`, or `extractSection`.
- [ ] AC3: `web-app/src/types/reports.ts` `ReportItem` covers the new optional fields.
- [ ] AC4: `npm run build` in `web-app/` passes (typecheck + Next static export).
- [ ] AC5: `reports/html/2026-05-06-us-open.html` (existing report HTML) renders the same content as before.
- [ ] AC6: STATUS.md SPEC-002 row updated with new commit hash + date.

## 10. Test plan
- **Smoke / unit-ish**: re-run `node scripts/build-index.js`; jq the new fields out of `data/latest.json` to confirm shape.
- **Typecheck**: `cd web-app && npx tsc --noEmit` passes.
- **Build**: `cd web-app && npm run build` passes and emits the dashboard with the new structured-fed content.
- **Regression**: diff one of the per-report HTML outputs (`reports/html/2026-05-06-us-open.html`) before/after to verify byte-stability except for any timestamp.

## 11. Rollout plan
- Single commit. No flag, no migration. Regenerated index files land alongside code changes.
- Rollback = revert the commit; index regenerates next cron run.

## 12. Risks
- **Risk**: parser patterns drift if `generate-report.py` changes the bold-prefix format.
  **Mitigation**: regex anchors are explicit (`- **Label:**`) and unlikely to be touched without notice; AC1 catches it.
- **Risk**: duplicating field names across `meta` (frontmatter) and the parsed body fields could create source-of-truth ambiguity later (e.g. if `regime` ever drifts between the two).
  **Mitigation**: build-index.js prefers frontmatter for `regime`; parsed body fields are only consulted for fields the frontmatter does not yet carry. Future work can promote `mainDriver` and `posture` into frontmatter if useful.
