# v3 Architecture Decisions (ADR-lite)

## ADR-001 — Static-first report pipeline
- **Decision:** Behold rapportgenerering via scripts + statiske JSON-filer.
- **Why:** Lav kost, høy robusthet, rask side-last.
- **Tradeoff:** Mindre realtime interaktivitet uten ekstra tjenester.

## ADR-002 — Local-first user data for MVP
- **Decision:** Watchlist/portfolio/notes lagres i localStorage først.
- **Why:** Ingen auth-friksjon, rask iterasjon.
- **Tradeoff:** Ingen sync mellom enheter i MVP.

## ADR-003 — Supabase as optional sync layer
- **Decision:** Ikke krav i v3 runtime; kun future-ready schema/plan.
- **Why:** Unngå å blokkere MVP bak backend/auth.
- **Tradeoff:** Migrering må planlegges senere.

## ADR-004 — Spec-first incremental delivery
- **Decision:** Alle større features skal ha egen spec med AC/testplan.
- **Why:** Bedre koordinering mellom flere agenter/sesjoner.
- **Tradeoff:** Litt mer upfront dokumentasjon.

## ADR-005 — v3 shell navigation as stable contract
- **Decision:** Seks toppnivå ruter holdes stabile: Dashboard, Reports, Watchlist, Portfolio, Tickers, Settings.
- **Why:** Gir konsistent IA mens features bygges inkrementelt.
- **Tradeoff:** Noen sider starter som placeholders.

## ADR-006 — v3 frontend canonicalised on `web-app/` (Next.js); `web-next/` archived
- **Decision:** `web-app/` (Next.js App Router + TypeScript + Tailwind) is the single canonical frontend for v3. `web-next/` (Astro mirror) and its two CI workflows (`web-next-preview.yml`, `web-next-production.yml`) are removed on 2026-05-09.
- **Why:** Two parallel implementations of the same components were diverging. Brief §21.1 recommends Next.js. v3 features (watchlist CRUD, paste/import, ticker notes, latest-vs-previous compare) are React-app patterns rather than static-content-with-islands.
- **Tradeoff:** Lose Astro's lighter static output. The migration scripts in `scripts/` (`parity-check.js`, `post-cutover-verify.js`, `visual-regression-snapshot.js`, `monitor-health.js`) still reference web-next paths and are now no-ops; cleaning them is a follow-up chore.
