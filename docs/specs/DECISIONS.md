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
- **Tradeoff:** Lose Astro's lighter static output. The migration scripts in `scripts/` (`parity-check.js`, `post-cutover-verify.js`, `visual-regression-snapshot.js`, `monitor-health.js`) referenced web-next paths and were dead code. **Resolved 2026-05-10 in `0b1cdfb`** — scripts deleted, `monitor-health.yml` removed, `validate-and-build.yml` parity-check step removed.

## ADR-007 — Stitch tokens layered atop shadcn `.dark` via Tailwind v4 `@theme` (2026-05-10)
- **Decision:** Lift the entire Stitch token config (50+ colors, custom spacing, type scale) into `web-app/src/app/globals.css` using Tailwind v4 `@theme` syntax — not a v3 JS `tailwind.config.ts`. Inside `.dark`, override shadcn semantic tokens (`--card`, `--primary`, `--muted`, `--border`, `--ring`) to point at Stitch palette values. Leave `:root` (light mode) using the original shadcn oklch defaults.
- **Why:** web-app is on Tailwind v4, which moved theme config from JS into CSS-only `@theme`. The Stitch handoff predates that and uses v3 JS config — a 1:1 lift was not possible. Layering the tokens (rather than replacing) keeps existing shadcn-using components functional and makes the dark-mode visual unification automatic; components reading `bg-card` pick up Stitch surface (`#1E293B`) without code changes.
- **Tradeoff:** Light mode is intentionally mismatched. Stitch is dark-only in the handoff; primitives that use Stitch-specific tokens (`bg-surface-variant`, `text-status-own`, regime/status colors) render their dark colors in light mode too. Either drop the light-mode toggle or design a light palette as a follow-up; not in SPEC-011 scope.

## ADR-008 — Lucide icons replace Material Symbols icon font (2026-05-10)
- **Decision:** Use `lucide-react` for all icons in v3 components. Map Stitch HTML icon names (`keyboard_double_arrow_up`, `drag_handle`, `arrow_upward`, etc.) to Lucide equivalents in component code. Do not load the Material Symbols icon font globally.
- **Why:** Material Symbols full set is ~600KB. `lucide-react` is already in the dependency tree, tree-shakable, and ships only the icons that are imported. The icon names in Stitch HTML are illustrative — visual parity matters, exact name fidelity does not.
- **Tradeoff:** The Stitch source HTML can't be copy-pasted directly into JSX without a name swap. Mappings are documented in `design/stitch/README.md` §8.

## ADR-009 — SPEC-011 ownership: codex-agent → claude-code (2026-05-10)
- **Decision:** SPEC-011 (Stitch design integration) is now owned by `claude-code` per user direction. STATUS.md updated.
- **Why:** Both agents needed to touch the same theme + primitives files. Single ownership avoids parallel diverging implementations.
- **Tradeoff:** `codex-agent` retains SPEC-003 (dashboard cards). When SPEC-003's dashboard work resumes, it will consume the primitives shipped under SPEC-011 — coordinate by reading `design/stitch/README.md` §4-5 first.
