# [SPEC-026] Thesis Monitoring Loop (Trajectory + Alerts + Crossed-zone History)

## 1. Context
SPEC-023 lands the static thesis: structured fields, current light, trade levels visualised on the chart, and a passive `CrossedZonesCard` on the dashboard. What it doesn't do is *close the monitoring loop* — once a thesis exists, the user wants to know:
- "How has my light been moving over time?" (trajectory)
- "Did anything trigger while I wasn't looking?" (alert badge + history)
- "Is the app going to tell me when price action matters?" (notifications)

Without this, the user keeps the framework in their head ("I should check on AAPL today, right?") instead of letting the app push it forward.

## 2. Problem
- Quarterly reviews + the thesis's `currentLight` capture *state*, not *trajectory*. There's no way to see the light path over the last year.
- The `CrossedZonesCard` only shows symbols currently in range; the user can't see "AAPL was in range yesterday but recovered today" without opening the app at the right moment.
- The app is passive. Without an alert badge or notification, the user has to open the dashboard hourly to spot a crossed zone in time to act.

## 3. Scope

### In scope
- **Light trajectory per thesis** — a small chart showing the symbol's light over time. Sources: the thesis's `updatedAt` light value at each save + every QuarterlyReview's `light`. Stored implicitly (no new entity); computed on read.
- **Per-zone `lastCrossedAt`** — each `TradeLevel` gains an optional `lastCrossedAt: string` updated by a client-side pass on dashboard mount: when today's close is within ±2% of a level, write the date to that level. Survives over time so the user sees "Add Level 2 was crossed 2026-04-12" even after price recovers.
- **TopBar alert badge** — small number badge on the TopBar (next to bell icon) showing the count of active in-range zones + stale theses (>90 days since update). Click → opens a "Today's alerts" drawer / pane.
- **Browser notifications opt-in** — toggle in `/settings` ("Notify me when thesis levels cross"). When enabled, the daily-quotes workflow's deploy triggers a one-shot client-side notification check on next app open ("AAPL crossed your Add Level 1 since your last visit"). No background worker — runs only when app is open and snapshots have refreshed.
- **Alerts drawer** — surfaced from the TopBar badge. Two sections:
  - "Crossed zones" (today): symbol, level kind, target price, current price, distance, link to `/ticker/[symbol]`.
  - "Stale theses": symbols where `updatedAt > 90 days`, with "Review me" CTA → quarterly review form.

### Out of scope
- Server-side push notifications (would need a backend).
- Email / SMS alerts (no transport).
- Granular per-thesis notification rules (one global on/off).
- Intraday alerts — daily-close pipeline only.
- Persistent alert log beyond `lastCrossedAt` (no full history of all crossings).
- Configuring the ±2% proximity threshold per-thesis (global only; lives in dashboard settings).

## 4. User stories
- As a thesis author, I want to see how my conviction (light) has trended over the last year so I can spot drift.
- As a busy investor, I want a single number badge in the app shell telling me "something needs your attention" so I don't have to scan every page.
- As a thesis author with multiple symbols, I want to know which add levels were in range yesterday even if the price has since moved away.
- As a desktop user, I want the browser to ping me when an add level crosses so I don't have to babysit the app.

## 5. Data contracts

```ts
// Additions to Thesis (SPEC-023) — backwards compatible (optional field).
export interface TradeLevel {
  kind: TradeLevelKind;
  price: number;
  level?: 1 | 2 | 3;
  note?: string;
  lastCrossedAt?: string;   // ISO date — set by client when within proximity
}

// Light trajectory is computed, not stored as a new entity:
// {
//   from Thesis.updatedAt + Thesis.currentLight,
//   plus each QuarterlyReview.{createdAt, light}
// }
// Returned as { date, light }[] sorted ascending.

// New domain types
export interface ThesisAlert {
  kind: "crossed-zone" | "stale-thesis";
  symbol: string;
  detail: string;            // "Add Level 1 @ $148 — current $148.20"
  href: string;              // "/ticker/AAPL" or "/research/thesis/AAPL"
}

// lib/research/alerts.ts
export function buildAlerts(
  theses: Thesis[],
  snapshots: QuoteSnapshotMap,
  proximityPct: number,        // from dashboard settings
  staleAfterDays: number,      // default 90
): ThesisAlert[];
```

