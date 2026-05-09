# Stitch Design — Source + Implementation Reference

This is the canonical design document for the v3 Investment Cockpit (SPEC-011). It captures both the **source design** (Stitch handoff as Tailwind-CDN HTML mockups) and the **current implementation state** (what's lifted into `web-app/`, what primitives ship, what's still pending).

When the two diverge, source HTML is the visual truth and this doc records the gap. When working in `web-app/`, prefer the primitives in §4 over hardcoded classes from the source HTML.

---

## 1. Status snapshot

Last updated: 2026-05-10. Re-verify against `docs/specs/STATUS.md` and `git log` before relying.

| Step | Status | Where |
|---|---|---|
| Token lift into Tailwind v4 `@theme` | ✅ shipped | `web-app/src/app/globals.css` (commit `ff8c2e3`) |
| Fonts via `next/font/google` | ✅ shipped | `web-app/src/app/layout.tsx` |
| Core ui primitives (Card variants, StatusBadge, RegimeDot, PriorityBadge, Tag, Sentiment, SectionHeader) | ✅ shipped | `web-app/src/components/ui/` |
| Layout shell (AppShell, Sidebar, TopBar) | ✅ shipped | `web-app/src/components/layout/` — `navbar.tsx` removed; mobile drawer is follow-up |
| Composition primitives (TickerCell, MoverRow, DataTable wrapper) | 🟡 pending | `web-app/src/components/ui/` |
| Per-route feature components (Dashboard, Watchlist, Ticker, Portfolio re-skin) | 🟡 pending | `web-app/src/components/<area>/` |
| Light-mode redesign | ⚠ not in Stitch handoff | see §7 |

SPEC-011 row in `docs/specs/STATUS.md` reflects this. Owner is `claude-code` since 2026-05-10.

---

## 2. Source files

Four screens delivered as Tailwind-CDN HTML. Stored verbatim as the visual source of truth. **Not** imported, rendered, or referenced at runtime — these files exist purely as design reference. The production app lives in `web-app/` and consumes the same tokens via Tailwind config.

| File | Screen | Notes |
|---|---|---|
| `dashboard.html` | Dashboard | Bento grid: Latest Report (span-8), Top Movers (span-4), Watchlist Impact (span-12) |
| `watchlist.html` | Master Watchlist | Table with Status / Priority / Last Px / Tags + "Filter" and "Paste / Import" CTAs |
| `ticker-detail.html` | Ticker page (NVDA example) | Header (symbol + price + chips), Latest Intelligence (accent-left card), Report Mentions table, Personal Notes widget |
| `portfolio.html` | Portfolio | Total Holdings header, Portfolio Impact bento (highlighted vs neutral cards), Current Positions table |

The `tailwind.config = {…}` block is **identical across all four files**. Lifted once into `web-app/src/app/globals.css` using Tailwind v4 `@theme` syntax — do not re-declare per file or per component.

---

## 3. Token reference (lifted)

Every Stitch token below now exists as a Tailwind v4 utility. Use `bg-{name}`, `text-{name}`, `border-{name}` directly in component code. Do not put hex literals in component code.

### 3.1 Surfaces

| Token | Hex | Use |
|---|---|---|
| `bg-background` | `#0F172A` | Page background |
| `bg-surface` | `#1E293B` | Card / panel surfaces |
| `bg-surface-variant` | `#32353C` | Tag chips, search input bg, secondary surfaces |
| `bg-surface-bright` | `#363941` | Hover states, letter tiles |
| `bg-surface-elevated` | `#334155` | Letter tile bg in mover rows |
| `bg-surface-dim` | `#10131A` | Sub-section header bg, table header strip |
| `bg-surface-container` | `#1D2027` | Material-3 container low |
| `bg-surface-container-low` | `#191B23` | Notes widget bg |
| `bg-surface-container-lowest` | `#0B0E15` | Deepest table header bg |
| `bg-surface-container-high` | `#272A31` | – |
| `bg-surface-container-highest` | `#32353C` | – |

### 3.2 Text

