# [SPEC-008] Portfolio Local Store + Dashboard Impact

## 1. Context
Brief §3 og Epic 6 skiller mellom "watchlist = things I follow" og "portfolio = things I own". SPEC-004 leverte watchlist-store. SPEC-006 leverte watchlist-impact på dashbord. Bruker har ikke en kanal for å registrere eide posisjoner med kvantitet og inngangsterskel, så dashbord kan ikke svare på "what's the dollar impact of today on my portfolio?".

ADR-002 holder portfolio local-first via localStorage. Denne specen mirrors SPEC-004/006-mønsteret for owned positions.

## 2. Problem
Watchlist forteller hva bruker følger; den forteller ikke hvor mye de eier eller hva inngangskursen er. Uten det kan ikke dashbordet vise dollar-eksponering eller P&L-effekt av dagens rapport.

## 3. Scope

### In scope
- `web-app/src/lib/domain/portfolio.ts` — `PortfolioPosition` typedef.
- `web-app/src/lib/storage/portfolio-store.ts` — `getPortfolio()`, `addPosition()`, `removePosition()`, `clearPortfolio()`. Bruker `localStorage` key `portfolio_positions`.
- `web-app/src/components/portfolio/{add-position-form,portfolio-table,portfolio-view}.tsx` — CRUD UI på `/portfolio`. Mirror av SPEC-004 watchlist-mønsteret.
- `web-app/src/lib/reports/portfolio-impact.ts` — pure `getPortfolioImpact(latest, positions): PortfolioImpact`. Returnerer rader med estimert $ delta basert på siste rapports mover.pct og posisjonens currentValue (= quantity × avgPrice som proxy fordi mover.price er sporadisk og kan være string).
- `web-app/src/components/dashboard/portfolio-impact-card.tsx` — client component, mirror av WatchlistImpactCard, leser portfolio-store og rendrer på dashbord.
- Mount portfolio-impact-kortet på `/` etter watchlist-impact-kortet.
- Erstatt `/portfolio` placeholder med PortfolioView.
- Oppdater `docs/specs/STATUS.md` SPEC-008-rad.

### Out of scope
- Live current price (kun rapport-data; bruker mover.pct for delta-prosent).
- Multi-platform tagging (Nordnet vs Avanza etc.) — Brief §11 nevner det; legges til senere.
- Bulk paste/import for portfolio (analogt med SPEC-005 — separat spec hvis trengs).
- Cost basis tracking, FIFO/LIFO, gevinst-rapportering — utenfor MVP.
- Total portfolio value chart / time series — krever tidsserie data vi ikke har.
- Stitch portfolio.html full re-skin — det er SPEC-011 step 4.

## 4. User stories
- Som bruker vil jeg legge til en eid posisjon med ticker + antall + snittpris så jeg kan tracke eksponering.
- Som bruker vil jeg, når jeg åpner dashbordet, se hvor mye dagens rapport-bevegelser potensielt påvirker mine eide posisjoner i dollar.
- Som bruker vil jeg fjerne en posisjon når jeg har solgt ut.

## 5. Functional requirements
- FR1: `addPosition({ symbol: "nvda", quantity: 100, avgPrice: 850 })` lagrer normalisert symbol (`NVDA`), quantity, avgPrice. Negativ/zero quantity eller avgPrice avvises i UI før call.
- FR2: `getPortfolio()` returnerer `PortfolioPosition[]` sortert på symbol asc. Returnerer `[]` ved SSR (no window).
- FR3: `removePosition(symbol)` fjerner alle matchende symboler (case-insensitive). I MVP er det maks én rad per symbol.
- FR4: `getPortfolioImpact(latest, positions)` returnerer `{ rows: ImpactRow[], totalDollarDelta }` der hver rad har `{ symbol, quantity, avgPrice, pct, dollarDelta, level }` og `level: "high" | "medium" | "missing"`. Threshold: `|pct| >= 3` = high.
- FR5: dollarDelta = `quantity * avgPrice * (pct / 100)` — proxy basert på dagens kurs ≈ avgPrice. Dokumenter approksimasjonen.
- FR6: Dashbord-kortet rendrer tre states: empty (ingen posisjoner) → link til `/portfolio`; ingen impact (alle missing) → "None of your positions appear in today's report"; impact → rad-tabell med dollar delta sum.
- FR7: `/portfolio` add-form har 3 felt: ticker (obligatorisk), quantity (number > 0), avgPrice (number > 0). Validering inline.
- FR8: `/portfolio` viser table med Symbol / Qty / Avg Price / Total Cost / Remove.

