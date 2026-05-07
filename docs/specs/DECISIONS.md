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