| Token | Hex | Use |
|---|---|---|
| `text-text-primary` | `#F8FAFC` | Body, headings, important data |
| `text-text-secondary` | `#94A3B8` | Captions, table headers, low-emphasis text |
| `text-on-surface` | `#E1E2EC` | Material-3 alt body |
| `text-on-surface-variant` | `#C2C6D6` | Material-3 alt caption |

### 3.3 Borders + outlines

| Token | Value | Use |
|---|---|---|
| `border-border-subtle` | `rgba(255,255,255,0.08)` | All card / table borders |
| `border-outline` | `#8C909F` | Material-3 strong outline (rare) |
| `border-outline-variant` | `#424754` | Material-3 weak outline |

### 3.4 Brand / primary

| Token | Hex | Use |
|---|---|---|
| `bg-primary` / `text-primary` | `#ADC6FF` | Primary brand blue, accent bars, links |
| `bg-primary-container` | `#4D8EFF` | Active nav item bg, primary CTAs |
| `text-on-primary` | `#002E6A` | Text on `bg-primary` |
| `text-on-primary-container` | `#00285D` | Text on `bg-primary-container` |
| `bg-primary-fixed` / `bg-primary-fixed-dim` | `#D8E2FF` / `#ADC6FF` | Hover variants |

### 3.5 Regime + status (semantic)

| Token | Hex | Where |
|---|---|---|
| `text-regime-risk-on` | `#10B981` | Bullish sentiment, positive deltas, risk-on regime dot |
| `text-regime-risk-off` | `#EF4444` | Bearish sentiment, negative deltas, risk-off regime dot |
| `text-regime-neutral` | `#F59E0B` | Neutral regime dot, medium priority badge |
| `text-status-own` | `#10B981` | "Own" status badge |
| `text-status-watching` | `#6366F1` | "Watching" status badge |
| `text-status-avoid` | `#64748B` | "Avoid" status badge |

`status-own` and `regime-risk-on` are intentionally the same green (`#10B981`). Both signal "good." Same for `status-avoid` and the secondary slate (`#64748B`).

### 3.6 Other

| Token | Hex | Use |
|---|---|---|
| `text-tertiary` / `bg-tertiary-container` | `#FFB786` / `#DF7412` | Warm orange — high-priority chips, accent CTAs |
| `text-error` / `bg-error-container` | `#FFB4AB` / `#93000A` | Error state, high-priority badge text |

### 3.7 Type scale

| Token | Size / line-height | Family | Use |
|---|---|---|---|
| `text-h1 font-h1` | 24/32, ‑0.02em, 700 | Manrope | Page H1 (e.g., "Master Watchlist", ticker symbol) |
| `text-h2 font-h2` | 20/28, 600 | Manrope | Card titles |
| `text-body-main font-body-main` | 16/24, 400 | Inter | Body copy |
| `text-body-compact font-body-compact` | 14/20, 400 | Inter | Dense rows, captions |
| `text-data-mono font-data-mono` | 14/20, +0.01em, 500 | Work Sans | Tickers, prices, numerics |
| `text-label-caps font-label-caps` | 12/16, +0.05em, 600 | Work Sans | Table headers, eyebrow labels (use with `uppercase`) |
| `text-badge font-badge` | 11/12, 600 | Inter | Status / priority badge text |

Fonts wired via `next/font/google` in `layout.tsx` with `display: swap` and only the weights actually used (Inter 400/500/600/700, Manrope 600/700, Work Sans 500/600).

### 3.8 Spacing + radius

| Token | Value | Use |
|---|---|---|
| `p-card-padding` | `1.25rem` | Inside cards |
| `gap-stack-gap` | `1rem` | Vertical rhythm between cards |
| `p-gutter` | `1.5rem` | Page edge padding (desktop) |
| `p-margin-mobile` | `1rem` | Page edge padding (mobile) |
| `max-w-container-max` | `1280px` | Outer container |
| `h-table-row-height` | `48px` | Table row min-height |
| `rounded-lg` | `0.5rem` | Default card / chip radius |
| `rounded-xl` | `0.75rem` | Surface card radius |

---

## 4. Primitives catalog (shipped)