```ts
// Settings additions (DashboardSettings, SPEC-023 already adds proximityPct)
export interface DashboardSettings {
  // existing fields…
  thesisProximityPct: number;             // default 2
  thesisStaleAfterDays: number;           // default 90
  notificationsEnabled: boolean;          // default false; user must opt-in
  notificationsPermissionGranted: boolean;// mirrors Notification.permission, persisted for UX
}
```

## 6. UX notes
- **Light trajectory chart** sits in the thesis page sidebar (or under the light/checklists block). Recharts ScatterChart or simple horizontal markers with green/amber/red colors. Tooltips show date + light + source ("from Q3 2026 review" vs "from thesis edit"). Reuse `RangePills` (1M/3M/6M/YTD/1Y/3Y) to scope the trajectory.
- **TopBar alert badge** — small red/amber dot with a count, next to the bell. `0` → no badge.
- **Alerts drawer** — slides in from the right (or popover over the bell). Two sections, scrollable. Each row is a button linking to the right page.
- **Settings toggle** — `/settings` gets a "Notifications" card with one toggle. When user enables it, request `Notification.permission`. If denied, show a help string with the OS-level fix. If granted, store the consent flag.
- **`lastCrossedAt`** display — on the thesis page's trade plan rows, show "Last crossed: 2026-04-12" in muted text when set. On the price chart, recently-crossed lines (within 7 days) render slightly thicker.

## 7. Acceptance criteria
- [ ] AC1: A thesis with at least 3 saves over 3 different days produces a trajectory chart with at least 3 points.
- [ ] AC2: When today's close is within 2% of an `add` level, the level's `lastCrossedAt` is set to today's date and persists across page refreshes.
- [ ] AC3: TopBar shows a count badge equal to (active crossed zones) + (stale theses). Click → drawer shows both groups.
- [ ] AC4: Toggling "Notifications" in `/settings` triggers a `Notification.permission` request. If granted, opening the app after a quote-pipeline update fires `new Notification(...)` for each new crossing since last visit.
- [ ] AC5: `npm run build` passes. `buildAlerts` has unit tests covering empty theses, multiple zones, stale + crossed combined.

## 8. Test plan
- **Unit:** `buildAlerts` with mocked theses + snapshots; trajectory builder with mocked reviews.
- **Component:** TopBar badge with/without alerts; alerts drawer rows link correctly.
- **Manual:** opt into notifications, manually edit `data/quotes/AAPL.json` last bar to a price within 2% of an existing add level, refresh app, verify notification fires.

## 9. Rollout plan
- W10.A: `lastCrossedAt` field + dashboard update logic + visual indicator on chart.
- W10.B: `buildAlerts` helper + alerts drawer + TopBar badge.
- W10.C: Light trajectory chart (depends on SPEC-023 W8.F quarterly reviews).
- W10.D: Browser notifications opt-in + permission flow + delivery.

## 10. Risks
- **Risiko:** Notification permission flow is platform-specific (browsers behave differently when blocked).
  **Mitigasjon:** Show clear "blocked? here's how to re-enable" help text. Treat notifications as best-effort; the in-app badge is the canonical surface.
- **Risiko:** `lastCrossedAt` writing on every dashboard mount could thrash localStorage if the user has many theses.
  **Mitigasjon:** Only write when state actually changes (compare before/after). One write per session is fine.
- **Risiko:** Trajectory chart with only 1–2 data points looks degenerate.
  **Mitigasjon:** Render a "trajectory not enough data yet" empty state when fewer than 2 points exist.
- **Risiko:** User opts into notifications, then a flurry of zones cross in one update and they get spammed.
  **Mitigasjon:** Batch into one notification: "3 thesis levels crossed — open dashboard". Click → drawer.
