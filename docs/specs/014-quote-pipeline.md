# [SPEC-014] Daily Quote Pipeline (yfinance → data/quotes/)

## 1. Context
v4-pivot beslutning (2026-05-10): drop the rule-based Alpha/Beta/Gamma report cron, build a Google-Finance-style cockpit anchored on daily-refreshed quote data. Existing `scripts/fetch-snapshot.py` pulls live quotes via yfinance; we extend the pattern to fetch and persist 1y of OHLCV + meta per ticker.

ADR-001 holds: static-first pipeline. Frontend reads `data/quotes/SYMBOL.json` at build/runtime. ADR-002 holds: local-first user data. SPEC-014 is purely the public market-data layer.

## 2. Problem
v3 has no historical price data structured for charting or comparative analysis. `data/by-ticker/SYMBOL.json` has a list of *report mentions*, not OHLCV. Without a quote series, `/ticker/[symbol]` cannot render a price chart, watchlist cannot show day deltas, portfolio cannot compute P&L.

## 3. Scope

### In scope
- `scripts/fetch-quotes.py` — Python script using yfinance.
- Output `data/quotes/SYMBOL.json` per ticker with `~1y` OHLCV + meta.
- A canonical ticker list (single source of truth) reused by current snapshot script too — extracted to `scripts/_tickers.py`.
- npm script alias `npm run fetch:quotes` (or extend `report` script).
- CI workflow extension: add a daily quote-refresh job to `.github/workflows/daily-report.yml` (or new workflow), running once per day.
- Spec doc + STATUS.md row.

### Out of scope
- Frontend chart/UI consuming the data — SPEC-015.
- Real-time / intraday updates.
- Fundamentals beyond what `yfinance.Ticker.info` exposes (we keep what's available, no extra source).
- Currency conversion across multi-listing tickers.
- Adjustments for splits / dividends — yfinance `auto_adjust=True` handles this.
- Backtest data integrity / corporate-actions audit — sufficient for daily-glance use case.

## 4. User stories
- Som bruker vil jeg åpne `/ticker/NVDA` og se en pris-graf for siste år, slik at jeg kan se trend og volatilitet.
- Som bruker vil jeg se day-delta % på watchlist-rader, slik at watchlisten føles levende.
- Som framtidig backtest-engine vil jeg ha en konsistent OHLCV-array å iterere over per symbol.

## 5. Functional requirements
- FR1: `python scripts/fetch-quotes.py` fetcher 1 year daily OHLCV for hver ticker i ticker-listen og skriver `data/quotes/SYMBOL.json`.
- FR2: Hver fil har `meta` (name, currency, exchange, sector, industry, marketCap, peRatio, dividendYield) og `daily` (chronologisk array).
- FR3: `daily[]`-entries har `{ date: YYYY-MM-DD, open, high, low, close, volume }`.
- FR4: Skriptet er idempotent — kjøring overskriver eksisterende fil.
- FR5: Failure for én ticker stopper ikke resten; loggføres til stderr.
- FR6: `meta.generatedAt` ISO timestamp of fetch.
- FR7: `--symbols` flag for å fetche bare et subset (debug / single-ticker refresh).
- FR8: Eksisterende ticker-listen i `scripts/fetch-snapshot.py` flyttes til `scripts/_tickers.py` og importeres av begge skriptene.

## 6. Non-functional requirements
- **Robusthet**: nettverksfeil per-ticker logges men feiler ikke jobben.
- **Performance**: 24 tickers × ~1y daily ≈ ~6000 datapunkter; under 30s totalt på god linje.
- **Filstørrelse**: hver SYMBOL.json ~50-80 KB JSON. 24 tickere = ~1.5 MB i repo. Akseptabelt; Git tåler det.

## 7. Data contracts

```ts
// frontend type, mirrored in TS
export interface QuoteMeta {
  name?: string;
  currency?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  generatedAt: string;     // ISO 8601 UTC
}

export interface QuoteBar {
  date: string;            // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuoteSeries {
  symbol: string;
  meta: QuoteMeta;
  daily: QuoteBar[];       // chronological asc
}
```

## 8. Acceptance criteria
- [ ] AC1: `python scripts/fetch-quotes.py` exits 0, writes 24 JSON files under `data/quotes/`.
- [ ] AC2: `data/quotes/NVDA.json` har `meta.name === "NVIDIA Corporation"` (or similar) og `daily.length >= 200` (markedsåpne dager i 1y).
- [ ] AC3: `daily[0].date < daily[daily.length - 1].date` (chronological asc).
- [ ] AC4: Script handler 1+ ticker-fail uten å avbryte resten (manuell test ved å forspesifisere et ugyldig symbol).
- [ ] AC5: STATUS.md SPEC-014-rad oppdatert.

## 9. Test plan
- **Manual run**: `python scripts/fetch-quotes.py --symbols NVDA` skal produsere `data/quotes/NVDA.json` med valid shape.
- **Full run**: `python scripts/fetch-quotes.py` (alle tickere).
- **Schema sanity**: åpne `NVDA.json`, verifiser nøkler og datapunkter.

## 10. Rollout plan
- Én commit. Kjør script lokalt, commit JSON-filene + scriptet samtidig.
- CI extension er separat commit eller follow-up — det handles i SPEC-022 (sunset reports + replace cron).

## 11. Risks
- **Risiko**: yfinance er unofficial; API kan endre seg eller stoppe.
  **Mitigasjon**: failure tolerated; switching adapters senere er ~50 LOC. Vurder Alpha Vantage / Twelve Data / Stooq fallback i SPEC-026.
- **Risiko**: yahoo info-felter har upålitelig fundamentals (marketCap kan være None for indekser).
  **Mitigasjon**: alle meta-felter er optional; UI rendrer "—" hvis fraværende.
- **Risiko**: Repo-størrelse vokser ~1.5 MB pr fetch hvis vi committer etter hver kjøring.
  **Mitigasjon**: cron-driven daily commit (samme mønster som rapport-jobben hadde). Ikke et MVP-problem.