All under `web-app/src/components/ui/`. Import from the barrel:
```ts
import { StatusBadge, RegimeDot, PriorityBadge, Tag, Sentiment, SectionHeader } from "@/components/ui/stitch";
import { Card } from "@/components/ui/card";
```

### 4.1 `Card` (extended)

`bg-card text-card-foreground` — `--card` is bridged to `#1E293B` in `.dark`, so `Card` looks identical to a `bg-surface` div in dark mode.

```tsx
<Card>...</Card>                          // default
<Card variant="accentLeft">...</Card>     // 1px primary bar on the left edge
<Card variant="accentTop">...</Card>      // 1px primary bar across the top
```

Variant accent uses a `before:` pseudo-element + `overflow-hidden` so children don't shift.

### 4.2 `StatusBadge`

Renders the watchlist/portfolio item state pill: `Own` / `Watching` / `Research` / `Avoid`.

```tsx
<StatusBadge status="own" />              // "Own", green
<StatusBadge status="watching" />         // "Watching", indigo
<StatusBadge status="research" />         // "Research", neutral on surface-elevated
<StatusBadge status="avoid" />            // "Avoid", slate
<StatusBadge status="own" label="Custom" /> // override label
```

### 4.3 `RegimeDot`

8px colored dot + optional label and caption. Used in the "MARKET REGIME" callout.

```tsx
<RegimeDot regime="risk-off" label="Mild Risk-Off" caption="MARKET REGIME" />
<RegimeDot regime="risk-on" label="Risk-On" />
<RegimeDot regime="neutral" label="Mixed" />
```

### 4.4 `PriorityBadge`

Icon + label, color-coded. Lucide icons replace Material Symbols.

```tsx
<PriorityBadge priority="high" />   // ChevronsUp + "High", error red
<PriorityBadge priority="med" />    // Minus + "Med", neutral yellow
<PriorityBadge priority="low" />    // ChevronDown + "Low", text-secondary
```

### 4.5 `Tag`

Neutral chip on `bg-surface-variant`. Used for ticker tags ("AI", "Semi", "Defense"…).

```tsx
<Tag>AI</Tag>
<Tag>Semi</Tag>
```

Pure span — passes through `className` and other props.

### 4.6 `Sentiment`

Inline arrow + label, regime-colored. Used in tables for "Bullish / Bearish / Neutral" cells.

```tsx
<Sentiment sentiment="bullish" />   // ArrowUp + "Positive", green
<Sentiment sentiment="bearish" />   // ArrowDown + "Negative", red
<Sentiment sentiment="neutral" />   // Minus + "Neutral", yellow
<Sentiment sentiment="bullish" label="Strong Buy" /> // override
```

### 4.7 `SectionHeader`

H2 + caption + optional CTA on the right. Use above any card or section.

```tsx
<SectionHeader
  title="Watchlist Impact"
  caption="Tickers in your lists affected by today's regime"
  action={<Button variant="outline">View All</Button>}
/>
```

---

## 5. Composition patterns

Recipes for assembling the source mockups from the shipped primitives. When a pattern needs a primitive that isn't shipped yet, it's listed under §6.

### 5.1 Latest Report Card (dashboard, span-8)

```tsx
<Card>
  <SectionHeader
    title="Yield Curves Invert Further Amid Tech Weakness"
    caption={
      <span className="inline-flex items-center gap-2">
        <Tag>LATEST REPORT</Tag>
      </span>
    }
    action={<Button variant="link">Read Full →</Button>}
  />
  <p className="font-body-main text-body-main text-text-secondary">…summary…</p>
  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-subtle">
    <RegimeDot regime="risk-off" label="Mild Risk-Off" caption="MARKET REGIME" />
    <div>
      <p className="font-label-caps text-label-caps text-text-secondary uppercase">Main driver</p>
      <p className="font-body-compact text-body-compact text-text-primary">Tech earnings weakness</p>
    </div>
    <div>
      <p className="font-label-caps text-label-caps text-text-secondary uppercase">Our posture</p>
      <p className="font-body-compact text-body-compact text-text-primary">Cautious / defensive</p>
    </div>
  </div>
</Card>
```

