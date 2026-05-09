# [SPEC-006] Watchlist Impact vs Latest Report

## 1. Context
SPEC-002 emitter en strukturert payload på `data/latest.json` med `movers[]`-feltet. SPEC-004 etablerte `localStorage["watchlist_items"]` med en typed read-API i `web-app/src/lib/storage/watchlist-store.ts`. SPEC-005 lar bruker importere mange tickere på én gang.

Dashbordet kan nå svare på spørsmålet brief §3 stiller: **"Which of my followed tickers are affected by this report?"** Den gamle statiske siden har en referanse-implementasjon i `assets/app.js:284-306` (`getWatchlistImpact`) — vi porter logikken til v3, strukturer outputen typed, og rendrer med Stitch-primitives fra SPEC-011.

## 2. Problem
v3-dashbordet viser regime, movers, og diskusjon — men ikke noe personlig. Bruker må mentalt krysse referere watchlist mot mover-listen for å se hvilke av deres tickere er påvirket. Det skalerer ikke når watchlist vokser, og er hele poenget med v3 ifølge brief §3.

## 3. Scope

### In scope
- `web-app/src/lib/reports/watchlist-impact.ts` — ren funksjon `getWatchlistImpact(latest: ReportItem, watchlistSymbols: string[]): WatchlistImpact`. Returnerer typed buckets (`high` / `medium` / `missing`).
- `web-app/src/components/dashboard/watchlist-impact-card.tsx` — client component som leser watchlist via `getWatchlist()` (SPEC-004 store) og rendrer impact-blokken med Stitch-primitives (`Card`, `SectionHeader`, `Sentiment`, `Tag`, `font-data-mono`).
- Integrer kortet på `web-app/src/app/page.tsx` (dashbordet) — etter `NewsMoversTable` slik at det matcher Stitch `dashboard.html` (Watchlist Impact span-12 nederst).
- Oppdater `docs/specs/STATUS.md` SPEC-006-rad i samme PR.

### Out of scope
- Filter-/sort-kontroller i kortet — minimal MVP.
- Per-ticker drill-down link til ticker detail (`/ticker/[symbol]`) — kommer i SPEC-007.
- Catalyst-kobling fra `data/latest.json#catalysts` — kan legges til som follow-up; ikke required for AC.
- Tags / status / priority kolonner — krever Brief Task 4.3 fields som ikke er implementert ennå (SPEC-004 lagrer kun `symbol`).
- Highlighting av "newly mentioned" vs "no longer mentioned" — nær-duplikat av SPEC-003 sin compare-blokk.

## 4. User stories
- Som bruker vil jeg, ved åpning av dashbordet, umiddelbart se hvilke av mine watchlist-symboler som beveger seg mest i dagens rapport.
- Som bruker vil jeg vite hvilke watchlist-symboler ikke har data i dagens rapport, slik at jeg ikke antar de står stille.
- Som bruker uten watchlist vil jeg se en hjelpsom empty-state som peker mot `/watchlist`.

## 5. Functional requirements
- FR1: `getWatchlistImpact(latest, ["NVDA","MSFT","UNKNOWN"])` returnerer `{ high: ImpactRow[], medium: ImpactRow[], missing: string[] }` der hver `ImpactRow` har `{ symbol, pct, name?, level }`.
- FR2: Et symbol klassifiseres som `high` hvis `Math.abs(mover.pct) >= 3`, ellers `medium`.
- FR3: Symboler uten matchende mover (eller med non-numeric `pct`) havner i `missing` — kun strenger, ikke `ImpactRow`.
- FR4: `high` og `medium` sorteres descending på `Math.abs(pct)` slik at de mest signifikante movers vises først.
- FR5: Watchlist-impact-kortet viser én av tre tilstander avhengig av watchlist-størrelse:
  - **Empty** (ingen symboler i localStorage): "Add symbols in /watchlist to see how this report affects them." med inline link til `/watchlist`.
  - **Has watchlist + ingen impact** (alle missing): "None of your watched symbols appear in today's report." + listen over missing.
  - **Has watchlist + impact**: render high-tabell (hvis nonempty), medium-tabell (hvis nonempty), og missing-string (hvis nonempty).
