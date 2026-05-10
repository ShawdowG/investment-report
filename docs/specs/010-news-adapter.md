# [SPEC-010] News Source Abstraction + Confidence Scoring

## 1. Context
Brief §3 ramme nevner news/catalysts som en del av v3-cockpiten. SPEC-002 emitter `catalysts: Record<ticker, headline>` på `data/latest.json` — det er rapport-generatorens egen "headline-i-Section-7"-felt. I dag konsumeres det ikke noe sted i web-app.

Brief §1 nevner også fremtidige integrasjoner mot Yahoo Finance / Google Finance / Nordnet. De vil bringe asynkrone news-feeds, men ADR-001 holder pipeline static-first. Denne specen definerer kontrakten slik at fremtidige adaptere plugger inn uten å bryte dashbordet.

## 2. Problem
Hvis vi later kode konsumere `catalysts`-feltet direkte fra `data/latest.json`, vil enhver fremtidig news-kilde (Yahoo, Google Finance) kreve refactor av komponenter. En tynn adapter-abstraksjon koster lite nå og forhindrer det.

## 3. Scope

### In scope
- `web-app/src/lib/news/types.ts` — `NewsItem` + `NewsAdapter` interface.
- `web-app/src/lib/news/catalyst-adapter.ts` — implementasjon som leser `data/latest.json#catalysts` (én entry per kalt ticker).
- `web-app/src/lib/news/index.ts` — registry + `getNewsForTicker(symbol)` aggregator.
- `web-app/src/components/ticker/latest-intelligence-card.tsx` — accent-left Card per Stitch `ticker-detail.html` som rendrer øverste news-item for symbolet hvis tilgjengelig. Tom-state hvis ingen news.
- Mount LatestIntelligenceCard på `/ticker/[symbol]`-siden over Report Mentions.
- Confidence-scoring: `0..1` per item. Catalyst-adapter setter `1` (det er rapportens egen kilde). Fremtidige adaptere kan bruke score basert på publisher reputation, recency, eller match-strength.
- Oppdater `docs/specs/STATUS.md` SPEC-010-rad.

### Out of scope
- Faktisk Yahoo / Google / RSS-integrasjon — krever runtime fetch eller build-time scraper, separat spec.
- News dedup / merging across adaptere — single-adapter MVP.
- News i watchlist-impact-blokken (kunne vise "AAPL: +1.2% — earnings beat" rad). Polish for senere.
- Bruker-konfigurerbar adapter-prioritering — bruker har bare én kilde nå.
- Søk i news.

## 4. User stories
- Som bruker som åpner `/ticker/NVDA` vil jeg se den siste catalyst-headlinen (hvis rapporten nevner en) som umiddelbar kontekst.
- Som framtidig agent som vil legge til en news-kilde, vil jeg ha én typed kontrakt å implementere mot.

## 5. Functional requirements
- FR1: `getNewsForTicker("NVDA")` returnerer `NewsItem[]` aggregert fra alle registrerte adaptere.
- FR2: `CatalystAdapter.getNewsForTicker("NVDA")` returnerer `[{ ticker, headline, source: "report-catalyst", confidence: 1, publishedAt: latest.date }]` hvis catalysts har en NVDA-entry, ellers `[]`.
- FR3: Symbol matching er case-insensitive.
- FR4: LatestIntelligenceCard på ticker-detail viser øverste item etter `confidence desc, publishedAt desc`. Hvis ingen items: kortet rendres ikke (eller viser kort tom-state — vi velger å ikke rendre for å unngå støy).
- FR5: Sync API — alle adaptere returnerer `NewsItem[]` direkte (static-first per ADR-001).

## 6. Non-functional requirements
- **Trygg å utvide**: ny adapter = legg til implementasjon i `news/`-mappen + registrer i `news/index.ts`. Ingen endring til consumers.
- **Performance**: aggregering er O(N adaptere); for én adapter er det trivielt.
- **Tilgjengelighet**: card er semantisk (article/section), headline rendres som heading-level passende.

## 7. Data contracts

```ts
// web-app/src/lib/news/types.ts
export interface NewsItem {
  ticker: string;          // uppercase
  headline: string;
  source: string;          // adapter name; e.g. "report-catalyst", "yahoo", "manual"
  confidence: number;      // 0..1
  publishedAt?: string;    // ISO-8601
  sourceUrl?: string;      // optional link to original source
}

export interface NewsAdapter {
  readonly name: string;
  getNewsForTicker(symbol: string): NewsItem[];
}

// web-app/src/lib/news/index.ts
export function getNewsForTicker(symbol: string): NewsItem[];
export function registerAdapter(adapter: NewsAdapter): void;
```

## 8. UX notes
- **LatestIntelligenceCard**: accent-left Card med eyebrow Tag "LATEST INTELLIGENCE", h2 = headline, body = small "Source: {source}, {publishedAt}".
- Render bare hvis `getNewsForTicker(symbol).length > 0`.

## 9. Acceptance criteria
- [ ] AC1: `getNewsForTicker("NVDA")` returnerer minst 1 item hvis dagens rapport har NVDA i catalysts.
- [ ] AC2: `getNewsForTicker("UNKNOWN")` returnerer `[]`.
- [ ] AC3: `/ticker/NVDA` viser LatestIntelligenceCard øverst hvis catalyst eksisterer; ingen kort hvis ikke.
- [ ] AC4: tsc + build pass.
- [ ] AC5: STATUS.md oppdatert.

## 10. Test plan
- Unit (manual): NVDA i catalysts → 1 item, UNKNOWN → 0 items.
- Manual: åpne `/ticker/[catalysts-ticker]` og verifiser kortet vises; åpne `/ticker/[non-catalysts-ticker]` og verifiser at kortet er fraværende.

## 11. Rollout plan
- Én commit. No deps. Rollback = revert.

## 12. Risks
- **Risiko**: Adapter-mønsteret kan virke over-engineered når vi bare har én kilde i dag.
  **Mitigasjon**: kontrakten er minimal (én metode), kostnaden er ~50 LOC. Kostnaden av refactor senere er større.
- **Risiko**: `confidence: 1` for alle catalyst-items er kanskje urealistisk.
  **Mitigasjon**: confidence-skalaen er for fremtidig differensiering — i dag har vi kun én kilde, så scoring brukes ikke til å diskriminere ennå.