### 5.2 Watchlist row (full row in the active-signals table)

```tsx
<TableRow>
  <TableCell>
    <div className="flex flex-col">
      <span className="font-data-mono text-data-mono text-text-primary">NVDA</span>
      <span className="text-xs text-text-secondary">NVIDIA Corp</span>
    </div>
  </TableCell>
  <TableCell><StatusBadge status="own" /></TableCell>
  <TableCell><PriorityBadge priority="high" /></TableCell>
  <TableCell><span className="font-data-mono text-data-mono text-text-primary">$128.45</span></TableCell>
  <TableCell>
    <div className="flex gap-1">
      <Tag>AI</Tag>
      <Tag>Semi</Tag>
    </div>
  </TableCell>
  <TableCell><Button variant="ghost" size="icon-sm">⋯</Button></TableCell>
</TableRow>
```

### 5.3 Latest Intelligence Card (ticker detail)

```tsx
<Card variant="accentLeft">
  <SectionHeader
    title="Latest Intelligence Summary"
    caption="Institutional Flow & Supply Chain Analysis"
    action={<Tag>Just Now</Tag>}
  />
  <p className="font-body-main text-body-main text-text-primary/90">…summary…</p>
</Card>
```

### 5.4 Watchlist Impact row (dashboard)

```tsx
<TableRow>
  <TableCell>
    <span className="font-data-mono text-data-mono">MSFT</span>
    <span className="text-xs text-text-secondary ml-2">Microsoft</span>
  </TableCell>
  <TableCell><StatusBadge status="research" /></TableCell>
  <TableCell className="text-text-secondary truncate">Cloud growth deceleration fears</TableCell>
  <TableCell className="text-right"><Sentiment sentiment="bearish" /></TableCell>
</TableRow>
```

---

## 6. Pending work

These primitives are referenced in the source HTML but **not yet shipped**. Feature components should not block on them — implement features against §4 primitives first, then upgrade when these land.

### 6.1 Layout (`web-app/src/components/layout/`) — ✅ shipped 2026-05-10

| Component | Status |
|---|---|
| `AppShell` | ✅ wraps Sidebar + TopBar + main content |
| `Sidebar` | ✅ 6 routes, active highlight via `usePathname()`, Settings pinned bottom |
| `TopBar` | ✅ search (visual-only until SPEC-007), notifications + account icons + ThemeToggle |

`navbar.tsx` removed. All 8 page routes use `<AppShell>{content}</AppShell>` — no `currentPath` prop drilling.

**Pending follow-up:** mobile drawer for the sidebar. Current behaviour: desktop sidebar visible md+, mobile menu button is a no-op stub. Drawer is a small extension — toggleable state + slide-in panel.

### 6.2 Composition primitives (`web-app/src/components/ui/`) — partially shipped 2026-05-10

| Component | Status |
|---|---|
| `TickerCell` | ✅ shipped. `compact` / `withLetters` variants. `withLetters` adds 8×8 letter tile from first 2 chars of symbol on `bg-surface-elevated` |
| `MoverRow` | ✅ shipped. TickerCell (withLetters) + price (`$nnn.nn` formatting if number, passthrough if string) + sign-colored delta % |
| `IconButton` | 🟡 pending — existing `Button` with `size="icon"` is close. Need a surface-variant hover bg variant |
| `DataTable` wrapper | ⚠ deferred — existing shadcn `Table` is sufficient when paired with the convention below. Adding a wrapper didn't pay for itself |

**Stitch table convention** (use the existing `@/components/ui/table` primitives):
- `<TableHead>` content: `font-label-caps text-label-caps text-text-secondary uppercase`
- `<TableRow>`: already includes `hover:bg-muted/50` (which is `bg-surface-variant` in dark mode via the `.dark` token bridge), so no override needed
- For 48px row height, add `h-table-row-height` to `<TableRow>` when needed

### 6.3 Feature components (per route, `web-app/src/components/<area>/`)

