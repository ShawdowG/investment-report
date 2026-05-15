# [SPEC-012] Supabase Schema Draft (Future-Ready Sync Layer)

## 1. Context
ADR-002 fastslår at watchlist/portfolio/notes lagres lokalt i MVP. ADR-003 reserverer Supabase som *optional sync layer* — ikke runtime-krav, men vi vil ha schemaet ferdig så swap-en blir lav-risiko når auth lander. SPEC-016 leverte allerede typed `Repository`-kontrakter på TypeScript-siden (`web-app/src/lib/storage/contracts.ts`); denne specen er CRD-siden av samme kontrakt.

Status i dag (2026-05-15): ingen Supabase-prosjekt finnes ennå. All bruker-data sitter i `localStorage` på enheten. Denne specen produserer **kun et SQL-utkast + sync-plan** — ingen runtime-kode, ingen migrasjon kjøres.

## 2. Problem
Når sync blir aktuelt (mest sannsynlig når brukeren vil ha tilgang på mobil og desktop samtidig, eller når noen flere brukere kommer inn), trenger vi:
1. Tabeller som matcher TypeScript-domenetypene 1:1 så `Repository`-impl-en kan mappe trivielt.
2. Row-level security som binder data til `auth.uid()` så bruker A aldri ser bruker Bs data.
3. En klar plan for *hva* som skal synces (user state) vs. *hva* som forblir read-only build artifacts (`data/quotes/*.json` fra `scripts/fetch-quotes.py`).

Uten dette utkastet risikerer vi at fremtidig backend-jobb blokkerer bak schema-design og at vi tar feil avgjørelser om hvor grensen mellom client og server går.

## 3. Scope

### In scope
- SQL DDL for 6 tabeller: `watchlist_items`, `portfolio_positions`, `ticker_notes`, `research_dispatches`, `strategies`, `quote_snapshots` (cache, optional).
- RLS-policy skisse for hver tabell (auth.uid()-binding).
- Mapping fra dagens domenetyper → kolonner.
- Sync-strategi notater: hvilke tabeller er bruker-eide (synces), hvilke er build artifacts (forblir filer i repo).
- ENUM-definisjoner for `watchlist_status`, `watchlist_priority`, `strategy_type`, `position_sizing_type`.

### Out of scope
- Faktisk migrasjon kjørt mot et Supabase-prosjekt — venter på auth-spec.
- Endring av eksisterende client-side stores.
- Async-versjoner av `Repository`-kontraktene (SPEC-016 §3 noterer at sync→async-bytte er fremtidig single-file-endring).
- Multi-user / sharing semantics (egne dispatcher synlige for andre, team-portfolios osv.).
- Realtime-subscriptions (Postgres → client via Supabase Realtime).
- Audit logs / row history.
- Quotes som ekte tabell heller enn cache — yfinance-pipelinen er nok som primær kilde inntil videre.

## 4. User stories
- Som bruker, vil jeg at watchlist/portfolio/notes synker mellom enhetene mine, slik at jeg ikke mister state når jeg bytter laptop eller åpner appen på mobil.
- Som utvikler, vil jeg ha schemaet ferdig før auth-arbeidet starter, slik at Supabase-implementasjonen blir 1-2 dager, ikke en uke.

## 5. Data contracts

### 5.1 Enums

```sql
create type watchlist_status as enum ('own', 'watching', 'research', 'avoid');
create type watchlist_priority as enum ('high', 'med', 'low');
create type strategy_type as enum ('buy-hold', 'ma-crossover', 'rsi', 'price-threshold');
create type position_sizing_type as enum ('equal-weight', 'fixed-dollar');
```

Verdiene er hentet direkte fra TypeScript-domenetypene (`WatchlistStatus`, `WatchlistPriority`, `StrategyType`, `PositionSizing["type"]`). Drift sjekkes manuelt ved spec-revisjon.

### 5.2 `watchlist_items`

Maps til `WatchlistItem` (`web-app/src/lib/domain/watchlist.ts`).

