# [SPEC-019] Research Dispatches — Your Own Writeups

## 1. Context
SPEC-022 sunset the auto-generated Alpha/Beta/Gamma reports. The user kept reports as a category in their head but wants to write their own — daily/weekly market views, strategy thesis writeups, post-mortems on trades. Need a surface for that.

The replaced sidebar slot used "Reports"; now it becomes "Research" pointing at this new surface. Local-first per ADR-002. Future Supabase sync per ADR-003 / SPEC-012.

## 2. Problem
Brief §3 mentions "personal notes & insights over time" as a v3+ value. SPEC-009 covered short notes per ticker. Long-form writeups need a separate surface — a single dispatch is several paragraphs, may span multiple tickers, lives at the dispatch level not a ticker level.

## 3. Scope

### In scope
- `web-app/src/lib/domain/research-dispatch.ts` — `ResearchDispatch` typed.
- `web-app/src/lib/storage/research-dispatches-store.ts` — `getDispatches`, `getDispatch(id)`, `createDispatch`, `updateDispatch`, `deleteDispatch`. Conform to SPEC-016 `ResearchRepository`.
- `web-app/src/lib/storage/contracts.ts` extends with `ResearchRepository` + `DispatchInput`.
- `/research` route — single page, client component with internal mode state (list / view / new / edit).
- Components: `DispatchList`, `DispatchView`, `DispatchForm`, `ResearchView` (orchestrator).
- Sidebar nav: rename "Reports" → "Research", href `/reports` → `/research`.
- Update STATUS.md.

### Out of scope
- Markdown rendering — body is plain text in MVP, displayed with `whitespace-pre-wrap`. Add render with `marked` or similar in a follow-up.
- Cross-device sync — local-first.
- Per-ticker filter / index of dispatches mentioning a ticker — flag as follow-up; can derive from `ticker` field later.
- Tags on dispatches — single optional `ticker` field is enough for MVP linkage; multi-tag is future polish.
- Rich text editor (bold, links, etc.) — plain textarea in MVP.
- Search across dispatches.
- Export / import.
- Mounting "recent dispatches" widget on the dashboard or ticker page (SPEC-019 just builds the surface; surfacing it elsewhere is later).

## 4. User stories
- Som bruker vil jeg skrive en dispatch med tittel + body (flere paragraffer) så jeg har en plass for daglige/ukentlige market notes.
- Som bruker vil jeg lenke en dispatch til en ticker (valgfritt) så jeg kan finne tilbake fra ticker-siden senere.
- Som bruker vil jeg redigere eller slette en dispatch jeg har skrevet.

## 5. Functional requirements
- FR1: `createDispatch({ title, body, ticker? })` returnerer ny `ResearchDispatch` med `id` (uuid eller timestamp+random fallback) og `createdAt`. Tomt title-felt avvises (UI guard).
- FR2: `getDispatches()` returnerer dispatches sortert reverse-chronological på `createdAt`.
- FR3: `updateDispatch(id, patch)` overskriver gitte felter (title / body / ticker), setter `updatedAt`.
- FR4: `deleteDispatch(id)` fjerner.
- FR5: `/research` viser liste med tittel + dato + ticker chip (hvis satt) + "New dispatch" CTA.
- FR6: Klikk på en dispatch → view-mode med tittel, ticker chip, dato, body som whitespace-preserving text, Edit + Delete + Back-knapper.
- FR7: Edit-mode bruker samme form som New, prefilled med dispatch data.

## 6. Data contracts

```ts
// web-app/src/lib/domain/research-dispatch.ts
export interface ResearchDispatch {
  id: string;
  title: string;
  body: string;
  ticker?: string;          // uppercase, optional ticker linkage
  createdAt: string;        // ISO-8601
  updatedAt?: string;
}

// added to web-app/src/lib/storage/contracts.ts
export interface DispatchInput {
  title: string;
  body: string;
  ticker?: string;
}

export interface ResearchRepository {
  list(): ResearchDispatch[];
  get(id: string): ResearchDispatch | null;
  create(input: DispatchInput): ResearchDispatch;
  update(id: string, patch: Partial<DispatchInput>): ResearchDispatch | null;
  remove(id: string): void;
}
```

`localStorage` key: `research_dispatches`. Value: `ResearchDispatch[]`, newest first.

## 7. Acceptance criteria
- [ ] AC1: New dispatch creates and shows in list.
- [ ] AC2: Refresh persists.
- [ ] AC3: Edit updates `updatedAt`, list shows changed title.
- [ ] AC4: Delete removes from list.
- [ ] AC5: Linking to NVDA shows the chip and (no integration with /ticker yet — future spec).
- [ ] AC6: Sidebar shows "Research" instead of "Reports".
- [ ] AC7: tsc + build pass.

## 8. Risks
- **Risiko**: Plain-text body looks rough next to the polished Stitch surfaces.
  **Mitigasjon**: monospace + good whitespace handling buys an "editor-ish" feel; markdown render lands in a follow-up.
- **Risiko**: localStorage quota for many long dispatches (5MB default).
  **Mitigasjon**: write fails gracefully via existing storage wrapper try/catch. Realistic ceiling thousands of dispatches before issue.
