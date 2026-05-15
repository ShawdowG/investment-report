# [SPEC-025] ChatGPT Response Import (Smart Paste-back into Thesis Fields)

## 1. Context
SPEC-023 includes a one-way "Copy to ChatGPT" button that emits a markdown blob (structured thesis + §10 prompt) for the user to paste into ChatGPT. The other direction — pasting the response *back* into the app — is just a free-form `analysisNotes` blob today. That breaks the structure the framework worked hard to establish.

The user's framework expects ChatGPT to output content in named sections that mirror the form (bull case, bear case, scenarios, fundamentals, etc.). If we parse those sections back into the structured fields, the thesis stays queryable and the user doesn't have to re-type anything.

## 2. Problem
- Without a parser, the round-trip is asymmetric: structured → ChatGPT → flat blob. The framework's value (queryability, light-driven decisions, scenario fan strip) breaks the moment the LLM response lands.
- Manual re-keying of ChatGPT output into 20+ fields is the obvious friction point that kills the workflow's adoption.

## 3. Scope

### In scope
- Paste-back UI inside the thesis form: a textarea with a "Try to import" button.
- Parser that recognizes common ChatGPT markdown output shapes and extracts:
  - Bull-case / bear-case bullets → `thesisPoints` / `concerns` fields.
  - Fundamentals table or section → `fundamentals.*` fields.
  - Scenarios table or "Worst case / Base case / Better case" headings → `scenarios[]` rows.
  - Green / yellow / red checklist items → check states.
  - Valuation assumptions → `valuation.*` fields.
- **Confidence indicator** after parsing: "Imported 14 fields automatically, 3 fields kept as free notes". User reviews and accepts/overrides before saving.
- **Diff preview** — before applying, show "this would overwrite §4 fundamentals (current value: 'X') with 'Y'". User can per-field accept or skip.
- Fall-through: anything the parser can't classify lands in `analysisNotes` as raw markdown.

### Out of scope
- Direct ChatGPT API integration (still copy-paste boundary).
- AI-driven extraction (no LLM call to parse; pure regex/heuristic).
- Importing files (PDFs, images) — see SPEC-027.
- Overriding structured fields without user review (always require accept).
- Smart merging of bullets (parser may produce duplicate bullets if user runs import twice; user manually dedupes).

## 4. User stories
- As a thesis author, after running the "Copy to ChatGPT" prompt and getting a response, I want one click to push the answer back into my structured fields without re-keying.
- As a thesis author, I want to see what the parser is about to overwrite before it commits, so I don't lose hand-written content.
- As a thesis author, I want unparseable content to land somewhere visible (analysisNotes), not silently dropped.

## 5. Data contracts

```ts
// lib/research/thesis-import.ts

export interface ParsedThesisFragment {
  // Sparse subset of Thesis fields that the parser was confident about
  thesisPoints?: string[];
  concerns?: Partial<Concerns>;
  fundamentals?: Partial<FundamentalsSnapshot>;
  marketPosition?: Partial<MarketPositionNotes>;
  valuation?: Partial<ValuationNotes>;
  scenarios?: Partial<Scenario>[];   // sparse, indexed by kind
  classifiedPoints?: ClassifiedThesisPoint[];
  greenChecks?: boolean[];
  yellowChecks?: boolean[];
  redChecks?: boolean[];
  trimSellChecks?: boolean[];
}

export interface ImportReport {
  parsed: ParsedThesisFragment;
  unmatched: string;    // markdown sections we couldn't classify
  matchedFieldCount: number;
  totalFieldCount: number;
  warnings: string[];   // e.g. "scenario 'Worst case' had no price target"
}

export function parseChatGPTResponse(markdown: string): ImportReport;
```

The parser is heuristic, not validated. It looks for:
- Headings matching framework section names (`## Bull case`, `## Bear case`, `## Scenarios`, `## Fundamentals`, `## Valuation`).
- Tables with the framework's column shapes (Scenarios: kind | business | valuation | price | probability).
- Bullet lists under known sections.
- "Green light" / "Yellow light" / "Red light" checklists with `[x]` / `[ ]` markers.

## 6. UX notes
- Thesis form has a new collapsible section: **"Import ChatGPT response"**.
- Inside: a textarea for the LLM markdown + a "Try to import" button.
- After clicking, show:
  - Top: summary card ("Imported 14 of 28 fields — review below").
  - Per-section diff: existing value (muted) → proposed value (highlighted). Per-row "Accept" / "Skip" buttons. "Accept all" at top.
  - Unmatched content appears at the bottom in a collapsed "Free-form notes" block. User can "Append to analysisNotes" or "Move to a new ResearchNote".
- After applying, the import textarea clears and the form reflects new values. User must still hit "Save thesis" to persist.

## 7. Acceptance criteria
- [ ] AC1: Pasting the example ChatGPT response from `docs/research-framework.md §10` produces a non-empty `parsed.thesisPoints` and `parsed.scenarios`.
- [ ] AC2: For each parsed field, the user sees the proposed change next to the current value before applying.
- [ ] AC3: Unmatched content lands in either `analysisNotes` (append) or a new `ResearchNote` (user choice) — never silently dropped.
- [ ] AC4: Running the same import twice doesn't duplicate fields the user already accepted (idempotency: matched fields show "unchanged" the second time).
- [ ] AC5: `npm run build` passes. Parser has unit tests for happy path + 3 malformed inputs.

## 8. Test plan
- **Unit:** parser tests with 5+ fixtures (canonical ChatGPT output, abbreviated output, mixed-format output, output with extra prose, output with no recognizable structure).
- **Component:** import diff UI shows expected old/new pairs.
- **Manual:** run the §10 prompt against ChatGPT for one real ticker, paste the response, verify ≥60% of fields land in structured slots.

## 9. Rollout plan
- Phase W9.A: parser + unit tests (no UI).
- Phase W9.B: import UI inside thesis form, with diff preview.
- Phase W9.C: edge cases — append vs new note for unmatched content, "Accept all" UX.

No feature flag — purely additive. If the parser is unreliable in early use, the textarea + manual copy into fields is the fallback.

## 10. Risks
- **Risiko:** ChatGPT output drifts between runs (different formatting, headings, etc.). Parser breaks silently.
  **Mitigasjon:** Accept partial parses gracefully. Always show the "imported X of Y" count so user knows when something is off. Unparsed content always lands somewhere visible.
- **Risiko:** Parser overwrites hand-edited content the user didn't want to change.
  **Mitigasjon:** Diff preview is mandatory; nothing applies without explicit user accept.
- **Risiko:** User runs the import expecting AI quality, gets a regex result, is disappointed.
  **Mitigasjon:** Set expectations in the button label ("Try to import") and import card caption ("Heuristic parser — review before saving").
