# v3 Architecture Decisions (ADR-lite)

## ADR-001 — Static-first report pipeline
- **Decision:** Behold rapportgenerering via scripts + statiske JSON-filer.
- **Why:** Lav kost, høy robusthet, rask side-last.
- **Tradeoff:** Mindre realtime interaktivitet uten ekstra tjenester.
- **Current scope (2026-11-14):** SPEC-022 retired report generation. The static-first principle now applies to `scripts/fetch-quotes.py` → `data/quotes/` + `data/company/` → Next.js export → Cloudflare Pages. See ADR-010 and [SPEC-033](033-app-architecture-target.md); do not restore the report pipeline from this historical wording.

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
- **Superseded route inventory (2026-11-14):** Current top-level routes are Dashboard, Watchlist, Portfolio, Tickers, Research, Strategies, and Settings. Reports was retired. Preserve current URLs through the revamp; the UX work may refine labels. Detail and local-only fallback boundaries are defined in [SPEC-033 §4](033-app-architecture-target.md#4-routes-shell-and-static-data-contracts).

## ADR-006 — v3 frontend canonicalised on `web-app/` (Next.js); `web-next/` archived
- **Decision:** `web-app/` (Next.js App Router + TypeScript + Tailwind) is the single canonical frontend for v3. `web-next/` (Astro mirror) and its two CI workflows (`web-next-preview.yml`, `web-next-production.yml`) are removed on 2026-05-09.
- **Why:** Two parallel implementations of the same components were diverging. Brief §21.1 recommends Next.js. v3 features (watchlist CRUD, paste/import, ticker notes, latest-vs-previous compare) are React-app patterns rather than static-content-with-islands.
- **Tradeoff:** Lose Astro's lighter static output. The migration scripts in `scripts/` (`parity-check.js`, `post-cutover-verify.js`, `visual-regression-snapshot.js`, `monitor-health.js`) referenced web-next paths and were dead code. **Resolved 2026-05-10 in `0b1cdfb`** — scripts deleted, `monitor-health.yml` removed, `validate-and-build.yml` parity-check step removed.

## ADR-007 — Stitch tokens layered atop shadcn `.dark` via Tailwind v4 `@theme` (2026-05-10)
- **Decision:** Lift the entire Stitch token config (50+ colors, custom spacing, type scale) into `web-app/src/app/globals.css` using Tailwind v4 `@theme` syntax — not a v3 JS `tailwind.config.ts`. Inside `.dark`, override shadcn semantic tokens (`--card`, `--primary`, `--muted`, `--border`, `--ring`) to point at Stitch palette values. Leave `:root` (light mode) using the original shadcn oklch defaults.
- **Why:** web-app is on Tailwind v4, which moved theme config from JS into CSS-only `@theme`. The Stitch handoff predates that and uses v3 JS config — a 1:1 lift was not possible. Layering the tokens (rather than replacing) keeps existing shadcn-using components functional and makes the dark-mode visual unification automatic; components reading `bg-card` pick up Stitch surface (`#1E293B`) without code changes.
- **Tradeoff:** Light mode was intentionally mismatched until the follow-up landed.
- **Follow-up (2026-05-15):** Light palette designed. `@theme inline` colors now reference `--st-*` indirection vars defined in both `:root` (light: white surfaces, slate-900 text, brand/regime colors darkened for contrast) and `.dark` (preserves SPEC-011 Stitch dark values byte-for-byte). `ThemeProvider` drops `forcedTheme="dark"`; `enableSystem` is on; default is dark. New `ThemeToggle` (Sun/Moon, `next-themes`) lives in TopBar. Recharts `stroke` props on `PriceChart` and `BacktestChart` migrated from hardcoded `rgba(255,255,255,...)` / `#94a3b8` to `var(--color-*)` so axes/grid flip with the theme. Risk-on/off chart fills (`#10b981`/`#ef4444`) stay constant — they're semantic and read well on both backgrounds.

## ADR-008 — Lucide icons replace Material Symbols icon font (2026-05-10)
- **Decision:** Use `lucide-react` for all icons in v3 components. Map Stitch HTML icon names (`keyboard_double_arrow_up`, `drag_handle`, `arrow_upward`, etc.) to Lucide equivalents in component code. Do not load the Material Symbols icon font globally.
- **Why:** Material Symbols full set is ~600KB. `lucide-react` is already in the dependency tree, tree-shakable, and ships only the icons that are imported. The icon names in Stitch HTML are illustrative — visual parity matters, exact name fidelity does not.
- **Tradeoff:** The Stitch source HTML can't be copy-pasted directly into JSX without a name swap. Mappings are documented in `design/stitch/README.md` §8.

## ADR-009 — SPEC-011 ownership: codex-agent → claude-code (2026-05-10)
- **Decision:** SPEC-011 (Stitch design integration) is now owned by `claude-code` per user direction. STATUS.md updated.
- **Why:** Both agents needed to touch the same theme + primitives files. Single ownership avoids parallel diverging implementations.
- **Tradeoff:** `codex-agent` retains SPEC-003 (dashboard cards). When SPEC-003's dashboard work resumes, it will consume the primitives shipped under SPEC-011 — coordinate by reading `design/stitch/README.md` §4-5 first.

## ADR-010 — Preserve one static Pages deployment (2026-11-14)
- **Decision:** Keep `web-app/` as the canonical app, `output: "export"`, and `web-app/out` as the Pages artifact. Keep the daily quote/company ingestion job and its explicit build/deploy step. No runtime backend, OpenNext Worker migration, or live feed is required by the revamp.
- **Why:** Existing routes and local workflows fit build-time market data plus browser persistence.
- **Tradeoff:** Unknown local symbols need an exported client fallback; quotes update only with a new deployment. Company-data triggers and preview branch selection need correction.
- **Status:** Target contract; implementation and cleanup gates are in [SPEC-033](033-app-architecture-target.md). Existing OpenNext commands are conditional cleanup, not the canonical deployment path.

## ADR-011 — Enforce UI, domain, application, storage, and build-loader boundaries (2026-11-14)
- **Decision:** Routes compose static DTOs; feature hooks own view/draft state; pure domain modules own validation and calculations; application functions coordinate operations through narrow repository ports. Browser adapters own persistence and effects; build-only loaders own filesystem access. Move mixed loader/types apart first.
- **Why:** Existing functions are reusable, but large research clients and side-effecting helpers blur ownership.
- **Tradeoff:** Temporary forwarding exports remain during vertical migration. No generic repository framework, global state rewrite, or speculative asynchronous conversion of every local store.
- **Status:** Target; [SPEC-033 §3–5](033-app-architecture-target.md#3-target-module-map-and-allowed-dependencies) defines the module map and operation ownership. Extend SPEC-016 contracts deliberately; a future remote repository is not automatically a drop-in replacement.

## ADR-012 — Preserve local wire formats before migrating data (2026-11-14)
- **Decision:** Retain all existing keys, shapes, and IndexedDB v1 records during extraction. Introduce a shared storage registry, explicit read/write failures, and recoverable versioned migration/restore operations before changing formats. Continue accepting `investment-report-v1`; omitted datasets do not authorize deletion. Complete backup must include thesis/review data and original attachment bytes.
- **Why:** Current stores can hide failed writes, and the current backup omits important personal data. Multi-key localStorage writes are not atomic.
- **Tradeoff:** Recovery journals and scoped confirmations add work. No new database or cloud sync is needed. Incompatible format or origin changes require their own tested recovery path.
- **Status:** Target; see [SPEC-033 §6](033-app-architecture-target.md#6-local-compatibility-and-migration-contract). ADR-002 remains in effect; ADR-003 remains deferred.

## ADR-013 — Single ownership for calculations and derived alerts (2026-11-14)
- **Decision:** Centralize valuation, currency grouping, rounding policy, backtest rules, and alert derivation in pure domain functions with explicit inputs. Keep display formatting separate. Monitoring stamps must not update authored research age. Derive shared alert state rather than persist a dashboard-owned count.
- **Why:** The current portfolio sums different currencies, and zone stamping refreshes thesis `updatedAt`. These are correctness risks independent of presentation.
- **Tradeoff:** Preserve persisted numeric values while specifying/test-driving arithmetic corrections; a decimal storage change is a separate migration. Currency conversion remains unsupported without explicit FX inputs.
- **Status:** Target; downstream fixtures and migration boundaries are specified in [SPEC-033](033-app-architecture-target.md).

## ADR-014 — Offline capability and legacy removal must be explicit (2026-11-14)
- **Decision:** Preserve loaded local workflows without network access. Reliable offline reopening requires a separately validated, versioned static-asset cache; it is not a capability of localStorage alone. Keep production origin stable. Classify legacy root assets separately from generated or unreferenced files.
- **Why:** No offline shell cache was found, and old hosting/external URL usage cannot be inferred from app imports. Browser data does not transfer with a redirect to a new origin.
- **Tradeoff:** Root-site cleanup retains the classification-approval gate in BACKLOG.md. Old-origin export/import and URL policy must precede retirement; no such approval or deletion occurs in this architecture task.
- **Status:** Target and cleanup constraints; see [SPEC-033 §7–8](033-app-architecture-target.md#7-offline-deployment-and-trust-boundaries).
