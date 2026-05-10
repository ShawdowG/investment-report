# [SPEC-007] Ticker Detail Page + Symbol Search

## 1. Context
SPEC-002 ferdigstilte `data/by-ticker/SYMBOL.json` (et per-symbol-array av `ReportItem` der symbolet er nevnt). 23 ticker-filer eksisterer, hver med opp til 174 historiske mentions. SPEC-011 step 2 la `/tickers` shell + TopBar med visuell search-input. Ingen route konsumerer fortsatt by-ticker-data.

Stitch `ticker-detail.html` viser layout: header (symbol + name + status chips + price), Latest Intelligence Card (accent-left), Report Mentions History table, Personal Notes widget (sistnevnte er SPEC-009 scope).

## 2. Problem
Bruker kan se per-rapport ticker mentions via `/reports/[slug]`, men har ingen vei til å se *alle* mentions av ett symbol over tid. Dashbord watchlist impact peker på "MSFT moved -1.2%" men det finnes ingen drill-down. TopBar søk er en static placeholder.

## 3. Scope

### In scope
- `web-app/src/lib/reports/load-by-ticker.ts` — server-side `loadByTicker(symbol): ReportItem[] | null` og `listAvailableTickers(): string[]`. Bundle JSON direkte (samme strategi som `loadSearchIndex`) for å unngå runtime fs.
- `web-app/src/app/ticker/[symbol]/page.tsx` — dynamisk route med `generateStaticParams()` fra `listAvailableTickers()`. Renders 404 hvis ukjent symbol.
- `web-app/src/components/ticker/ticker-header.tsx` — symbol + name + status badge (Watching/Own basert på SPEC-004 watchlist + SPEC-008 portfolio når den lander). I MVP: bare Watching-state hvis i watchlist (client component).
- `web-app/src/components/ticker/report-mentions-table.tsx` — tabell over date / slot / regime / linked report (per Stitch §6.3). Viser top N=10, "View all" link til `/reports?ticker=SYMBOL` (filter ikke implementert ennå — bare lenken).
- Oppgrader `/tickers` placeholder til en grid med chips for alle tilgjengelige symboler (`listAvailableTickers()`), hver chip lenker til `/ticker/[symbol]`.
- Wire TopBar search: gjør input til en form som ved submit navigerer til `/ticker/[normalised-symbol]`. Hvis symbol ikke finnes, lander brukeren på en 404-side med "did you mean…"-hint (top 3 fuzzy matches via Levenshtein eller substring).
- Symbol normalisering bruker `normalizeSymbol` fra SPEC-005.
- Oppdater `docs/specs/STATUS.md` SPEC-007-rad i samme PR.

### Out of scope
- Personal Notes widget — SPEC-009.
- "Latest Intelligence" accent-left card med live institusjonell-flow analyse — fremtidig spec, eventuelt etter integrasjon med ekstern news source (SPEC-010).
- Live ticker price (kun rapport-data; ingen real-time quote integration).
- Filter på `/reports` etter ticker — det er en separate UX-forbedring; for nå er "View all" lenken plain href.
- Symbol search dropdown / autocomplete — submit-only i MVP. Live-filter er polish for senere.
- Levenshtein-implementasjon — bruk simpel substring-match for "did you mean".

## 4. User stories
- Som bruker vil jeg klikke på en ticker i watchlist-impact-blokken og se hele rapport-historikken for det symbolet.
- Som bruker vil jeg skrive "nvda" i top bar og hoppe direkte til `/ticker/NVDA`.
- Som bruker vil jeg åpne `/tickers` og se alle symboler systemet har data på, og velge ett.
- Som bruker som søker etter et ukjent symbol vil jeg se "did you mean ..."-hint så jeg kan rette feilstavingen.

