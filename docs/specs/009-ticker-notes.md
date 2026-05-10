# [SPEC-009] Notes / Journal per Ticker

## 1. Context
SPEC-007 leverte `/ticker/[symbol]` med rapport-mentions-history. Stitch `ticker-detail.html` har en Personal Notes-widget i høyre kolonne. Bruker trenger en plass å skrive ned tanker, observasjoner og signaler per ticker over tid uten å forlate appen.

ADR-002 holder dette local-first via localStorage. Brief Epic 6 / Task 9.x nevner notes per ticker som del av v3 cockpiten.

## 2. Problem
Bruker skriver i dag notater i eksterne verktøy (Notes-app, Slack, Notion) som ikke er kontekst-koblet til ticker. Det er friksjon å åpne et separat verktøy for én linje notat. Når brukeren senere kommer tilbake til samme ticker mangler kontekst.

## 3. Scope

### In scope
- `web-app/src/lib/domain/ticker-note.ts` — `TickerNote` type.
- `web-app/src/lib/storage/ticker-notes-store.ts` — `getNotes(symbol)`, `addNote(symbol, body)`, `deleteNote(symbol, id)`. Single localStorage key `ticker_notes` med shape `Record<string, TickerNote[]>`.
- `web-app/src/components/ticker/personal-notes-widget.tsx` — client component, mounts på `/ticker/[symbol]`, viser eksisterende notes + add-form.
- Mount widgeten på `web-app/src/app/ticker/[symbol]/page.tsx` i en sidebar-kolonne (Stitch shows lg:col-span-4).
- Oppdater `docs/specs/STATUS.md` SPEC-009-rad.

### Out of scope
- Edit av eksisterende note (delete + re-add hvis trengs).
- Rich text formatting / markdown rendering.
- Tags på notes — keep flat in MVP.
- Sync på tvers av enheter — ADR-003 territory.
- Search i notes — ikke MVP.
- Sletting av alle notes for et symbol via clear-all knapp — UI vises ikke; bruker kan slette én og én.

## 4. User stories
- Som bruker vil jeg skrive en kort tanke om en ticker så jeg husker den til neste gang.
- Som bruker vil jeg se mine tidligere notes for samme ticker når jeg åpner den.
- Som bruker vil jeg slette en note som ikke lenger er relevant.

## 5. Functional requirements
- FR1: `addNote("NVDA", "Watching $850 support")` lagrer ny `TickerNote` med `{ id, symbol: "NVDA", body, createdAt }`. ID er `crypto.randomUUID()` hvis tilgjengelig, ellers `Date.now()` fallback.
- FR2: `getNotes("NVDA")` returnerer notes sortert reverse-chronological (nyeste først). Returnerer `[]` ved SSR.
- FR3: `deleteNote("NVDA", id)` fjerner kun den matchende note.
- FR4: Widget viser tom-state med "No notes yet for {symbol}" + textarea for å legge til første.
- FR5: Add-form har textarea + submit-knapp. Tom body avvises med inline error.
- FR6: Hver note rendres med body + timestamp i compact format (e.g., "2026-05-10 14:32") + delete-icon.

## 6. Non-functional requirements
- **Robusthet**: SSR-safe storage; korrupt JSON faller tilbake til `{}`.
- **Tilgjengelighet**: textarea har label, delete har aria-label.
- **Performance**: O(1) lookup per symbol; antall notes pr ticker forventes lavt (titalls).

## 7. Data contracts

```ts
// web-app/src/lib/domain/ticker-note.ts
export interface TickerNote {
  id: string;
  symbol: string;          // uppercase
  body: string;            // trimmed, non-empty
  createdAt: string;       // ISO-8601
}

// web-app/src/lib/storage/ticker-notes-store.ts
export function getNotes(symbol: string): TickerNote[];
export function addNote(symbol: string, body: string): TickerNote[];
export function deleteNote(symbol: string, id: string): TickerNote[];
```

`localStorage` key: `ticker_notes`
`localStorage` value: `JSON.stringify(Record<string, TickerNote[]>)` keyed by uppercase symbol.

## 8. UX notes
- **Empty state**: "No notes yet for {symbol}." + textarea below.
- **Populated**: list of notes (reverse chrono), each with body + timestamp + small delete icon. Add-form below the list.
- **Add success**: textarea clears; new note appears at top.
- **Delete**: immediate, no confirm in MVP.

## 9. Acceptance criteria
- [ ] AC1: Open `/ticker/NVDA` → see Personal Notes widget with empty state.
- [ ] AC2: Type "Test note" → submit → note appears.
- [ ] AC3: F5 refresh → note persists.
- [ ] AC4: Click delete → note disappears without reload.
- [ ] AC5: Add a note for NVDA, navigate to `/ticker/MSFT` → no NVDA notes shown.
- [ ] AC6: tsc + build pass.
- [ ] AC7: STATUS.md updated.

## 10. Test plan
- Unit (manual): add/get/delete cycle, SSR fallback.
- Manual UX: add multiple notes, verify reverse-chrono order, refresh, delete, navigate between tickers.

## 11. Rollout plan
- Én commit. Avhenger av SPEC-007. Rollback = revert.

## 12. Risks
- **Risiko**: localStorage quota exceeded med mange long notes.
  **Mitigasjon**: storage-wrapper try/catch; UI viser feilmelding.
- **Risiko**: Symbol med spesialtegn (`BTC-USD`, `^GSPC`) som object-keys i localStorage.
  **Mitigasjon**: ingen — JS object-keys aksepterer alle strings; uppercased før read/write.
