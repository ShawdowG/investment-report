# [SPEC-004] Watchlist Local Store

## 1. Context
v3-skallets `/watchlist`-rute eksisterer som placeholder (lagt til 2026-05-09 i SPEC-001 audit, commit `5d6552d`). Brief §10.2 og Epic 4 / Task 4.1 sier at watchlist skal være local-first via `localStorage`, og ADR-002 bekrefter dette som MVP-strategi. Ingen auth, ingen sync — Supabase ligger i SPEC-012 som valgfri framtidig kontrakt.

Eksisterende statisk side (`assets/app.js:274`) leser allerede `localStorage.getItem('watchlist_items')` med shape `[{ symbol }]` for å rendre watchlist-impact-blokken på v2-dashboardet. SPEC-004 må respektere den nøkkelen og det shape-et slik at v2-statisksiden ikke knekker mens v3 bygges parallelt.

## 2. Problem
Det finnes ingen v3-front-end for å legge til, fjerne eller liste tickere i watchlist. Hele `/watchlist`-siden er en tekst-placeholder. Dashboarder og senere impact-spec (SPEC-006) trenger en stabil, typed lese/skrive-API mot localStorage som ikke duplikerer ad-hoc lese-logikk på tvers av komponenter.

## 3. Scope

### In scope
- `web-app/src/lib/storage/local-storage.ts` — tynn typed wrapper rundt `localStorage` (read-json / write-json / remove) som håndterer SSR-trygt (returnerer fallback når `window` er undefined).
- `web-app/src/lib/storage/watchlist-store.ts` — domene-API: `getWatchlist()`, `addToWatchlist(symbol)`, `removeFromWatchlist(symbol)`, `clearWatchlist()`. Beholder `localStorage`-nøkkel `watchlist_items` for forward-compat med v2-statisksiden.
- `web-app/src/lib/domain/watchlist.ts` — type-definisjoner: `WatchlistItem` med kjernefeltet `symbol` og forward-compatible valgfrie felter (`id`, `addedAt`).
- `web-app/src/components/watchlist/watchlist-table.tsx` — render-komponent med tabell over symboler, fjern-knapp per rad.
- `web-app/src/components/watchlist/add-symbol-form.tsx` — enkelt input + submit for å legge til en ticker (én av gangen — paste/import er SPEC-005).
- Erstatt placeholder-innholdet i `web-app/src/app/watchlist/page.tsx` med en client component som kombinerer add-form + table + empty/loading/error states.
- Symbol normaliseres til uppercase og trim før lagring; tomme strenger og duplikater avvises stille.
- Oppdater `docs/specs/STATUS.md` SPEC-004-rad i samme PR.

### Out of scope
- Paste/import av flere symboler i én operasjon — SPEC-005.
- Watchlist impact-modul mot `data/latest.json` — SPEC-006 (SPEC-006 vil konsumere `getWatchlist()` derfra).
- Tags, prioritet, status per item — Brief Task 4.3, future spec.
- Multiple navngitte watchlists — designet skal *tillate* det, men én default-liste er nok i SPEC-004.
- Supabase-sync eller cross-device persist — ADR-003 + SPEC-012.
- Migrering av v2-statisksidens watchlist UI — v3 skal være canonical.

## 4. User stories
- Som bruker vil jeg legge til en ticker i watchlist via `/watchlist`-siden, slik at jeg slipper å redigere localStorage manuelt.
- Som bruker vil jeg fjerne en ticker fra watchlist, slik at listen reflekterer det jeg faktisk følger.
- Som bruker vil jeg at watchlisten min beholdes etter side-refresh, slik at jeg ikke må fylle den ut på nytt.
- Som framtidig agent vil jeg ha én typed funksjon å kalle for å lese/skrive watchlist, slik at SPEC-006 og senere kan bygge oppå uten å duplisere localStorage-logikk.

## 5. Functional requirements
- FR1: `addToWatchlist("nvda")` lagrer `NVDA` (uppercase + trim) i `localStorage` under nøkkelen `watchlist_items`.
- FR2: `addToWatchlist` av et symbol som allerede finnes er en no-op (ingen duplikat, ingen kast).
- FR3: `removeFromWatchlist(symbol)` fjerner kun det matchende symbolet (case-insensitive sammenligning) og lar resten være.
- FR4: `getWatchlist()` returnerer `WatchlistItem[]` sortert på `symbol` ascending. Returnerer tom array hvis nøkkelen ikke finnes eller verdien ikke kan parses.
- FR5: SSR-trygt — `getWatchlist()` kalt under server render (window undefined) returnerer `[]` uten å kaste.
- FR6: `/watchlist`-siden viser empty state ("No symbols yet — add one below.") når listen er tom.
- FR7: `/watchlist`-siden viser current count og en remove-knapp per rad.
- FR8: Add-form valider at input er ikke-tomt etter trim; viser inline-feilmelding for tomt input.