- FR6: Render bevarer SSR-trygghet — komponenten er `"use client"` og leser localStorage i `useEffect`.
- FR7: Hver impact-rad viser: symbol (`font-data-mono`), navn (text-secondary, hvis tilgjengelig), pct (`Sentiment` primitive — bullish hvis `pct > 0`, bearish hvis `pct < 0`).

## 6. Non-functional requirements
- **Pure logic**: `getWatchlistImpact` har ingen DOM-aksess, ingen storage-aksess. Lett å teste.
- **Performance**: O(N + M) der N = movers og M = watchlist size. Map-lookup pr symbol.
- **Tilgjengelighet**: tabeller er semantiske `<table>`-elementer; sentiment-cell har visuelt + tekstlig signal (ArrowUp/ArrowDown + +/- prefiks).

## 7. Data contracts

```ts
// web-app/src/lib/reports/watchlist-impact.ts
import type { ReportItem } from "@/types/reports";

export interface ImpactRow {
  symbol: string;       // uppercase
  pct: number;          // signed % change
  name?: string;        // mover.name if available
  level: "high" | "medium";
}

export interface WatchlistImpact {
  high: ImpactRow[];
  medium: ImpactRow[];
  missing: string[];    // symbols not in latest.movers
}

export const HIGH_THRESHOLD_PCT = 3;

export function getWatchlistImpact(
  latest: ReportItem,
  watchlistSymbols: string[],
): WatchlistImpact;
```

## 8. UX notes
- **Layout**: full-width section under existing dashboard cards. Single Card med SectionHeader + content-grid.
- **High table**: rød/grønn `Sentiment` per rad basert på pct-tegn.
- **Medium table**: samme, men under en lavere-tone heading.
- **Missing**: render som linje med chips (Tag) i stedet for full table — mindre visuell vekt.
- **Empty / loading**: matcher andre dashboard-kort med `text-muted-foreground` + inline `Link` til `/watchlist`.

## 9. Acceptance criteria
- [ ] AC1: `getWatchlistImpact` finnes med riktig signatur. Unit tests dekker FR1-FR4-cases.
- [ ] AC2: Watchlist-impact-kortet rendres på dashbordet under `NewsMoversTable`.
- [ ] AC3: Med tom watchlist viser kortet empty state med link til `/watchlist`.
- [ ] AC4: Med watchlist `["NVDA","MSFT","FAKE"]` mot dagens `data/latest.json` viser kortet høy/medium/missing buckets korrekt.
- [ ] AC5: `npx tsc --noEmit` passerer; `npm run build` passerer; `/` (dashboard) prerenders som static.
- [ ] AC6: STATUS.md SPEC-006-rad oppdatert med commit hash + dato.

## 10. Test plan
- **Unit** (manuell eller Vitest hvis konfigurert):
  - Empty watchlist returnerer `{ high: [], medium: [], missing: [] }`.
  - Symbol med pct 5.0 → high.
  - Symbol med pct -2.5 → medium.
  - Symbol uten mover-match → missing.
  - High/medium sortert på abs(pct) desc.
- **Component** (manuell):
  - Empty state vises uten watchlist.
  - Tre buckets rendres med realistic data.
- **E2E smoke** (manuell):
  - Legg til "NVDA, MSFT, AAPL" i `/watchlist`.
  - Naviger til dashbord — verifiser kortet viser inntakt impact basert på dagens rapport.

## 11. Rollout plan
- Én commit. Ingen feature flag.
- Avhenger av SPEC-002 + SPEC-004 + SPEC-005 — alle ✅.
- Rollback = revert commit.

## 12. Risks
- **Risiko**: `latest.movers` kan være tomt i en gitt rapport. Da går alle watchlist-symboler i `missing`-bucketen, og kortet viser "None appear in today's report"-state.
  **Mitigasjon**: FR5 dekker denne tilstanden eksplisitt.
- **Risiko**: pct-feltet er `string | number | undefined` per `MoverEntry` typen. Type-narrowing i lib må håndtere alle tre.
  **Mitigasjon**: `typeof m.pct !== "number"` → missing-bucket. Konsistent med v2-referansen.
- **Risiko**: Hardkodet 3% threshold er arbitrær. Brukeren kan ønske 2% eller 5%.
  **Mitigasjon**: Eksportert som `HIGH_THRESHOLD_PCT`-konstant. Settings-spec (SPEC-012) kan introdusere bruker-konfigurerbar threshold senere.
