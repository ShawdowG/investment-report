# [SPEC-028] Guided Wizard for Thesis Authoring

## 1. Context
SPEC-023 ships a powerful thesis form with three coexisting modes today:
- **Quick start** — ticker + 3-bullet thesis + 3 add levels + max position. Saveable in 60 seconds, but doesn't capture the framework's rigor.
- **Deep dive** — all framework sections (Fundamentals, Market position, Valuation, Scenarios, Light + checklists, Notes, Analysis notes) collapsed by default. Powerful but overwhelming — the user sees a wall of `<details>` blocks with no order.
- **Read mode** — clean rendering of a saved thesis.

The user's framework (`docs/research-framework.md`) is sequential by design: §1 input → §2 classify thesis points → §4 fundamentals → §5 market position → §6 valuation → §7 scenarios → §8 light/checklists. Without a guided walk-through, new users default to Quick start and skip the framework's structure; experienced users juggle the collapsed Deep-dive sections without a sense of progress.

## 2. Problem
- No breadcrumb through the framework. Deep dive shows everything at once or nothing.
- No "what should I think about now?" prompt at each step. Framework knowledge lives in `docs/research-framework.md` but isn't surfaced inline.
- No progress signal. A half-filled thesis looks the same as a complete one.
- Easy to skip §2 classification entirely (a step the framework treats as load-bearing).

## 3. Scope