## 6. Non-functional requirements
- **Robusthet**: alle localStorage-operasjoner i try/catch; korrupt JSON lagrer ikke noe — bare returnerer fallback.
- **Performance**: ingen reactive store / state lib i SPEC-004 — bruk React `useState` + en lokal `refresh()` etter mutasjon. Reactive store er en framtidig optimalisering hvis SPEC-006 trenger det.
- **Tilgjengelighet**: input har label, submit har keyboard-trigger (Enter), remove-knapp har aria-label `Remove {symbol}`.
- **Forward-compat**: `WatchlistItem` skal ha `symbol` som required og resten optional. Eksisterende v2-statisksidens `getWatchlistSymbols` (`assets/app.js:272-282`) leser kun `.symbol`-feltet og må fortsette å virke uendret.

## 7. Data contracts

```ts
// web-app/src/lib/domain/watchlist.ts
export interface WatchlistItem {
  symbol: string;        // uppercase, trimmed, non-empty
  id?: string;           // optional uuid, future use
  addedAt?: string;      // optional ISO-8601, future use
}
```

`localStorage` key: `watchlist_items`
`localStorage` value: `JSON.stringify(WatchlistItem[])`

Compat note: v2 `assets/app.js` writer (hvis det finnes en gammel) lagrer `[{ symbol: "NVDA" }, ...]`. v3 reader må tåle denne shape-en (alle ekstra felter er optional). v3 writer kan trygt legge til `id`/`addedAt` — v2 ignorerer dem.

## 8. UX notes
States å dekke på `/watchlist`-siden:
- **Loading** (kort, mens client component hydrater): skeleton row eller "Loading watchlist…" tekst.
- **Empty**: "No symbols yet — add one below."
- **Populated**: tabell med Symbol-kolonne + Remove-knapp.
- **Error på add** (tomt input): inline rød hjelpetekst under input.
- **Error på storage** (quota exceeded eller annet kast i write): toast eller inline melding "Could not save — storage may be full." Ikke krasj.

Ingen modal, ingen confirmation på remove i SPEC-004 — én klikk fjerner. SPEC-006/SPEC-008 kan legge til undo hvis brukeren ber om det.

## 9. Acceptance criteria
- [ ] AC1: `addToWatchlist`, `removeFromWatchlist`, `getWatchlist`, `clearWatchlist` finnes og er typed i `web-app/src/lib/storage/watchlist-store.ts`.
- [ ] AC2: `getWatchlist()` returnerer `[]` når kjørt server-side (no `window`) — ingen kast.
- [ ] AC3: Bruker kan legge til "nvda" i input på `/watchlist` og se "NVDA" som ny rad uten reload.
- [ ] AC4: Bruker kan klikke remove på en rad og se raden forsvinne uten reload.
- [ ] AC5: Etter F5 (full refresh) er watchlist-innholdet identisk.
- [ ] AC6: v2 statisksidens watchlist-impact-blokk (`assets/app.js`) leser fortsatt samme nøkkel og rendrer korrekt mot et delt eksempel-set (manuell røyktest).
- [ ] AC7: `npm run build` i `web-app/` passerer (typecheck + Next static export).
- [ ] AC8: STATUS.md SPEC-004-rad oppdatert med commit-hash + dato.

## 10. Test plan
- **Unit** (Vitest eller Jest hvis konfigurert; ellers manuelle eksempler i `__tests__/` med `.test.ts`):
  - `addToWatchlist` normaliserer case og trim
  - `addToWatchlist` ignorerer duplikater
  - `removeFromWatchlist` matcher case-insensitive
  - `getWatchlist` returnerer `[]` ved korrupt JSON
  - SSR-fallback (mock `window` undefined)
- **Component** (manuell eller React Testing Library hvis satt opp):
  - Empty state vises på første åpning
  - Submit av "nvda" rendrer "NVDA" som rad
  - Remove fjerner riktig rad
- **E2E smoke** (manuell):
  - Åpne `/watchlist`, legg til 3 symboler, refresh, alle tre er der.
  - Remove en, refresh, de to gjenværende vises.
  - Åpne v2 statisksiden (`index.html`) — watchlist-impact-blokken bruker samme symboler.

## 11. Rollout plan
- Én PR, én commit. Ingen feature flag.
- Rollback = revert commit. Ingen storage-migrering nødvendig (samme nøkkel, samme shape).
- Ingen CI-endringer.

## 12. Risks
- **Risiko**: SSR-feil hvis `localStorage` aksesseres under server render i Next App Router.
  **Mitigasjon**: alle storage-kall gates med `typeof window !== "undefined"`; UI-komponenter er `"use client"`.
- **Risiko**: localStorage quota exceeded på enheter med mye lagret data.
  **Mitigasjon**: try/catch rundt write; vis ikke-blokkerende feilmelding.
- **Risiko**: shape-divergens mellom v2 og v3 hvis senere spec utvider `WatchlistItem` på inkompatibel måte.
  **Mitigasjon**: alle tillegg er optional i SPEC-004; framtidige specs som endrer shape skal eksplisitt adressere v2-kompabilitet eller dokumentere at v2-statisksiden er deprecated.
- **Risiko**: SPEC-006 vil trenge reactive updates (impact-blokk på dashboard skal endre seg når watchlist endres).
  **Mitigasjon**: SPEC-006 introduserer en hook hvis nødvendig; SPEC-004 holder seg til imperativ API som ikke binder framtidig design.
