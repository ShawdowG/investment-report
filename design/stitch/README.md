# Stitch Design Handoff

Four screens delivered as Tailwind-CDN HTML. Stored verbatim as the visual source of truth for SPEC-011. **Not** imported, rendered, or referenced at runtime — these files exist purely as design reference. The production app lives in `web-app/` and consumes the same tokens via Tailwind config.

## Files

| File | Screen | Notes |
|---|---|---|
| `dashboard.html` | Dashboard | Bento grid: Latest Report (span-8), Top Movers (span-4), Watchlist Impact (span-12) |
| `watchlist.html` | Master Watchlist | Table with Status / Priority / Last Px / Tags + "Filter" and "Paste / Import" CTAs |
| `ticker-detail.html` | Ticker page (NVDA example) | Header (symbol + price + chips), Latest Intelligence (accent-left card), Report Mentions table, Personal Notes widget |
| `portfolio.html` | Portfolio | Total Holdings header, Portfolio Impact bento (highlighted vs neutral cards), Current Positions table |

## Design tokens

The `tailwind.config = {…}` block is **identical across all four files**. When SPEC-011 implementation begins, lift this config **once** into `web-app/tailwind.config.ts`. Do not re-declare per file. Tokens to lift:

- **Colors** (~50 keys, Material 3-style semantic naming):
  - Surfaces: `background` `#0F172A`, `surface` `#1E293B`, `surface-variant` `#32353c`, `surface-bright` `#363941`, `surface-elevated` `#334155`, `surface-dim` `#10131a`, `surface-container-{lowest,low,,high,highest}`
  - Text: `text-primary` `#F8FAFC`, `text-secondary` `#94A3B8`, `on-surface`, `on-surface-variant`
  - Borders: `border-subtle` `rgba(255,255,255,0.08)`, `outline`, `outline-variant`
  - Brand/Primary: `primary` `#adc6ff`, `primary-container` `#4d8eff`, `on-primary`, `on-primary-container`, `surface-tint`
  - Regime: `regime-risk-on` `#10B981`, `regime-risk-off` `#EF4444`, `regime-neutral` `#F59E0B`
  - Status (watchlist/portfolio item state): `status-own` `#10B981`, `status-watching` `#6366F1`, `status-avoid` `#64748B`
  - Errors and tertiary tones for chips/badges
- **Spacing**: `gutter` `1.5rem`, `card-padding` `1.25rem`, `stack-gap` `1rem`, `table-row-height` `48px`, `container-max` `1280px`, `margin-mobile` `1rem`
- **Border radius**: `DEFAULT` `0.25rem`, `lg` `0.5rem`, `xl` `0.75rem`, `full` `9999px`
- **Font families**: `Inter` (body / badge), `Manrope` (h1 / h2), `Work Sans` (data-mono / label-caps)
- **Font sizes** (semantic tokens with line-height + letter-spacing baked in):
  - `h1` 24/32, `h2` 20/28
  - `body-main` 16/24, `body-compact` 14/20
  - `data-mono` 14/20 +0.01em
  - `label-caps` 12/16 +0.05em (use with `uppercase`)
  - `badge` 11/12

## Component inventory

Patterns observed across the four screens. Build these once; compose features from them.

### Layout (`web-app/src/components/layout/`)
| Component | Responsibility |
|---|---|
| `AppShell` | Side nav (md+) + sticky top bar + scrollable main; mobile collapses sidebar to drawer |
| `Sidebar` | 6 fixed nav items (Dashboard / Reports / Watchlist / Portfolio / Tickers / Settings), active highlight via `bg-primary-container text-on-primary-container`, Settings pinned to bottom on tall screens |
| `TopBar` | Search input (md+), notifications + account icons; mobile shows brand text instead of search |

### UI primitives (`web-app/src/components/ui/`)
| Component | Variants | Notes |
|---|---|---|
| `Card` | `default` / `accentLeft` / `accentTop` | Base = `bg-surface border border-border-subtle rounded-xl p-card-padding`. Accent = absolute 1px bar in `bg-primary` |
| `SectionHeader` | – | h2 + caption + optional CTA on the right |
| `StatusBadge` | `own` / `watching` / `research` / `avoid` | Uses `status-*` colors with 10% bg + 20% border |
| `RegimeDot` | `risk-on` / `risk-off` / `neutral` | 8px dot + label, paired with optional caption |
| `PriorityBadge` | `high` / `med` / `low` | Icon (`keyboard_double_arrow_up` / `drag_handle` / `keyboard_arrow_down`) + label |
| `Tag` | – | Neutral chip: `px-2 py-0.5 bg-surface-variant rounded text-xs border border-border-subtle` |
| `IconButton` | – | Circular hover bg, icon-only, used in TopBar and table actions |
| `TickerCell` | `compact` / `with-letters` | Reused in tables and movers list. `with-letters` adds an 8x8 letter tile |
| `DataTable` | – | Headless table primitive; consumers pass column defs and rows. Header style: `font-label-caps uppercase text-text-secondary`. Row: `h-table-row-height divide-y divide-border-subtle hover:bg-surface-variant/30` |
| `MoverRow` | – | Composition of TickerCell + price + delta% (sign-colored). Used in Top Movers. |
| `Sentiment` | `bullish` / `bearish` / `neutral` | Inline arrow-icon + label, regime-colored |

### Feature components (per route, `web-app/src/components/<area>/`)
| Route | Components |
|---|---|
| Dashboard | `LatestReportCard`, `TopMoversCard`, `WatchlistImpactTable` |
| Watchlist | `WatchlistFilters`, `WatchlistTable` |
| Ticker detail | `TickerHeader`, `LatestIntelligenceCard` (accentLeft Card), `ReportMentionsTable`, `PersonalNotesWidget` |
| Portfolio | `PortfolioHeader`, `PortfolioImpactCard` (accentTop Card), `HoldingsTable` |

## Implementation principles (when SPEC-011 resumes)

1. **Tokens first.** Lift the Tailwind config into `web-app/tailwind.config.ts` before any component. No hex literals in component code.
2. **Primitives before features.** `ui/` and `layout/` exist before any feature directory imports them.
3. **Variants via props, not new components.** `<Card variant="accentLeft" />`, not `AccentLeftCard`.
4. **TS types co-located.** Each component file exports its props type. `components/ui/index.ts` re-exports for clean imports (`import { Card, Badge } from "@/components/ui"`).
5. **Material Symbols icon font is heavy** (~600KB full set). Prefer `lucide-react` (already tree-shakable, smaller) and map Stitch icon names → Lucide equivalents in code rather than loading the icon font globally.
6. **Fonts via `next/font/google`** with `display: swap` and only the weights actually used (Inter 400/600, Manrope 600/700, Work Sans 500/600). Don't link the CDN URLs from Stitch.
7. **Static HTML at repo root** (`index.html`, `today.html`, `reports.html`) is out of scope. Those continue to use `assets/style.css`. v3 Stitch direction targets `web-app/` only.

## Mock data

The screens use illustrative mock data ("NVDA $894.52", "PG", "PLTR", "Q1 AI Capex Monitor"). When wiring real components, source data from:
- `data/latest.json` — current report (regime, summary, posture)
- `data/reports-lite.json` — reports list
- `data/by-ticker/SYMBOL.json` — per-ticker history
- localStorage — watchlist + portfolio (SPEC-004 onwards)