### In scope
- **New "Guided" mode** alongside Quick + Deep on `/research/thesis/[symbol]`.
- 9-step wizard that walks the framework sections in order:
  1. **Setup** — ticker (read-only), planned action, time horizon, position snapshot.
  2. **Thesis points** — the 3-bullet `thesisPoints` (today's quick-start) + a one-line framework prompt.
  3. **Classify** — `classifiedPoints` editor (§2) with a help blurb about core vs optional.
  4. **Fundamentals** — `fundamentals.*` 7 fields (§4) with a per-field guidance hint.
  5. **Market position** — `marketPosition.*` + core/optional drivers (§5).
  6. **Valuation** — `valuation.*` (§6) + the "what does current price assume?" prompt.
  7. **Scenarios** — 5-row scenarios editor (§7) with the fan strip.
  8. **Trade plan** — add levels 1/2/3 + max position + position calculator.
  9. **Light + checklists** — manual `currentLight` + the 4 framework checklists (§8).
- **Step UI**:
  - Progress bar at the top (9 segments, filled per completed step).
  - Step header: title + one-paragraph framework prompt (drawn from the framework doc).
  - Body: just the relevant editor — no other sections visible.
  - Footer: "Previous", "Save & exit", "Next" (or "Finish" on the last step).
  - "Save & exit" persists the partial thesis and routes back to the view mode.
  - "Finish" persists and routes to view mode.
- **Resume capability** — if the user re-enters Guided mode on a thesis with partial fields, the wizard opens on the first step that isn't complete (so they pick up where they left off). A "Restart from step 1" link offers reset.
- **Mode toggle** — "Guided →" button alongside the existing "Deep dive →" toggle. New theses default to Guided; subsequent edits default to whichever mode the user last used (persisted as `lastEditMode` on the thesis).
- **Wizard escape hatch** — every step has a "Skip — jump to Deep dive" link for users who don't want hand-holding.
- **Step completion detection** — each step has a `isComplete(thesis): boolean` predicate (e.g., Scenarios step complete when ≥3 scenarios have a price target). The progress bar fills based on these predicates, not just "did the user click next".

### Out of scope
- Step-level validation that blocks "Next" — the wizard is suggestive, not enforcing. Empty steps can be skipped freely.
- Auto-save on every keystroke — saves happen on step navigation and "Save & exit".
- Re-arranging steps — the framework order is the order.
- Saving a wizard state separately from the thesis (e.g. "which step am I on" persisted) — `lastEditMode` is enough; the wizard recomputes the resume step from the thesis content.
- Replacing Quick / Deep — both stay. Guided is additive.

## 4. User stories
- As a new user creating my first thesis, I want a wizard that tells me "first, write your bullet thesis. Now classify each point as core vs optional." so I don't skip steps.
- As a busy user updating my thesis after earnings, I want to jump straight to Deep dive without the wizard interfering — and the mode toggle should remember my choice.
- As a user mid-thesis, I want to "save and exit" the wizard and come back later, picking up where I left off.

## 5. Data contracts

```ts
// lib/domain/thesis.ts — additive field
export interface Thesis {
  // … existing fields …
  /** Tracks which mode the user last used so re-entry defaults are sane. */
  lastEditMode?: "quick" | "deep" | "guided";
}
```

```ts
// lib/research/wizard-steps.ts (new)

import type { Thesis } from "@/lib/domain/thesis";

export type WizardStepId =
  | "setup"
  | "thesisPoints"
  | "classify"
  | "fundamentals"
  | "marketPosition"
  | "valuation"
  | "scenarios"
  | "tradePlan"
  | "lightChecklists";

export interface WizardStepMeta {
  id: WizardStepId;
  title: string;
  /** One-paragraph framework prompt drawn from docs/research-framework.md. */
  prompt: string;
  /** Section anchor in docs/research-framework.md (for cross-link). */
  frameworkSection: string;
  /** Tests whether the thesis is "complete enough" at this step. */
  isComplete: (thesis: Thesis) => boolean;
}

export const WIZARD_STEPS: WizardStepMeta[];

/** Returns the first step whose `isComplete` is false, or the last step if all done. */
export function findResumeStep(thesis: Thesis): WizardStepId;
```

`isComplete` examples:
- `setup` — `plannedAction` set + `timeHorizon` non-empty.
- `thesisPoints` — `thesisPoints.length >= 1`.
- `classify` — `classifiedPoints.length >= thesisPoints.length`.
- `fundamentals` — at least 3 of 7 fields filled.
- `marketPosition` — at least 2 of 5 fields filled OR core drivers non-empty.
- `valuation` — at least 2 of 5 fields filled.
- `scenarios` — at least 3 scenarios have a `priceTarget`.
- `tradePlan` — at least 1 add level OR `maxPositionSize` set.
- `lightChecklists` — `currentLight` set explicitly (any value other than default "yellow"-on-create), OR ≥3 boolean checks ticked across all groups.

These are deliberately lenient — the wizard nudges, doesn't gate.

## 6. UX notes

### Mode toggle bar
At the top of the thesis form, three pill buttons:
```
[ Quick · Deep dive · Guided → ]
```
Active state highlighted. Clicking persists `lastEditMode` on the thesis (in-memory until save, then upserts).

### Guided panel layout
```
Progress: [████░░░░░] 4 / 9    Fundamentals (§4)

→ Did the business get weaker, or did only the stock price fall?
  Quarter-over-quarter, what changed in revenue, margins, free cash flow,
  guidance? What's a red flag vs. a one-off?

[Revenue growth textarea — placeholder: "latest quarter, TTM, guidance"]
[Margins textarea]
[Free cash flow textarea]
[Balance sheet textarea]
[Segment / region growth textarea]
[Guidance textarea]
[Capital allocation textarea]

────────────────────────────────────────────────────────────
[← Previous]              [Save & exit]    [Skip to Deep dive]  [Next →]
```

### Resume on re-entry
When the user opens Guided mode on an existing thesis:
- Compute `findResumeStep(thesis)`.
- Header note: "Resuming at step 4 of 9 — Fundamentals. [Restart from step 1]"

### Restart confirmation
"Restart from step 1" opens a `ConfirmDialog`: "Jump back to the Setup step? Your filled fields aren't lost — just the wizard cursor moves."

## 7. Functional requirements
- FR1: Guided mode is selectable from the mode toggle bar alongside Quick + Deep.
- FR2: New thesis with `lastEditMode === undefined` defaults to Guided. Existing thesis defaults to its `lastEditMode`.
- FR3: Each of the 9 steps renders only its own section; switching steps doesn't lose unsaved field values (state lives at the wizard level, not per-step).
- FR4: Step header includes title + framework section anchor link + one-paragraph prompt.
- FR5: Progress bar reflects `isComplete` per step in real time, not just navigation history.
- FR6: "Save & exit" persists the thesis and switches to view mode.
- FR7: Resume opens to `findResumeStep(thesis)` with a banner. "Restart from step 1" with `ConfirmDialog` confirmation.
- FR8: "Skip to Deep dive" link on every step → mode switches to Deep without losing state.

## 8. Non-functional requirements
- No new runtime deps.
- Reuses every editor component already built (no duplicating Fundamentals, Scenarios, etc.).
- Build stays static (`force-static` on the route).

## 9. Acceptance criteria
- [ ] AC1: New thesis for symbol Z, no existing localStorage record → form opens in Guided mode on the Setup step.
- [ ] AC2: Fill Setup → Next → form shows Thesis points step, Setup not visible. Previous → returns to Setup with values preserved.
- [ ] AC3: Switch to Deep dive → all sections visible. Switch back to Guided → resumes at the first incomplete step.
- [ ] AC4: Save & exit from step 5 → thesis page renders in view mode with the saved fields. Re-enter Edit → opens in Guided at step 5 (or first incomplete).
- [ ] AC5: "Restart from step 1" prompts confirm, then sets the wizard cursor to Setup without clearing fields.
- [ ] AC6: Progress bar shows N/9 filled where N = sum of `isComplete` returning true.
- [ ] AC7: `npm run build` passes, no token drift, focus ring on all buttons.

## 10. Test plan
- **Unit**: `findResumeStep` + each step's `isComplete` predicate against fixture theses.
- **Component**: wizard navigation (Next/Previous/Skip) preserves state.
- **Manual**: create a fresh thesis, walk all 9 steps, save & exit mid-way, re-enter, verify resume.

## 11. Rollout plan
- W12.A: `WizardStepMeta` registry + `findResumeStep` + `isComplete` predicates.
- W12.B: Mode toggle bar + `lastEditMode` persisted.
- W12.C: Wizard shell (progress bar + step header + Previous/Next/Save&exit).
- W12.D: Resume banner + Restart-from-step-1 confirmation.
- W12.E: Hook each step body to its existing editor.

Files: `web-app/src/lib/research/wizard-steps.ts` (new), `web-app/src/components/research/thesis-wizard.tsx` (new), `web-app/src/components/research/thesis-form.tsx` (mode toggle wiring).

## 12. Risks
- **Risiko:** Guided becomes the default but feels too long for users who just want Quick.
  **Mitigasjon:** Mode toggle is always visible. `lastEditMode` lets returning users skip Guided permanently after one save.
- **Risiko:** `isComplete` predicates feel arbitrary ("why does Fundamentals need 3 of 7?").
  **Mitigasjon:** Document each predicate in code comments. User can tune in a future spec.
- **Risiko:** "Restart from step 1" sounds destructive even though it's not.
  **Mitigasjon:** ConfirmDialog body explicitly says "fields aren't lost".
