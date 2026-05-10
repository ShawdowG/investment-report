# [SPEC-013] Watchlist Storage Shape Extension (Brief Task 4.3)

## 1. Context
SPEC-004 leverer `WatchlistItem = { symbol, id?, addedAt? }`. Brief Epic 4 / Task 4.3 og Stitch `watchlist.html` har Status / Priority / Tags som synlige kolonner. SPEC-011 step 4 watchlist re-skin har vært blokkert på dette.

## 2. Problem
Dagens watchlist mangler felter for å skille hva brukeren *gjør* med en ticker (own/watch/research/avoid), hvor høyt det prioriteres (high/med/low), og hvilke kategorier de tilhører (sectors, themes). Uten disse er en re-skin til Stitch-layouten meningsløs — kolonnene er tomme.

## 3. Scope

### In scope
- Utvid `WatchlistItem` med valgfrie `status?`, `priority?`, `tags?` felter.
- Backwards-compat: eksisterende lagrede items uten disse feltene rendrer med defaults (`watching` / `med` / `[]`).
- Utvid `addToWatchlist` til å motta partial input.
- Legg til `updateWatchlistItem(symbol, patch)` for in-place oppdatering uten full remove+re-add.
- Utvid `AddSymbolForm` med valgfrie metadata-inputs (collapsible "Details" seksjon).
- Re-skin `WatchlistTable` til å vise Status / Priority / Tags / Actions kolonner per Stitch.
- Bruk SPEC-011 primitives: `StatusBadge`, `PriorityBadge`, `Tag`.
- Oppdater `docs/specs/STATUS.md`.

### Out of scope
- Per-row inline edit av eksisterende items via dropdowns (kan komme senere; brukeren kan fjerne + re-adde for nå, eller sett metadata når de adder).
- Filter-bar på `/watchlist` (Stitch viser "Filter" knapp; ikke MVP).
- Bulk-update av status for flere items.
- Custom statusfarger eller statuser (de fire i SPEC-011 holder).
- Tag autocomplete / kjente tags.

## 4. Functional requirements
- FR1: `WatchlistItem.status` typed `"own" | "watching" | "research" | "avoid" | undefined`.
- FR2: `WatchlistItem.priority` typed `"high" | "med" | "low" | undefined`.
- FR3: `WatchlistItem.tags` typed `string[] | undefined`. Tag-strings normaliseres trim + max 20 tegn; tomme strenger filtreres bort.
- FR4: `addToWatchlist({ symbol, status?, priority?, tags? })` lagrer alt provided; ingen krav til metadata.
- FR5: `updateWatchlistItem(symbol, patch)` overwriter angitte felter, beholder andre. Ikke-eksisterende symbol = no-op.
- FR6: WatchlistTable viser kolonnene Symbol / Status / Priority / Tags / Actions. Defaults vises hvis felt er undefined: status="Watching", priority="Med", tags=ingen chips.
- FR7: AddSymbolForm har en collapsible "Details" seksjon med dropdowns for status og priority, og en kommaseparert tag-input.

## 5. Data contracts

```ts
// web-app/src/lib/domain/watchlist.ts
export type WatchlistStatus = "own" | "watching" | "research" | "avoid";
export type WatchlistPriority = "high" | "med" | "low";

export interface WatchlistItem {
  symbol: string;
  id?: string;
  addedAt?: string;
  status?: WatchlistStatus;       // default "watching" at read time
  priority?: WatchlistPriority;   // default "med" at read time
  tags?: string[];                // default [] at read time
}
```

`localStorage` key: uendret (`watchlist_items`). v2 statisksiden leser kun `.symbol` så ingen breaking change.

## 6. Acceptance criteria
- [ ] AC1: Add NVDA med status="own", priority="high", tags=["AI","Semi"]. Tabell viser badge "Own" + "High" + chips.
- [ ] AC2: Add MSFT med kun symbol (ingen metadata). Tabell viser default "Watching" / "Med" badges, ingen tag-chips.
- [ ] AC3: Refresh — alt persisteres.
- [ ] AC4: tsc + build pass.
- [ ] AC5: STATUS.md SPEC-013-rad oppdatert.

## 7. Risks
- **Risiko**: v2 statisksiden's `getWatchlistSymbols()` (`assets/app.js:272-282`) leser kun `.symbol`. Nye felter er optional → no break.
- **Risiko**: Eksisterende lagrede items uten metadata får defaults *ved render*, ikke i storage. Hvis vi senere vil migrere, må vi enten skrive defaults eksplisitt eller la dem være.
  **Mitigasjon**: render-time defaults er enklest; hvis migration trengs, eget pass kjøres.
