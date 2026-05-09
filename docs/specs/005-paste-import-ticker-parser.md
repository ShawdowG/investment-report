# [SPEC-005] Paste / Import Ticker Parser

## 1. Context
SPEC-004 leverer single-symbol add via et input-felt. Brief Epic 4 / Task 4.2 sier brukeren skal kunne lime inn mange tickere på én gang fra en ekstern kilde (Yahoo, Google Finance, Nordnet, manuell liste, copy-paste fra rapport). Brukeren har ofte rotete data — kommaseparert, linjeseparert, blandet med navn, prefikser, eller konfliktende symbolformater (`AAPL` vs `NASDAQ:AAPL` vs `Apple Inc.`).

SPEC-005 leverer parser-laget og preview-flowen som mater watchlist-storen fra SPEC-004. Brief §11 plasserer dette under `web-app/src/lib/parsing/parse-tickers.ts` og `normalize-symbol.ts`.

## 2. Problem
Uten en bulk-import-flow må bruker legge til hver ticker individuelt — friksjon som motvirker hele "én master-watchlist"-verdien fra brief §3. Parser-logikken må også være delbar med framtidige use cases (paste fra rapport, paste fra CSV-eksport).

## 3. Scope

### In scope
- `web-app/src/lib/parsing/normalize-symbol.ts` — ren funksjon `normalizeSymbol(token: string): string | null`. Returnerer uppercase trimmet symbol uten exchange-prefiks, eller `null` hvis input ikke ser ut som et symbol.
- `web-app/src/lib/parsing/parse-tickers.ts` — `parseTickers(input: string): ParseResult`. Splitter på whitespace, komma, semikolon, newline; normaliserer hver token; deduper; returnerer `{ accepted: string[], unknown: string[] }`.
- `web-app/src/components/watchlist/import-dialog.tsx` (eller en seksjon på `/watchlist`-siden) — textarea + "Preview"-knapp som kjører parse, viser preview-tabell med to seksjoner (Accepted / Unknown), og "Save to watchlist"-knapp som persister via `addToWatchlist` fra SPEC-004.
- Parseren håndterer disse tokenformatene som accepted etter normalisering:
  - `AAPL`, `aapl`, `  AAPL  ` → `AAPL`
  - `NASDAQ:AAPL`, `NYSE:BRK.B`, `OSL:EQNR` → `AAPL`, `BRK.B`, `EQNR` (exchange-prefiks droppes)
  - `BRK-B`, `BRK.B` → `BRK.B` (binde-til-punktum-normalisering for klasser)
- Disse kategoriseres som unknown:
  - Tomme strenger
  - Tokens lengre enn 10 tegn
  - Tokens med mixed case (capital + lowercase blandet) — typisk firmanavn-ord: `Apple`, `Inc.`
  - Tokens som starter med tall (typisk linjenumre eller kvanta: `100`, `2x`)
- Oppdater `/watchlist`-siden til å eksponere import-flowen ved siden av single-add fra SPEC-004.
- Oppdater `docs/specs/STATUS.md` SPEC-005-rad i samme PR.

### Out of scope
- Multiple destinasjon-watchlists (Brief Task 4.2 punkt 5) — én default-liste i MVP, multi-list er future spec.
- Smart firmanavn-til-symbol resolution (`Apple Inc.` → `AAPL`) — krever extern data, ikke MVP. Slike tokens havner i unknown-bucketen.
- CSV header detection — paste forventes å være rå tokens, ikke et fullt CSV-dokument med headers.
- Live-validering mot `data/search-index.json` for å avgjøre om symbolet er kjent fra rapporter — kan legges til senere som varsel ("4 of 12 are not in any report yet"), men er ikke required for paste/import-funksjonen.
- Drag-drop fil-import — bare textarea-paste i SPEC-005.
- Reverse-import (eksportere watchlist som tekst) — kan komme i SPEC-012 eller eget settings-spec.

## 4. User stories
- Som bruker vil jeg lime inn en blokk med tickere fra en ekstern liste, slik at hele watchlisten min kommer inn i én operasjon.
- Som bruker vil jeg se en preview før jeg lagrer, slik at jeg kan rydde rotete input.
- Som bruker vil jeg se hvilke tokens parseren ikke skjønte, slik at jeg kan rette dem manuelt eller fjerne dem.

## 5. Functional requirements
- FR1: `parseTickers("aapl, msft\nNASDAQ:NVDA;BRK-B  Apple Inc.")` returnerer `{ accepted: ["AAPL","BRK.B","MSFT","NVDA"], unknown: ["Apple", "Inc."] }`. Accepted-listen er sortert alphabetisk og deduplisert. Unknown-listen bevarer rekkefølge fra input — siden splitter regex deler på whitespace, kommer hver mixed-case-token (typisk firmanavn-ord) som egen oppføring i unknown.
- FR2: `normalizeSymbol("nasdaq:aapl")` returnerer `"AAPL"`.
- FR3: `normalizeSymbol("Apple Inc.")` returnerer `null`.
- FR4: `normalizeSymbol("")` returnerer `null`.
- FR5: Import-dialog viser preview-tabell etter Preview-klikk, ikke automatisk på hver tastetrykk (unngå å parse mens brukeren skriver).
- FR6: Save-knapp er disabled hvis `accepted.length === 0`.
- FR7: Save kaller `addToWatchlist` per accepted symbol; etter save vises bekreftelse "Added N symbols (M skipped as duplicates)" der M er differansen mellom accepted-count og faktisk antall lagt til (siden SPEC-004 dedupliserer).
- FR8: Etter save tømmes textarea og preview lukkes; watchlist-tabellen oppdateres automatisk.