```sql
create table watchlist_items (
  user_id      uuid not null references auth.users(id) on delete cascade,
  symbol       text not null,
  status       watchlist_status,
  priority     watchlist_priority,
  tags         text[],
  added_at     timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, symbol)
);

create index watchlist_items_user_idx on watchlist_items (user_id);
```

Notater:
- Komposittnøkkel `(user_id, symbol)` matcher invariant i `watchlist-store.ts` (symbol er unik per bruker).
- `tags text[]` heller enn join-tabell — tags er bare strings <= 20 tegn, ingen taxonomi.
- `added_at` mapper til `WatchlistItem.addedAt`; `updated_at` er nytt server-side felt (sortering, conflict resolution).

### 5.3 `portfolio_positions`

Maps til `PortfolioPosition` (`web-app/src/lib/domain/portfolio.ts`).

```sql
create table portfolio_positions (
  user_id      uuid not null references auth.users(id) on delete cascade,
  symbol       text not null,
  quantity     numeric(20, 8) not null check (quantity > 0),
  avg_price    numeric(20, 8) not null check (avg_price >= 0),
  platform     text,
  added_at     timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, symbol)
);
```

Notater:
- `numeric(20, 8)` for både quantity og avg_price — håndterer brøk-aksjer og krypto-presisjon uten å være ekstravagant.
- En posisjon per symbol per bruker. Hvis vi senere vil ha flere lots med ulik avg_price, blir nøkkelen `(user_id, symbol, lot_id)`.

### 5.4 `ticker_notes`

Maps til `TickerNote` (`web-app/src/lib/domain/ticker-note.ts`).

```sql
create table ticker_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  symbol       text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index ticker_notes_user_symbol_idx on ticker_notes (user_id, symbol, created_at desc);
```

Notater:
- Egen `id` (uuid) — ticker_notes er append-only (no edit, kun delete) i dagens MVP, så surrogate key er enklest.
- Index på `(user_id, symbol, created_at desc)` for å hente nyeste først i UI.

### 5.5 `research_dispatches`

Maps til `ResearchDispatch` (`web-app/src/lib/domain/research-dispatch.ts`).

```sql
create table research_dispatches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  body         text not null,
  ticker       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index research_dispatches_user_idx on research_dispatches (user_id, created_at desc);
create index research_dispatches_ticker_idx on research_dispatches (user_id, ticker) where ticker is not null;
```

Notater:
- `ticker` nullable — dispatcher uten ticker er gyldige (markedskommentar, makro).
- Partial index for ticker-spesifikke spørringer (per-ticker dispatch-listen på `/ticker/[symbol]`).

### 5.6 `strategies`

Maps til `Strategy` union (`web-app/src/lib/domain/strategy.ts`). Polymorph type, så vi bruker `type` + `params jsonb`.

```sql
create table strategies (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  type               strategy_type not null,
  symbols            text[] not null,
  initial_capital    numeric(20, 2) not null check (initial_capital > 0),
  position_sizing    jsonb not null,
  start_date         date,
  end_date           date,
  params             jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

create index strategies_user_idx on strategies (user_id, created_at desc);
```

Notater:
- `params jsonb` håndterer type-spesifikke felter (`shortPeriod`/`longPeriod` for `ma-crossover`, `period`/`buyThreshold`/`sellThreshold` for `rsi`, `buyPrice`/`sellPrice` for `price-threshold`). Validering skjer i client-side `Repository`-impl (samme som i dag).
- `position_sizing jsonb` framfor å splitte i kolonner — er en discriminated union (`equal-weight | fixed-dollar { fixedAmount }`).

### 5.7 `quote_snapshots` (optional cache)

Avgjørelsen rundt quotes er **at de forblir build artifacts** (`data/quotes/SYMBOL.json` fra `scripts/fetch-quotes.py`, committet til repo). En `quote_snapshots`-tabell vurderes kun hvis:
- Vi vil at brukere skal kunne legge til tickers utenfor de 23 canonical-listene.
- Vi trenger pre-aggregert per-bruker quote-view (f.eks. "show me only the symbols in MY watchlist").

Inntil videre: ikke i scope.