## 5. Functional requirements
- FR1: `loadByTicker("NVDA")` returnerer `ReportItem[]` for NVDA, sortert reverse-chronological. `loadByTicker("UNKNOWN")` returnerer `null`.
- FR2: `/ticker/NVDA` rendrer som static page med top N=10 mentions + linker til hver enkelt rapport.
- FR3: `/ticker/UNKNOWN` returnerer Next.js 404 (via `notFound()` i page).
- FR4: TopBar search-form: ved submit, kall `normalizeSymbol`, hvis null vis inline error; hvis valid, naviger til `/ticker/[symbol]`.
- FR5: Hvis brukeren havner på et ukjent symbol via direct URL: 404-page tilbyr opp til 3 substring-match suggestions ("Did you mean: NVDA, NVO, ...").
- FR6: `/tickers` viser alle 23+ symboler som klikkbare chips. Sortert alfabetisk.
- FR7: TickerHeader viser status badge `Watching` hvis symbolet er i watchlist (les via `getWatchlist()` client-side). Hvis ikke watchlist, ingen badge.

## 6. Non-functional requirements
- **Static-first**: alle 23 ticker-routes prerenders ved `generateStaticParams`. Ingen runtime fetch.
- **Robusthet**: by-ticker JSON kan være tomt array — TickerHeader viser "No mentions yet" state.
- **Tilgjengelighet**: search-form har label, submit virker via Enter, 404-suggestions er klikkbare links.

## 7. Data contracts

```ts
// web-app/src/lib/reports/load-by-ticker.ts
import type { ReportItem } from "@/types/reports";

export function loadByTicker(symbol: string): ReportItem[] | null;
export function listAvailableTickers(): string[];
```

Filer leses fra `data/by-ticker/{SYMBOL}.json`. Symbol-segmentet i URL er case-sensitive på filnivå men page handler upper-cases før lookup.

## 8. UX notes
- **TickerHeader**: stor symbol + smaller name + chips row (status badge if any, plus tags/sectors hvis available — out of scope inntil storage-shape extension).
- **ReportMentionsTable**: same convention som dashboard tables: `font-label-caps text-label-caps text-text-secondary uppercase` headers, `font-data-mono` for date column.
- **Empty state** (ticker uten mentions, e.g. nytt symbol): "No report mentions yet for {symbol}."
- **Search submit**: optimistic navigation; 404 page handles invalid symbols gracefully.

## 9. Acceptance criteria
- [ ] AC1: `/ticker/NVDA` rendrer med ticker header + minst 1 historisk mention.
- [ ] AC2: TopBar søk på "nvda" navigerer til `/ticker/NVDA`.
- [ ] AC3: TopBar søk på "fake" lander på 404 med suggestions-hint.
- [ ] AC4: `/tickers` viser alle 23 symboler som chips, hver klikkbar.
- [ ] AC5: Bruker som har NVDA i watchlist ser "Watching"-badge på `/ticker/NVDA`; bruker uten ser ingen.
- [ ] AC6: `npx tsc --noEmit` passerer; `npm run build` passerer; alle 23 ticker-routes prerendres.
- [ ] AC7: STATUS.md SPEC-007-rad oppdatert.

## 10. Test plan
- **Build**: verify all 23 ticker routes prerender. Spot-check `/ticker/NVDA` HTML output.
- **Manual**: TopBar search round-trip; valid → navigate; invalid → 404 with suggestions.
- **Regression**: `/watchlist` add NVDA, navigate to `/ticker/NVDA`, verify "Watching" badge.

## 11. Rollout plan
- Én commit. Ingen feature flag.
- Avhenger av SPEC-002 (✅ done) og SPEC-004 (✅ done).
- Rollback = revert.

## 12. Risks
- **Risiko**: Symboler med spesialtegn (`BTC-USD`, `GC=F`, `^GSPC`, `ADBE.VI`, `NOVO-B.CO`) i URLs.
  **Mitigasjon**: Next.js dynamic params decoder håndterer URL-encoding; verify `BTC-USD` URL fungerer i build.
- **Risiko**: 23 routes blir mange flere når more tickers legges til over tid; build-tid kan øke.
  **Mitigasjon**: ikke et MVP-problem; sett en `revalidate` hvis det blir tregt.
- **Risiko**: Search-input er nå funksjonell i TopBar — kan distrahere fra at det bare er ticker-search, ikke globalt søk.
  **Mitigasjon**: oppdater placeholder til "Search ticker symbol…" så scope er klart.
