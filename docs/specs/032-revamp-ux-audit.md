# [SPEC-032] Investment Report journey and information-architecture audit

Audit for [INT-373](/INT/issues/INT-373), under the [revamp plan](/INT/issues/INT-372#document-plan). Reviewed 2026-11-14 against the current Next.js worktree.

**Status:** UX audit complete. This document defines the target journey and information architecture. It does not authorize or implement the frontend revamp.

## 1. User, job, and success

The primary user is a self-directed investor who already understands tickers, positions, theses, and simple strategy rules. The app is their private, account-free market cockpit. Market data is generated at build time; personal data stays in browser storage.

The core job is:

> Understand what needs attention, connect that signal to owned or watched instruments, and record the next decision without checking several products.

Success means the user can:

1. open the app and identify personal attention items before generic market context;
2. move from a watchlist or portfolio signal to a ticker and its thesis without losing context;
3. update a position, thesis, dispatch, or strategy with clear save and failure feedback;
4. understand quote freshness and missing coverage before trusting a value; and
5. use the same mental model on a narrow phone and a wide desktop with keyboard or assistive technology.

The product brief in `docs/investment-report-app-v3-brief.md` supports this framing: the app should answer “what changed,” “which of my tickers are affected,” and “what needs attention,” rather than imitate a trading terminal.

## 2. Scope and method

### In scope

- Dashboard, watchlist, portfolio, ticker list/detail, research/thesis, strategies, and settings.
- Current route hierarchy, user journeys, interaction states, responsive behavior, accessibility, and design-system consistency.
- A revised navigation and information architecture that preserves current URLs.
- Small, testable implementation outcomes for downstream tasks.

### Out of scope

- Frontend implementation, visual redesign, data migration, authentication, broker integration, or deployment.
- Changing financial calculations or storage contracts. Those implications belong to the architecture/storage owners.
- Approval of any production UI.

### Evidence reviewed

- Route composition in `web-app/src/app/**/page.tsx`.
- Shell and navigation in `web-app/src/components/layout/`.
- Feature components in `web-app/src/components/{dashboard,watchlist,portfolio,tickers,ticker,research,strategies,settings}/`.
- Shared primitives and tokens in `web-app/src/components/ui/` and `web-app/src/app/globals.css`.
- Product and shell intent in `docs/investment-report-app-v3-brief.md` and `docs/specs/001-v3-shell-navigation.md`.
- Settings claims and actual backup/reset scope in `web-app/src/components/settings/settings-actions.tsx`, `web-app/src/lib/storage/export-import.ts`, and `web-app/src/lib/storage/demo-seed.ts`.

The responsive review is source-based at the breakpoints encoded in the components (`sm`, `md`, and `lg`). A controlled browser pass was attempted, but this shared checkout had no complete `node_modules`; two lockfile-defined install attempts collided with a changing dependency tree and ended with `ENOTEMPTY`. No screenshot or runtime claim is therefore made. The downstream validation matrix includes the missing browser checks.

## 3. Current experience summary

### Route inventory

| Route | Current user job | Current primary interaction | Evidence |
|---|---|---|---|
| `/` | Scan the latest market and personal impact | Open an affected ticker or thesis | `app/page.tsx`; `components/dashboard/dashboard-client.tsx` |
| `/watchlist` | Maintain instruments of interest | Add a symbol | `app/watchlist/page.tsx`; `components/watchlist/watchlist-view.tsx` |
| `/portfolio` | Maintain owned positions and inspect P&L | Add or edit a position | `app/portfolio/page.tsx`; `components/portfolio/portfolio-view.tsx` |
| `/tickers` | Find an instrument in the static quote universe | Search/filter and open a ticker | `app/tickers/page.tsx`; `components/tickers/tickers-grid.tsx` |
| `/ticker/[symbol]` | Assess one instrument and connect it to personal context | Add/update watchlist, portfolio, thesis, or notes | `app/ticker/[symbol]/page.tsx`; `components/ticker/ticker-header.tsx` |
| `/research` | Review or create theses and dispatches | Create/open a thesis; dispatch creation is secondary | `app/research/page.tsx`; `components/research/research-view.tsx` |
| `/research/thesis/[symbol]` | Record and revisit an investment thesis | Save the thesis or quarterly review | `app/research/thesis/[symbol]/page.tsx`; `components/research/thesis-form.tsx` |
| `/strategies` | Define and locally backtest a rule set | Create a strategy, then inspect its backtest | `app/strategies/page.tsx`; `components/strategies/strategies-view.tsx` |
| `/settings` | Configure the cockpit and manage local data | Change preferences; backup/restore are secondary | `app/settings/page.tsx`; `components/settings/` |

There is no current `/reports` route. “Reports” from the original brief has effectively split into Research theses and Dispatches. Do not add an empty Reports destination during the revamp.

### Strengths to keep

- The static-first shell and route-level data loading keep the core market experience fast and avoid a runtime backend dependency.
- Quote dates and stale-age messaging are visible on the Dashboard and ticker detail; the interface does not present every value as live.
- Most forms use persistent labels, inline validation, and explicit verbs such as “Add position,” “Save strategy,” and “Start thesis.”
- Shared `Button`, `Card`, `Table`, `BadgeSelect`, and `ConfirmDialog` primitives provide a credible base for consistent focus, validation, and destructive-action behavior.
- The main grids and forms already stack at several narrow breakpoints, and shared tables include horizontal overflow containment.
- Empty and hydration states exist on every local-data feature. The revamp should improve their hierarchy and recovery, not discard them.

## 4. Findings ranked by user impact

### Must fix before broad rollout

#### P0. Settings can create false confidence about backup and deletion scope

**Observed evidence:** Settings presents “Export all data” and “Clear all data” in `components/settings/settings-actions.tsx`. The export in `lib/storage/export-import.ts` includes six localStorage datasets but omits theses, quarterly reviews, and IndexedDB research files. `clearAllUserData()` in `lib/storage/demo-seed.ts` clears only watchlist, portfolio, ticker notes, and dispatches. Loading demo data invokes that partial clear.

**Impact:** A user can believe their research is backed up or erased when it is not. This is a trust and potential data-loss problem, not a copy polish issue.

**Target outcome:** Until full-scope operations exist, rename actions to state the exact scope and list excluded datasets before confirmation. The eventual data operation must return a structured result that the UI can present honestly. “Clear all” must not ship unless its scope is complete and recoverable.

**Owner split:** Storage/backup contract: Bruce. Labels, scope preview, confirmation, and result UI: Thor. Privacy/security review of imported research: Natasha.

**Risk:** Expanding a delete operation during a UI revamp can erase personal data. Keep expansion in a separately approved storage task.

**Focused validation:** Seed every current localStorage dataset plus IndexedDB attachments; export and inspect the manifest; cancel and confirm each reset scope; reload; verify exact retained/deleted records and announced result text.

#### P1. Personal attention is not the Dashboard’s visual priority

**Observed evidence:** `dashboard-client.tsx` places the generic Index Pulse first, then Top Movers beside Watchlist Impact, then crossed thesis zones, with Portfolio Impact last. The product brief says personal watchlist/portfolio impact and “what needs attention” are the main questions.

**Impact:** The user must scan market-wide movement before reaching owned-position risk. The page behaves like a market dashboard rather than a personal decision cockpit.

**Target outcome:** Order Dashboard content as: (1) data freshness and “Needs attention” summary, (2) watchlist/portfolio/thesis exceptions, (3) portfolio summary, and (4) broader market context such as indices and universe movers. Keep cards, calculations, and existing routes; change hierarchy and labels, not financial semantics.

**Risk:** A simple reorder could duplicate the same signal across cards. Define one canonical attention summary and let detail cards explain it.

**Focused validation:** With fixtures containing a stale thesis, crossed level, large watched move, large owned move, and stale quotes, the first viewport at 390×844 and 1280×800 must identify the highest-priority personal items and their destination.

#### P1. Desktop and mobile expose different information architecture

**Observed evidence:** Desktop `sidebar-nav.tsx` exposes Dashboard, Research, Watchlist, Portfolio, Strategies, Tickers, and Settings. Mobile `bottom-nav.tsx` omits Settings, uses six equal cells, and shortens labels to “Watch,” “Folio,” and “Strats.” The code comment says Settings is reachable only by direct URL. The top-bar Account control has no action.

**Impact:** Mobile users cannot discover Settings, must decode abbreviations, and see a dead Account affordance. Route findability depends on viewport.

**Target outcome:** Use one ordered destination model for both shells. Mobile should show four primary destinations plus a clearly named “More” action containing Tickers, Strategies, and Settings. Remove or disable Account until it has a real destination. Use full, consistent labels.

**Risk:** A “More” sheet introduces another overlay; it must use the shared accessible dialog/sheet behavior.

**Focused validation:** Every route is reachable in at most two navigation actions at 320, 390, 768, and 1280 px; current-route state is announced; no abbreviated label is needed; tab order follows visual order.

#### P1. Critical charts are visually rich but do not expose an equivalent non-visual result

**Observed evidence:** `components/charts/sentiment-area-chart.tsx` renders Recharts SVG with a hover tooltip but no accessible name, summary, or tabular alternative. Ticker trade levels and portfolio curves can therefore be unavailable to screen-reader and keyboard-only users.

**Impact:** Price direction, portfolio trajectory, and threshold context are core financial information. Start/end labels do not communicate the plotted series or every trade level.

**Target outcome:** Give each chart a heading/description and a concise text summary: range, start/end, high/low, change, missing data, and active reference levels. Offer a keyboard-reachable “View data table” disclosure for the series. Treat the graphical SVG as supplementary when the summary is present.

**Risk:** Rendering thousands of points in a table would be noisy. Use the currently selected range and a bounded/downsampled table with an explicit note.

**Focused validation:** Navigate ranges and open the data table using keyboard only; verify the chart name, selected range, values, and reference levels with a screen reader; confirm the visual chart remains unchanged.

#### P1. Light-theme selected-state text fails WCAG contrast

**Observed evidence:** In `globals.css`, light `--st-primary-container` is `#2563eb` and `--st-on-primary-container` is `#1e3a8a`. Selected navigation and chips combine `bg-primary-container` with `text-on-primary-container`. The calculated contrast is approximately **2.00:1**, below WCAG AA’s 4.5:1 requirement for this normal-size text. In dark cards, negative `#ef4444` text on `#1e293b` is approximately 3.89:1 and also needs adjustment for normal-size values.

**Impact:** Active location and negative financial values can be difficult to read, especially for low-vision users.

**Target outcome:** Correct semantic token pairs rather than patching individual components. Preserve meaning with signs/arrows/text, not color alone. Verify normal text at 4.5:1 and large text/non-text indicators at 3:1 in both themes.

**Risk:** A global token change affects every selected badge and navigation item. Run visual regression across all token consumers.

**Focused validation:** Automated contrast assertions for semantic pairs plus browser screenshots of selected nav, chips, badges, P&L, validation, and destructive states in light and dark themes.

### Should fix in the first revamp slice

#### P2. Research has an unstable landing state and competing primary actions

**Observed evidence:** `research-view.tsx` opens Theses only if at least one thesis exists; otherwise it opens Dispatches. “New thesis” remains a page-level action while “New dispatch” appears inside the Dispatches tab. A user’s default route therefore changes after they create their first thesis.

**Impact:** The same URL does not build a stable spatial memory, and the product’s primary research object is unclear.

**Target outcome:** Make Theses the stable default, with an actionable empty state. Keep Dispatches as a secondary tab and persist an explicit tab choice in `?view=theses|dispatches` when sharing/reloading. Show one primary action that matches the active tab.

**Focused validation:** Direct load, reload, browser back/forward, empty research, populated research, and existing `?id=` dispatch deep links all restore the expected view.

#### P2. Dense tables push important row actions off-screen on phones

**Observed evidence:** Watchlist and Portfolio render seven or more columns. Shared `Table` enables horizontal scrolling, but remove controls are in the final column; Portfolio hides only Last Close, and Watchlist hides only Tags.

**Impact:** On narrow screens the user must discover horizontal scrolling before they can edit or remove an item. Symbol, current value, P&L, and action can be separated spatially.

**Target outcome:** Use a compact mobile row/card with symbol, primary value, change, status, and an explicit row menu. Keep the full sortable table from `md` upward. Do not hide destructive actions only at the far edge of a scroll region.

**Focused validation:** At 320 and 390 px, all primary row information and the action menu are visible without horizontal scroll; at 768 and 1280 px, sorting and inline edits remain available.

#### P2. Overlay behavior is inconsistent

**Observed evidence:** `ConfirmDialog` manages initial focus, a focus loop, Escape, and focus restoration. `alerts-drawer.tsx` lacks `aria-modal`, a labelled-by relationship, initial focus, focus containment, and restoration. `new-thesis-dialog.tsx` restores focus but its listbox selection is not programmatically connected to the focused search input. Dispatch deletion still uses native `confirm()`.

**Impact:** Keyboard and screen-reader behavior changes between visually similar overlays; focus can move behind the Alerts drawer or selection changes can go unannounced.

**Target outcome:** Consolidate Dialog, AlertDialog, Sheet, and Combobox/Listbox behavior in shared primitives. Each overlay must label itself, move focus inside, contain focus while modal, close on Escape, restore focus, and prevent background interaction.

**Focused validation:** Keyboard-only and screen-reader scripts for Alerts, New thesis, delete dispatch, delete strategy, import overwrite, and clear/reset confirmations.

#### P2. Interactive targets are often below the mobile 44×44 px target

**Observed evidence:** Shared buttons default to 36 px; `sm` and `icon-sm` are 32 px; chips are approximately 24 px high. Top-bar icons are approximately 36 px. Thesis indicator links in Watchlist/Portfolio are only 6 px square.

**Impact:** Frequently used actions are hard to acquire by touch, and the thesis-dot link is effectively undiscoverable.

**Target outcome:** Keep compact visual glyphs but enlarge their hit areas to at least 44×44 px on coarse pointers. Turn thesis state into a labelled row action or include the whole symbol cell in the link target.

**Focused validation:** Computed hit-box audit at 390 px with coarse-pointer styles; confirm adjacent controls do not overlap and keyboard focus remains visible.

#### P2. Strategy inputs are too dense for the narrow layout

**Observed evidence:** RSI parameters use an unconditional three-column grid, and date fields use an unconditional two-column grid in `strategies/strategy-form.tsx`.

**Impact:** At 320–390 px, labels and numeric inputs become cramped even though other forms stack responsively.

**Target outcome:** Stack strategy parameters at the base breakpoint, use two columns from `sm`, and three only when labels and minimum input widths fit. Keep related buy/sell pairs adjacent when space permits.

**Focused validation:** No clipped label, input, date picker, or error text at 320 and 390 px with 200% text zoom.

### Nice to fix after the core hierarchy is stable

#### P3. Settings mixes preferences, storage health, demo data, backup, and destructive actions in one stream

**Target outcome:** Group the route as Dashboard preferences, Notifications, Backup & restore, Storage, Demo data, then a separated Danger zone. Keep all destructive actions last.

#### P3. Ticker detail offers several equal actions without a clear decision path

**Target outcome:** Keep price and freshness first, then present one “Personal context” group for watchlist status, position, active thesis, and notes. Make “Open/Create thesis” the primary research action while watchlist and portfolio edits remain compact secondary actions.

#### P3. Motion has no reduced-motion policy

**Observed evidence:** Shell width/margin transitions, cards, menus, status fades, and overlays use transitions without `motion-reduce` or a global `prefers-reduced-motion` rule.

**Target outcome:** Disable nonessential movement under reduced-motion while retaining state changes without animation.

## 5. Target information architecture

Preserve existing URLs. Change only labels, grouping, and route entry behavior in the first revamp slice.

### Navigation model

```text
Investment Report
├── Today                 /
├── Watchlist             /watchlist
├── Portfolio             /portfolio
├── Research              /research
│   ├── Theses            /research?view=theses
│   ├── Thesis detail     /research/thesis/[symbol]
│   └── Dispatches        /research?view=dispatches
├── Explore
│   ├── Tickers           /tickers
│   └── Strategies        /strategies
└── Settings              /settings
```

“Today” better describes the Dashboard’s job while preserving `/`. “Explore” is a grouping label, not a new route. Do not expose a Reports item until a real report destination and job exist.

### Desktop shell

- Sidebar order: Today, Watchlist, Portfolio, Research; separator/group label; Tickers, Strategies; Settings anchored at the bottom.
- Global header: ticker search, Alerts, Theme. Remove Account until implemented.
- Collapsed sidebar retains accessible names and tooltips; current-route state remains visible without relying only on color.

### Mobile shell

- Bottom navigation: Today, Watchlist, Portfolio, Research, More.
- More sheet: Tickers, Strategies, Settings, and any nonessential global preferences.
- Keep full labels. Do not put six abbreviated destinations into one row.
- Search remains in the top bar because it is a global shortcut to ticker detail.

### Page hierarchy

| Route | Target hierarchy |
|---|---|
| Today | Freshness → Needs attention → Watchlist/portfolio/thesis detail → Portfolio summary → Market context |
| Watchlist | Page title + Add symbol → filters/count → responsive list/table → paste import as secondary disclosure |
| Portfolio | Page title + Add position → value/P&L summary → holdings → equity history → coverage notes |
| Tickers | Search → sort/filter → results; no competing page action |
| Ticker detail | Identity/freshness/price → personal context/actions → chart and levels → linked research → notes |
| Research | Stable Theses/Dispatches tabs → active-tab action → prioritized list → help as secondary disclosure |
| Thesis detail | Sticky identity/light/save state → overview → thesis/trade plan → evidence/files → reviews; preserve one draft across modes |
| Strategies | New strategy → saved strategy list; detail shows assumptions before results and Edit/Delete as secondary actions |
| Settings | Preferences → notifications → backup/restore → storage → demo data → Danger zone |

## 6. Primary action and state inventory by route

Every route must show only one visually dominant action for its current mode. Secondary actions may remain available but must not compete in color, placement, or weight.

| Route | Primary action | Loading | Empty | Error | Success |
|---|---|---|---|---|---|
| Today | Open the highest-priority personal attention item | Preserve page heading; skeleton/label each client-owned card; state quote timestamp | Explain how Watchlist, Portfolio, and Thesis data personalize the page; actions to add the first item | Separate stale/missing market data from unavailable browser storage; offer retry where meaningful | Attention groups render with counts, freshness, and direct destinations; no celebratory toast |
| Watchlist | Add symbol | “Loading watchlist” in the list region; keep add form disabled until storage state is known | Explain Watchlist vs Portfolio; focus Add symbol | Inline invalid/duplicate/storage errors; retain typed values | New row appears, count updates, polite “Added SYMBOL” announcement |
| Portfolio | Add position | Keep summary placeholders distinct from zero values | Explain positions are manual and local; focus Add position | Field-specific validation, missing quote coverage, and storage failure are separate messages | Position appears; totals update; announce save without page refresh |
| Tickers | Open a ticker from search/results | Static results normally need no client loading; show a bounded dataset-unavailable state if build input fails | “No tickers indexed” plus pipeline/freshness explanation for operators, not a dead blank | Invalid dataset or search failure keeps search usable and offers clear filters | Result count and sort state are visible; selected ticker route loads |
| Ticker detail | Open or create the personal thesis | Header/price may be static; personal watchlist/portfolio/notes regions show labelled hydration placeholders | Unknown symbol offers suggestions and Browse all; absent notes/dispatches explain the next action | Missing/stale quote, storage failure, and failed note/action save remain scoped to their section | Watchlist/portfolio/thesis/note change is confirmed in place and reflected across personal context |
| Research | Start a thesis on the active Theses tab; New dispatch on Dispatches | Stable tab shell with region-level loading | Actionable first-thesis or first-dispatch guidance | Storage error retains form/list; stale deep link returns to list with an explanation, not a render-time blank | New or edited item opens in read mode with a polite saved status and stable URL state |
| Thesis detail | Save thesis / Save changes | “Loading thesis” must not resemble an empty new thesis | New known symbol pre-fills quote snapshot and explains local persistence | Validation points to the section; storage/import/file failures preserve the draft and identify unsaved data | Sticky saved state, updated timestamp, and read mode; review/file sub-actions have their own confirmation |
| Strategies | New strategy; Save strategy while editing | “Loading strategies” in the content region | Explain local backtests and lead to New strategy | Field-specific validation and backtest errors preserve assumptions | Saved strategy opens with assumptions, coverage, results, and no-trades state |
| Settings | Change a preference; each data card has its own explicit operation | Per-card loading for preferences and file usage | No files/backups/demo state explains what can be done | Permission, quota, invalid import, partial operation, and unsupported notification errors identify retained data | Announce exactly which preference or dataset changed; show counts/scope for import/export/reset |

### Cross-route state rules

- Never use `0`, `$0`, an empty table, or missing cards as a loading placeholder.
- Quote freshness and browser-storage availability are different states and must not share generic “unavailable” copy.
- An error in one local feature must not replace unrelated static market data.
- Preserve user input after validation, quota, import, or persistence failure.
- Success announcements use a polite live region and name the object changed.
- Destructive success names the exact scope removed. Partial success is an error/recovery state, not success.

## 7. Key journeys

### A. Daily triage

**Desktop:** Today → read freshness → scan Needs attention → open impacted ticker/thesis → review quote and personal context → update thesis/position/note → return to Today with state preserved.

**Mobile:** Today first viewport shows freshness and the top personal exception → tap the exception → ticker/thesis page → perform the action with a 44 px target → use Back or bottom navigation without losing scroll/draft state.

**Exit condition:** The user can name what changed, why it matters personally, and what they recorded next.

### B. Follow an instrument and form a thesis

Tickers or global search → ticker detail → Add to watchlist → choose status/priority → Create thesis → prefilled thesis detail → Save → Watchlist and Research both expose the active thesis.

**Exit condition:** Watchlist, ticker detail, and Research show one consistent symbol/status/light without a reload requirement.

### C. Add and review a holding

Portfolio → Add position → see value/cost/P&L or explicit missing-quote state → edit quantity/price → open ticker/thesis from the row → return with the position intact.

**Mobile requirement:** The action and key P&L remain visible without horizontal scrolling.

### D. Review research

Research → Theses → choose red/stale thesis → read current thesis and quote freshness → edit or add quarterly review → save → return to prioritized thesis list.

**Exit condition:** The saved state and updated research age are clear; a failed save leaves the draft recoverable.

### E. Create and inspect a strategy

Strategies → New strategy → select type and symbols → enter assumptions → Save strategy → inspect validation/no-trade/error/success result → Edit assumptions.

**Exit condition:** Results never appear without the assumptions and data coverage that produced them.

### F. Back up or reset local data

Settings → choose a precisely scoped operation → review included/excluded datasets and counts → export/confirm → receive exact success or recovery instructions.

**Exit condition:** The user can verify what is protected, overwritten, retained, or deleted.

## 8. Responsive behavior contract

### Breakpoint intent

| Range | Target behavior |
|---|---|
| 320–767 px | One content column; five-item bottom navigation; full labels; mobile cards for dense rows; forms stack; overlays fit the visual viewport and safe areas |
| 768–1023 px | Sidebar appears; two-column summaries where useful; full tables may scroll inside their region; actions remain visible |
| 1024 px and wider | Persistent sidebar; dashboard uses two-column cards where hierarchy permits; content capped at the existing container width |

### Concrete responsive findings

- `AppShell` already reserves bottom padding for the fixed mobile navigation. Retain it and add safe-area inset padding.
- `IndexPulseRow` already moves from two to four columns. Retain this compact pattern when the row moves below personal attention.
- `TickersGrid` uses two to five columns and is suitable for narrow screens; ensure 200% text zoom does not truncate both name and sector into ambiguity.
- Watchlist and Portfolio need dedicated narrow row layouts; horizontal overflow alone is not an acceptable primary mobile interaction.
- The mobile top bar combines the full product name with four icon controls. At 320 px, use a short brand mark/title and remove the dead Account control so controls do not collide.
- RSI and date input grids in Strategies must stack at the base breakpoint.
- Thesis detail is a long, multi-section workflow. Provide a sticky save status and section navigation/progressive disclosure; do not create independent drafts per presentation mode.
- Dialogs and sheets must use `dvh`, safe-area insets, and internal scrolling so the keyboard does not hide the current field or footer.

### Required viewport checks

- 320×568: minimum supported narrow layout and 200% text zoom spot checks.
- 390×844: primary mobile acceptance viewport.
- 768×1024: breakpoint transition/table behavior.
- 1280×800 and 1440×900: desktop hierarchy and maximum-width behavior.
- Test portrait and landscape for overlays, ticker tables, strategy inputs, and thesis save controls.

## 9. Accessibility findings

| Severity | Finding and evidence | Fix direction |
|---|---|---|
| High | Light selected-state token pair is ~2.00:1; dark negative text on card surface is ~3.89:1 (`globals.css`) | Correct semantic token pairs and add automated contrast checks; do not patch isolated components |
| High | Charts have no programmatic name, summary, or keyboard-accessible data equivalent (`sentiment-area-chart.tsx`) | Add labelled figure/summary and a bounded data-table disclosure; expose reference levels in text |
| High | Alerts drawer is modal visually but not semantically or behaviorally (`alerts-drawer.tsx`) | Shared Sheet/Dialog with `aria-modal`, labelled title, initial focus, focus containment, Escape, restoration, and inert background |
| High | New thesis listbox changes an active row without connecting it to the focused input (`new-thesis-dialog.tsx`) | Implement the ARIA combobox pattern with `aria-controls`, `aria-expanded`, and `aria-activedescendant`, or use a proven primitive |
| High | Thesis-dot links are about 6×6 px; many icon/small buttons are 24–36 px | Enlarge coarse-pointer hit areas to 44×44 px and give thesis state a labelled, visible target |
| Medium | Research tab buttons lack `id`, `aria-controls`, tab panels, and roving `tabIndex` (`research-view.tsx`) | Use a shared Tabs primitive with Arrow-key behavior and stable query state |
| Medium | Watchlist places `aria-sort` on the inner button instead of the column header (`watchlist-table.tsx`) | Put `aria-sort` on the active `th`; keep the button label for the next action |
| Medium | Dispatch title errors are not a live alert or input description; delete uses native `confirm()` (`dispatch-form.tsx`, `dispatch-view.tsx`) | Link errors with `aria-describedby`/`aria-invalid`, use `role=alert`, and use shared AlertDialog |
| Medium | No consistent reduced-motion behavior despite shell, overlay, menu, and saved-state transitions | Add `motion-reduce` styles/global policy and verify state remains perceivable without animation |
| Medium | Several custom row buttons and links depend on hover styling; focus treatment is not consistently explicit | Add shared focus-visible styling and test every route in DOM order with keyboard only |
| Low | Page and control copy mixes “Dashboard/Home/Today,” “Watch,” “Folio,” and “Strats” | Use the target full labels consistently in visible text and accessible names |

No critical information should rely on red/green alone. Existing arrows, signs, labels, and light-state text are useful patterns to keep.

## 10. Small implementation outcomes, order, benefit, and risk

1. **Correct truthful data-management copy and scopes.** Highest trust benefit; storage changes are high risk and require Bruce/Natasha ownership before Thor updates final UI.
2. **Unify navigation and remove dead controls.** High findability benefit; low data risk; validate mobile overlay and active-route semantics.
3. **Correct semantic contrast and focus/touch primitives.** Product-wide accessibility benefit; medium visual-regression risk because tokens and primitives have many consumers.
4. **Reorder Today around personal attention.** High decision-speed benefit; medium duplication/hierarchy risk; preserve calculations.
5. **Stabilize Research entry and active-tab actions.** High comprehension benefit; low persistence risk if URLs/deep links are preserved.
6. **Introduce mobile row presentations for Watchlist and Portfolio.** High mobile benefit; medium parity risk for inline edit/sort/action behavior.
7. **Consolidate overlays and chart alternatives.** High accessibility benefit; medium implementation/testing effort; use shared primitives.
8. **Polish Settings grouping, strategy narrow forms, and reduced motion.** Useful follow-through after the core IA is stable.

Each outcome should be independently reviewable. Do not combine navigation, financial semantics, storage migration, and research-form decomposition into one patch.

## 11. Downstream acceptance matrix

| Area | Minimum proof |
|---|---|
| Navigation | All existing routes reachable on desktop/mobile; full consistent labels; active route announced; no dead Account action |
| Today | Personal exceptions precede market context; freshness visible; fixture priorities lead to correct destinations |
| States | Loading is not empty/zero; each route has actionable empty, scoped error, and announced success behavior |
| Responsive | No page-level horizontal overflow at required viewports; mobile rows expose actions; overlays survive keyboard and landscape |
| Keyboard | Complete each primary route action without a pointer; logical focus order; visible focus; modal focus contained/restored |
| Screen reader | Page/section headings, tabs, forms, sort state, dialogs, saved state, chart summaries, and errors are announced |
| Contrast | WCAG AA semantic-pair checks in light/dark; state does not depend on color alone |
| Persistence | Failed writes preserve drafts; reload verifies success; backup/reset copy matches exact data scope |
| Performance | Preserve static export; avoid moving full quote histories into the global client shell; no heavy UI dependency for simple behavior |

## 12. Risks and handoff

- **Data trust:** Backup/reset work crosses UI and storage boundaries. Thor must not make the copy promise more than Bruce’s operation can prove.
- **Financial meaning:** Reordering or formatting must not change P&L, equity, backtest, freshness, or currency semantics.
- **Local-only state:** Browser QA must use disposable fixture storage. Never validate destructive settings against a sole real-user dataset.
- **Static export:** Preserve generated dynamic routes and direct reload behavior for encoded symbols such as `^GSPC`, `GC=F`, and `BTC-USD`.
- **Research complexity:** Decompose one behavior slice at a time; keep one draft and save path across Quick/Deep/Guided views.
- **Validation gap:** Steve should perform an independent browser pass on the current baseline and each revamp slice, beginning with navigation, narrow tables, overlay focus, and contrast.

This audit is feedback and an implementation contract, not visual approval. Final route and regression validation remains part of the revamp delivery.