| Route | Components |
|---|---|
| Dashboard | `LatestReportCard`, `TopMoversCard`, `WatchlistImpactTable` |
| Watchlist | `WatchlistFilters`, `WatchlistTable` (re-skin existing — currently in `components/watchlist/watchlist-table.tsx`, naming collision; will absorb) |
| Ticker detail | `TickerHeader`, `LatestIntelligenceCard`, `ReportMentionsTable`, `PersonalNotesWidget` |
| Portfolio | `PortfolioHeader`, `PortfolioImpactCard`, `HoldingsTable` |

---

## 7. Light-mode caveat

Stitch is **dark-only** in the handoff. The token lift bridges shadcn semantic tokens (`--card`, `--primary`, `--muted`, `--border`, `--ring`) inside the `.dark` block only — light mode (`:root`) keeps the original shadcn oklch defaults.

Consequences:
- Toggle to light mode and primitives that use Stitch-specific tokens directly (`bg-surface-variant`, `text-text-secondary`, `text-status-own`, regime/status colors) **render their dark colors regardless of mode**. They have no light variant.
- Primitives that use only shadcn semantic tokens (`bg-card`, `text-foreground`, `text-muted-foreground`) toggle correctly.

Either remove the light-mode toggle (commit to dark-only) or design a light palette as a follow-up. Out of SPEC-011 scope as-is.

---

## 8. Implementation principles

1. **Tokens first.** Lift the Tailwind config into `globals.css` before any component. No hex literals in component code.
2. **Primitives before features.** `ui/` and `layout/` exist before any feature directory imports them.
3. **Variants via props, not new components.** `<Card variant="accentLeft" />`, not `<AccentLeftCard />`.
4. **TS types co-located.** Each component file exports its props type. Use `@/components/ui/stitch` for batched imports.
5. **Material Symbols icon font is heavy** (~600KB full set). Use `lucide-react` (already tree-shakable, smaller). Map Stitch icon names → Lucide equivalents in code rather than loading the icon font globally. Mappings used so far:
   - `keyboard_double_arrow_up` → `ChevronsUp`
   - `drag_handle` → `Minus`
   - `keyboard_arrow_down` → `ChevronDown`
   - `arrow_upward` / `trending_up` → `ArrowUp`
   - `arrow_downward` / `trending_down` → `ArrowDown`
6. **Fonts via `next/font/google`** with `display: swap` and only the weights actually used. Don't link the CDN URLs from Stitch.
7. **Static HTML at repo root** (`index.html`, `today.html`, `reports.html`) is out of scope. Those continue to use `assets/style.css`. v3 Stitch direction targets `web-app/` only.

---

## 9. Real data sources

The source HTML uses illustrative mock data ("NVDA $894.52", "PG", "PLTR", "Q1 AI Capex Monitor"). When wiring real components, source data from:

- `data/latest.json` — current report (regime, summary, posture, mainDriver, discussion, catalysts, sections.checklist, movers)
- `data/reports-lite.json` — reports list
- `data/by-ticker/SYMBOL.json` — per-ticker history
- `localStorage["watchlist_items"]` — watchlist (SPEC-004; v3 store at `web-app/src/lib/storage/watchlist-store.ts`)
- `localStorage["portfolio_items"]` — portfolio (SPEC-008, not yet implemented)

`scripts/build-index.js` is the single point where report-derived fields are computed. Extending the data contract = edit `build-index.js` + update `web-app/src/types/reports.ts` in the same change. See SPEC-002.

---

## 10. Decisions log

- **2026-05-09** — Stitch handoff received and committed (`1c3036e`).
- **2026-05-09** — Web frontend canonicalised on `web-app/` (Next.js + Tailwind v4); `web-next/` archived (ADR-006).
- **2026-05-10** — SPEC-011 reassigned codex-agent → claude-code.
- **2026-05-10** — Token lift into `globals.css` + core primitives shipped (`ff8c2e3`). Tailwind v4 `@theme` syntax used (not v3 JS config). Stitch tokens layered atop shadcn defaults; `.dark` bridge maps shadcn semantics to Stitch palette.
- **2026-05-10** — Lucide icons chosen over Material Symbols icon font.