## 6. Non-functional requirements
- **Pure parser**: `parseTickers` og `normalizeSymbol` har ingen side-effekter, ingen DOM, ingen storage. Lett å unit-teste.
- **Performance**: input opp til ~1000 tokens parses synkront uten merkbar lag.
- **Tilgjengelighet**: textarea har label, Preview/Save-knapper har tydelig fokus-state, preview-tabell er semantisk `<table>` med headers.

## 7. Data contracts

```ts
// web-app/src/lib/parsing/parse-tickers.ts
export interface ParseResult {
  accepted: string[];   // normaliserte uppercase symboler, sortert, dedupliserte
  unknown: string[];    // raw tokens som ikke kunne normaliseres, rekkefølge bevart
}

export function parseTickers(input: string): ParseResult;

// web-app/src/lib/parsing/normalize-symbol.ts
export function normalizeSymbol(token: string): string | null;
```

Splitter regex: `/[\s,;]+/`
Exchange-prefiks regex (stripped før normalize): `/^(NASDAQ|NYSE|AMEX|OSL|XETRA|LSE|TSX|HKEX|SHE|SHA):/i`
Symbol-shape regex (etter strip + uppercase): `/^[A-Z][A-Z0-9.-]{0,9}$/` — første tegn må være bokstav, totalt 1–10 tegn, tillater `.` og `-` for klasse-suffiks.

## 8. UX notes
- **Empty state**: textarea med placeholder `"Paste symbols separated by commas, spaces, or newlines.\nExample: AAPL, MSFT\nNVDA TSLA\nNASDAQ:AMD"`.
- **Preview state**: to seksjoner — "Accepted (N)" som tabell med Symbol-kolonne; "Unknown (M)" som lista som strekkoder/chips for de som ble avvist.
- **Save success**: bekreftelse-melding fjernes etter ~3 sek; watchlist-tabellen oppdaterer.
- **All-unknown state**: hvis `accepted.length === 0`, vises melding "No recognizable symbols found." og Save er disabled.
- **Loading**: ikke nødvendig — parsing er synkront og raskt.
- **Error**: kun input-validering ("Paste at least one token before previewing"); ingen async-feilhåndtering siden alt er pure + synkront.

## 9. Acceptance criteria
- [ ] AC1: `parseTickers` og `normalizeSymbol` finnes med signatur som spesifisert; unit tests dekker exempler i FR1–FR4.
- [ ] AC2: `/watchlist`-siden har en synlig import-flow (textarea + Preview-knapp) i tillegg til single-add fra SPEC-004.
- [ ] AC3: Paste av `"aapl, msft\nNASDAQ:NVDA;BRK-B  Apple Inc."` viser preview med 4 accepted og 2 unknown (`Apple`, `Inc.`).
- [ ] AC4: Save legger de 4 til i watchlist (eller færre hvis duplikater allerede finnes); watchlist-tabellen rendres på nytt uten reload.
- [ ] AC5: Etter F5 (refresh) er nye symboler fortsatt der.
- [ ] AC6: Unit tests passerer; `npm run build` passerer.
- [ ] AC7: STATUS.md SPEC-005-rad oppdatert.

## 10. Test plan
- **Unit** (Vitest/Jest):
  - `normalizeSymbol`-cases: lowercase, prefiks-strip, klasse-suffiks, firmanavn → null, tomt → null, for langt → null.
  - `parseTickers`-cases: blandet separator, dedupe, unknown-bucketing, alfabetisk sortering av accepted.
  - Edge: bare separators (`",,, "`) → `{ accepted: [], unknown: [] }`.
- **Component** (manuell eller RTL):
  - Preview viser begge seksjoner.
  - Save kaller `addToWatchlist` per accepted og lukker preview.
- **Integration** (manuell):
  - Paste fra Yahoo Finance "My Watchlists" eksportert tekst — verifiser et reelt eksempel ender opp riktig kategorisert.

## 11. Rollout plan
- Én PR. Ingen feature flag.
- Avhenger av SPEC-004 (watchlist-store må eksistere). Hvis SPEC-004 ikke er merget, blokkes SPEC-005.
- Rollback = revert commit.

## 12. Risks
- **Risiko**: Parser-regexen er for streng og avviser legitime tickere (f.eks. exotic OSL-symboler med `0`/`1` som første tegn).
  **Mitigasjon**: AC3 og unit tests bruker realistic input; juster regex iterativt med konkrete bug-rapporter, ikke i forkant.
- **Risiko**: For permissive parsing kategoriserer firmanavn som accepted og forurenser watchlist.
  **Mitigasjon**: 1–10 tegn-grense + første-tegn-bokstav-regel + uppercase-only filtrerer de vanligste firmanavn-tokens vekk.
- **Risiko**: Brukeren forventer at `Apple Inc.` blir til `AAPL` (smart resolve).
  **Mitigasjon**: Out-of-scope dokumentert; unknown-bucketen synliggjør at det ikke ble tatt med, så brukeren kan rette manuelt.
- **Risiko**: Add-loop som kaller `addToWatchlist` N ganger trigger N storage-writes.
  **Mitigasjon**: SPEC-005 kan introdusere `addManyToWatchlist(symbols: string[])` i `watchlist-store.ts` som batcher én write — vurderes hvis prep-perf er et problem; ikke required for AC.