## 6. Non-functional requirements
- **Robusthet**: alle storage-kall i try/catch, SSR-trygg via samme localStorage-wrapper som SPEC-004.
- **Performance**: O(N+M) for impact-beregning; portfolio sjelden over noen titalls posisjoner.
- **Tilgjengelighet**: input-felter har label, submit virker via Enter, remove-knapp har aria-label.

## 7. Data contracts

```ts
// web-app/src/lib/domain/portfolio.ts
export interface PortfolioPosition {
  symbol: string;        // uppercase, trimmed
  quantity: number;      // > 0
  avgPrice: number;      // > 0, in same currency as report data
  addedAt?: string;      // ISO-8601
  platform?: string;     // future use
}

// web-app/src/lib/reports/portfolio-impact.ts
export interface PortfolioImpactRow {
  symbol: string;
  quantity: number;
  avgPrice: number;
  pct: number;
  dollarDelta: number;
  level: "high" | "medium";
}

export interface PortfolioImpact {
  rows: PortfolioImpactRow[];
  missing: string[];
  totalDollarDelta: number;
}
```

`localStorage` key: `portfolio_positions`
`localStorage` value: `JSON.stringify(PortfolioPosition[])`

## 8. UX notes
- **/portfolio empty**: "No positions yet — add one below."
- **/portfolio populated**: 4-column table with Symbol/Qty/Avg/Cost + remove icon.
- **Dashboard impact empty**: link til /portfolio.
- **Dashboard impact populated**: SectionHeader title + tabell med Symbol / Move % (Sentiment) / Δ$ — fargede positive/negative + total summen i footer.
- **Approximation note**: small "Estimates use avg price as proxy for current — refine when live quote integration lands" footer.

## 9. Acceptance criteria
- [ ] AC1: Add NVDA quantity 100 avgPrice 850 → table viser én rad.
- [ ] AC2: Refresh side → posisjon beholdes.
- [ ] AC3: Remove → rad forsvinner uten reload.
- [ ] AC4: Dashbord viser portfolio-impact-kort hvis posisjoner finnes; viser empty-state hvis ikke.
- [ ] AC5: Hvis NVDA er i siste rapport med pct = +3.5, dollarDelta ≈ 100 * 850 * 0.035 = 2975, og raden klassifiseres som "high".
- [ ] AC6: `npx tsc --noEmit` + `npm run build` passerer.
- [ ] AC7: STATUS.md SPEC-008-rad oppdatert.

## 10. Test plan
- Unit (manuelt): `getPortfolioImpact` returnerer riktig delta for kjente input.
- Manual: full CRUD-loop på `/portfolio`, dashboard-kortet rendrer korrekt.
- Regression: watchlist + portfolio sammen — begge kort vises på dashbord.

## 11. Rollout plan
- Én commit. Avhenger av SPEC-004 + SPEC-006. Rollback = revert.

## 12. Risks
- **Risiko**: dollarDelta-approksimasjonen kan villede brukere (de tror det er "real" P&L).
  **Mitigasjon**: footer-disclaimer; senere SPEC for live quotes når integrasjon er tilgjengelig.
- **Risiko**: localStorage-key-konflikt med v2 statisksiden hvis den senere får portfolio-impact.
  **Mitigasjon**: bruker dedikert nøkkel `portfolio_positions` (separate fra `watchlist_items`); v2-siden touche-r ikke denne i dag.