## 6. Row-level security

Hver tabell får samme grunnmønster:

```sql
alter table watchlist_items enable row level security;

create policy "watchlist_items: read own"
  on watchlist_items for select
  using (auth.uid() = user_id);

create policy "watchlist_items: write own"
  on watchlist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Gjelder identisk for `portfolio_positions`, `ticker_notes`, `research_dispatches`, `strategies`.

Notater:
- Ingen public read — alt er per-user.
- `with check` på write hindrer en bruker fra å sette `user_id` til en annen.
- Anonyme brukere har null tilgang. App må gate Supabase-kall bak auth-state.

## 7. Sync-plan

Når Supabase-impl-en lander (egen spec, antakelig SPEC-024+):

1. **Auth først** — Supabase Auth med magic link eller OAuth. Ingen sync uten innlogget bruker.
2. **Repository-swap** — ny modul `web-app/src/lib/storage/supabase-repos.ts` eksporterer samme navn som de 5 lokale store-filene. SPEC-016 `_conforms`-assertions sikrer signatur-match.
3. **Async overgang** — `Repository`-interfaces blir Promise-returning. Single-file-endring i `contracts.ts`, deretter `tsc` driver oppdatering av alle call sites.
4. **One-time import** — knapp på `/settings` ("Sync to cloud") leser hele localStorage og POST-er rader. Idempotent (upsert på `(user_id, symbol)` der relevant).
5. **Conflict resolution** — last-write-wins via `updated_at`. Akseptabel siden brukere primært jobber på én enhet av gangen i MVP.
6. **Offline-modus** — ikke i scope første runde. Hvis nettet faller, lar vi UI-en feile høyt.

Build artifacts (`data/quotes/*.json`, `data/by-ticker/*.json`) forblir på filsystemet — committed til repo, deployes med Cloudflare Pages. Ingen Supabase-rolle for disse.

## 8. Acceptance criteria
- [ ] AC1: Specen lever som `docs/specs/012-supabase-schema.md` med komplett DDL for 6 tabeller (5 user-data + 1 dokumentert som out-of-scope).
- [ ] AC2: Hver enum-verdi i SQL matcher dagens TypeScript-domenetyper (manuell sjekk).
- [ ] AC3: STATUS.md SPEC-012-row oppdatert (`✅ done`, kommit-hash når commit lander).
- [ ] AC4: Ingen runtime-endringer — `web-app/`, `scripts/`, `data/` urørt.

## 9. Test plan
- Ingen runtime → ingen unit/component/e2e.
- Validering: leses sammen med `web-app/src/lib/domain/*.ts` for å bekrefte 1:1 mapping. Når Supabase-implementasjonen kommer, blir `_conforms`-pattern + integration-tests det som faktisk fanger drift.

## 10. Rollout plan
- Spec-only. Ingen feature flag, ingen migrasjon kjøres.
- Når SPEC-024 (auth) eller equivalent lander: kjør DDL-en herfra mot Supabase-prosjekt, deretter implementer `supabase-repos.ts`.

## 11. Risks
- **Risiko:** TypeScript-domenetyper drifter (ny felt) uten at specen oppdateres. Når Supabase-impl-en kommer, oppdager vi avviket sent.
  **Mitigasjon:** Når neste domenetype-endring lander, oppdateres denne specen i samme commit. SPEC-016 `_conforms` fanger client-side drift; schema-drift må fanges manuelt inntil vi har kjørt mot ekte database.
- **Risiko:** `numeric(20, 8)` er for snevert/bredt for portfolio-presisjon.
  **Mitigasjon:** 20 sifre totalt med 8 desimaler dekker krypto-presisjon (8 desimaler = satoshi-nivå) og samtidig markedsverdier opp til ~$10^12. Justeres ved behov.
- **Risiko:** `strategies.params jsonb` mister type-safety på server-siden.
  **Mitigasjon:** Validering forblir i `Repository`-impl. Hvis vi en dag vil ha server-side analytics på strategy-params, kan vi rette ut til kolonner per strategy_type — koster en migrasjon.
