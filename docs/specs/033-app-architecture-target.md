# [SPEC-033] Application architecture target

Architecture contract for [INT-374](/INT/issues/INT-374), under the [revamp plan](/INT/issues/INT-372#document-plan). Reviewed 2026-11-14 against `7880581`.

**Status:** Architecture review complete; implementation remains downstream work. This document defines the target, not shipped behavior or permission to deploy. The parent plan's final preview approval and no-self-merge gates remain in force. Follow the spec approval process before implementation.

## 1. Outcome and limits

Evolve the existing Next.js application in place. Separate presentation, pure domain rules, browser persistence, and build-time market-data loading. Keep static export, Cloudflare Pages, the daily quote pipeline, account-free local use, and existing personal data.

This task changes documentation only. It does not refactor production code, change storage formats, delete files, introduce a backend, or deploy. Supabase, authentication, broker integration, live trading, and paid feeds remain out of scope. Preserve useful components, calculation functions, and repository contracts; no new framework or global state library is required.

## 2. Confirmed current structure

All paths below are repository-relative; app module paths in later sections are relative to `web-app/src/`.

| Boundary | Evidence and current behavior |
|---|---|
| Deployment | `web-app/next.config.ts` uses `output: "export"`. Production and preview workflows build in `web-app/` and deploy `out` to Pages project `investment-report-app`. `wrangler.toml` also names `out`. OpenNext config and `cf:*` commands exist but these workflows do not use them. |
| Routes | `web-app/src/app/` has `/`, `/watchlist`, `/portfolio`, `/tickers`, `/research`, `/strategies`, `/settings`, plus `/ticker/[symbol]` and `/research/thesis/[symbol]`. Both dynamic routes enumerate quote-file symbols at build time. There is no current `/reports` app route. |
| Shell | Every page wraps `AppShell`; the shell owns sidebar persistence and mounts the TopBar. `app/layout.tsx` owns fonts and theme. Client wrappers do not by themselves mean all their server-rendered children must become client modules. |
| Static inputs | `lib/quotes/load-quote.ts`, `snapshots.ts`, `compact-daily.ts`, `load-all-series.ts`, and `lib/company/load-company.ts` read repository JSON using Node filesystem access. Roots depend on the `web-app/` working directory. Snapshot and compact-series types share files with filesystem loaders. |
| Pipeline | `scripts/fetch-quotes.py` uses `_tickers.py`, writes quotes and company data, defaults to ten years of history, and retains existing files on per-symbol fetch failure. `.github/workflows/daily-quotes.yml` runs at 22:30 UTC weekdays, commits both directories, then builds and deploys directly. All-symbol failure exits 2; partial failure can succeed with old files still present. |
| Local data | Eight localStorage datasets and an IndexedDB database hold personal data. `lib/storage/contracts.ts` checks implementations at compile time; consumers still import concrete functions. Most localStorage stores are synchronous; files are asynchronous. |
| Domain | Pure calculation and parsing code already exists in `lib/backtest/`, `lib/quotes/`, `lib/research/`, and `lib/parsing/`. However, research helpers mix calculations with store writes, browser notifications, formatting, and clock access. |
| Large clients | `components/research/thesis-form.tsx` is 1,578 lines; wizard 987; import panel 638; files section 615; thesis view 614. The form coordinates hydration, prefill, validation, save/delete, review refresh, import/autofill, and several editor modes. File length is a signal; responsibility boundaries determine extraction. |
| Verification | `web-app/package.json` has build and an existing `next lint` command, but no test script. Workflows run TypeScript and build. This review does not claim a fresh application build or test run. |

### Material gaps

- `lib/storage/local-storage.ts` conflates missing, corrupt, and unavailable data. Several stores ignore the boolean write result; thesis, review, and dispatch stores instead throw. Even access to the localStorage getter can fail outside the helper's current `try` block.
- `export-import.ts` exports six datasets, omitting `theses`, `quarterly_reviews`, and file metadata/blobs. Its sequential writes are not an atomic dataset restore, despite the source comment. `demo-seed.ts` clears only four stores while Settings says “All local user data cleared.”
- Alerts persist `thesis_crossed_zone_count` from the dashboard, so a direct visit elsewhere can use an old count. `zone-tracker.ts` calls `upsertThesis`, which updates `updatedAt`; a monitoring write can therefore make old research look recently edited.
- `getPortfolioPnL` adds values across quote currencies without conversion. Persisted prices and quantities are JavaScript numbers, not an exact-money model. The equity curve assumes today's holdings throughout history. Do not describe these as account returns or silently preserve mixed-currency totals as financially valid.
- Production and preview push filters include quotes but omit `data/company/**`; preview is restricted to `v3-revamp`. Daily deployment covers company refreshes from that job, but a company-only manual commit need not trigger a build.
- No service-worker registration/cache implementation was found. Loaded local workflows can run without a network, but reliable cold reopening and uncached route navigation offline are not implemented.
- Root `README.md`, old root HTML, and parts of the decision/status history describe the retired report pipeline. `stock-overview.tsx` and `thesis-autofill-panel.tsx` already exist despite SPEC-030/031 status rows saying todo; their completion requires a separate acceptance audit.

## 3. Target module map and allowed dependencies

Keep one application and one Python ingestion pipeline. Introduce only boundaries needed by an extracted slice.

| Target | Owns | Initial migration sources |
|---|---|---|
| `app/` | Static route composition, metadata, parameter enumeration; selects serializable page inputs | Existing pages; move repeated shell composition to a shared layout when verified |
| `components/layout`, `components/ui`, `components/charts` | Navigation, theme, accessible primitives, generic chart rendering | Keep current components and design tokens |
| `features/<area>/components`, `features/<area>/hooks` | Feature presentation, form drafts, hydration and view state | Move existing feature components as each workflow is changed; no bulk rename |
| `lib/domain/<area>` | Domain types, validation, pure transformations and calculations | Existing domain types; portfolio calculations, backtests, thesis rules, parsing |
| `lib/application/<area>` | Multi-repository operations, persistence orchestration, operation outcomes | Thesis save/prefill/review, zone stamping, backup/restore and explicit clear operations |
| `lib/application/ports.ts` | Narrow repository contracts and operation error types | Evolve `lib/storage/contracts.ts`; retain compatibility exports during migration |
| `lib/storage/` | localStorage and IndexedDB adapters, codecs, schema registry, migrations, change subscriptions | Existing stores; retain public function wrappers until each consumer moves |
| `lib/data/static/` | Build-only filesystem access, dataset decoding, route DTO assembly | Quote/company loaders; enforce server-only imports |
| `lib/platform/browser/` | Download/blob URL lifecycle, notification API, optional offline cache registration | Browser effects now inside research and storage helpers |
| `lib/utils/format.ts` | Presentation formatting only | Keep current formatting location; domain returns numbers and structured reasons |
| Repository `scripts/`, `data/` | Ingestion and generated public market artifacts | Preserve `fetch-quotes.py`, `_tickers.py`, quotes/company directories |

Dependency direction:

```text
Python ingestion -> data/quotes + data/company
                         |
                 data/static (build only) -> app routes -> serializable DTOs
                                                            |
                                      feature UI/hooks -> application -> ports
                                            |                |            ^
                                            +------------> domain       storage adapters
                                                            ^            |
                                                            +------------+
                                      browser effects <- application composition
```

Domain modules must not import React, Next, filesystem loaders, stores, browser globals, notification APIs, or presentation formatters. Supply time, IDs, settings, quotes, and holdings explicitly. Domain-to-domain imports are allowed for stable types/rules; coordinate cross-store writes in application functions.

Feature containers/hooks may compose concrete adapters with application functions. Leaf views receive values and callbacks. No service locator, generic repository superclass, or all-app mutable context is needed. Keep localStorage ports synchronous and file ports asynchronous; a future remote adapter is a separate contract migration, not a promised drop-in replacement.

Move `QuoteSnapshot`, `CompactBar`, and associated map types into browser-safe domain/data-contract files before moving loaders. Client imports must never reach filesystem code through a mixed barrel. Add lint/import-boundary checks when the quality foundation lands.

## 4. Routes, shell, and static data contracts

Keep the nine route patterns above. Share a shell layout without changing URLs; navigation labels can follow the UX audit. Browser state loads after hydration with an explicit loading state, not a misleading empty portfolio.

| Route | Build-time input | Browser-owned work |
|---|---|---|
| `/` | Snapshot map; compact closes for equity cards | Read holdings/watchlist/theses/preferences; derive cards and alerts |
| `/watchlist`, `/tickers` | Snapshot map and known symbol list | Watchlist edits and filtering; no full OHLCV payload |
| `/portfolio` | Snapshot map and compact closes | Holdings operations and pure valuation/equity functions |
| `/ticker/[symbol]` | One full quote series | Notes, research links, trade levels |
| `/research` | Compact snapshot map | Thesis/dispatch overview and create flows |
| `/research/thesis/[symbol]` | One series, optional company data, snapshots needed for portfolio prefill | One editor draft, explicit save, reviews, files, import preview |
| `/strategies` | Available symbols and backtest histories | Strategy persistence; deterministic local backtest |
| `/settings` | Available symbols | Preferences, scoped backup/import/reset and file management |

The small snapshot DTO may be supplied once by the shared build-time layout for consistent TopBar alerts. Do not load full series into that layout. Initially retain route-scoped histories on `/strategies`; measure serialized payload and execution time before adding lazy static files or a Web Worker. Any later lazy loader must preserve offline availability of selected histories.

Build loaders return typed success/missing/invalid results with diagnostics; absent company fundamentals remain a supported empty state. Validate symbol-to-filename membership, finite closes, ascending dates, nullable OHLCV fields, and required metadata before deriving DTOs. Invalid artifacts must not disappear silently from a release; fail validation or explicitly report an approved degraded dataset.

Preserve provider symbols such as `^GSPC`, `^NDX`, `GC=F`, and `BTC-USD`. The paste parser intentionally has different rules and must not become the filesystem/route canonicalizer. Encode links once and test direct requests plus reloads for these symbols.

Unknown locally saved symbols must remain visible and editable. Do not assume the existing missing-data branch in a generated dynamic page handles ungenerated paths. Add an exported fixed fallback such as `/research/thesis?symbol=...` for local-only thesis editing; parse the query in a client island with a static fallback. Known-symbol URLs remain unchanged. Ticker links for unknown symbols should lead to a clear unavailable-data view instead of a broken generated URL. Do not add a runtime API just to resolve these paths. Static export requires build-known dynamic paths; request-time features remain excluded. See [Next.js static export guidance](https://nextjs.org/docs/app/guides/static-exports).

Freshness uses both the latest trading-bar date and ingestion `generatedAt`, per symbol. Company generation time is separate. UI reports last close, missing data, stale ingestion, and partial coverage explicitly. Inject `now` into freshness rules; choose thresholds in one domain policy with weekend-aware fixtures. Do not interpret a weekday cron as intraday or continuously refreshed pricing.

## 5. Domain and workflow ownership

- **Portfolio:** Own valuation, equity alignment, position-sizing inputs, and currency grouping in `lib/domain/portfolio`. Preserve raw persisted numbers during extraction. Group totals by currency; no single mixed-currency total without an explicit FX dataset and policy. Define decimal precision and rounding at calculation boundaries before changing arithmetic; centralize it and test fractional quantities, four-decimal quotes, zero basis, missing prices, and rounding boundaries. A decimal-storage conversion needs its own versioned migration. Formatting never changes stored values.
- **Research:** One `useThesisEditor` reducer/state owner manages a draft shared by Quick, Deep, and Guided views. Extract pure draft-to-thesis mapping and validation before splitting form sections. Import/autofill produce reviewable patches to that draft, not independent saves. Preserve notes, checks, unknown persisted fields, edit mode, and prefill values on save. Durable draft resume, if added, uses a separately versioned draft record; incomplete drafts must not overwrite saved theses.
- **Reviews and files:** An application operation owns “save review and update thesis light.” Make partial failure recoverable; two localStorage writes are not a transaction. Keep original review IDs during retries. Thesis deletion currently does not cascade to reviews/files: retain that behavior until an explicit scoped deletion contract lists affected data and recovery steps. File metadata/blob changes share an IndexedDB transaction. Release object URLs when previews close.
- **Monitoring:** Compute crossed zones and stale research as pure values. Use an application operation for idempotent crossing stamps, distinct from authored `updatedAt`; use a browser adapter for opt-in notifications. The TopBar and dashboard consume the same derived alerts. Remove persisted crossed-count state only after replacing both readers and writers. Keep notification permission checks and do not transmit local research.
- **Strategies:** Keep `lib/backtest/engine.ts` and indicators pure during extraction. Preserve baseline fixtures for signal timing, warmup periods, missing bars, fees/slippage if supported, and portfolio aggregation. Do not change backtest semantics in a component move.

## 6. Local compatibility and migration contract

### Persistent inventory

| Identifier | Current shape / owner | Compatibility requirement |
|---|---|---|
| `watchlist_items` | Array; symbol required, metadata optional | Read v2 `[{symbol}]`; preserve extra fields and current symbol identities |
| `portfolio_positions` | Array of symbol, quantity, avgPrice, optional addedAt/platform | Preserve numeric values and existing IDs/identity semantics |
| `ticker_notes` | Symbol-to-notes map | Preserve note IDs, text, timestamps and symbol associations |
| `research_dispatches` | Array | Preserve IDs, body, optional ticker, timestamps |
| `strategies` | Discriminated strategy array | Preserve variant-specific parameters and IDs |
| `dashboard_settings` | Settings object | Preserve settings, including notification opt-in; missing fields use defaults |
| `theses` | Symbol-to-thesis map | Preserve nested research, notes, scenarios, levels, stamps and editor mode |
| `quarterly_reviews` | Review array linked by thesisSymbol | Preserve chronology, IDs and references even if thesis is absent |
| `sidebar_collapsed`; theme preference | UI preferences | Keep existing behavior and keys; classify separately from personal research |
| `thesis_crossed_zone_count` | Derived cache | Recomputable; retire after shared alert derivation, not a user-data migration |
| IndexedDB `investment-report`, version 1 | `research_files_meta` and `research_files_blobs`, keyPath `id`; metadata index `by_thesis` on thesisSymbol | Preserve database/store/index names, IDs, metadata and blob bytes |

Registry entries declare key, legacy shape, decoder, current schema version, backup scope, and migration function. They are the source of truth for backup, clear, and migration; no duplicate key lists. Initial extraction changes neither existing keys nor wire shapes.

Repository reads distinguish `missing`, `ready`, `invalid`, and `unavailable`. Writes/removes return an explicit result such as `{ok: true, value}` or `{ok: false, code, message}`; use codes for quota, unavailable storage, invalid data, and conflict/recovery conditions. Keep legacy throwing/named-function wrappers while callers migrate. Never publish success or a change event before persistence succeeds. Same-tab subscriptions and browser storage events invalidate cached views; unsaved editor drafts require conflict handling rather than automatic replacement.

For the first versioned migration:

1. Read and validate legacy data without modifying it. Preserve raw source text for recovery and unknown fields in supported records; a corrupt record must not become an empty dataset that the next write overwrites.
2. Produce a migration preview in memory. Save a recoverable copy before writes; if quota or storage denial prevents backup, stop and offer export. Do not delete the original to make room.
3. Prefer additive, legacy-compatible writes under the same keys. Record version metadata separately only when a migration is needed; never wrap an array in an envelope while old consumers still read it. Recognize unknown newer versions and stop mutation rather than downgrade them.
4. For multi-key operations, use a durable journal with before-images and operation state, verified before changing keys. Resume or restore after interruption before accepting new writes. Block concurrent mutation during recovery. Cross-tab races need explicit detection/serialization; localStorage provides no multi-key transaction guarantee.
5. Mark migration complete only after verified writes. Preserve rollback data until recovery is proven. An old deployed app must still read compatible values; any incompatible migration needs a separate rollout/rollback contract before shipping.
6. Upgrade IndexedDB only when its schema changes, in the versioned upgrade transaction. Never recreate the database as a shortcut. Test old metadata and blobs, blocked upgrades from another tab, aborts, and reload.

### Backup and reset

Keep accepting `investment-report-v1` exports. Treat absent datasets as absent from that backup, not permission to erase newer data. Present exact scopes and replacement counts before applying any import. Validate the full proposed input before writes and preserve existing bytes on invalid input or recoverable failure.

A new versioned backup manifest must include all eight datasets and a file manifest. Full backup contains metadata plus original blob bytes, preferably as an archive; a JSON-only export must explicitly say that file contents are excluded. Reconcile IDs and thesisSymbol links, verify blob sizes/checksums, and restore files within IndexedDB transactions. A restore spanning IndexedDB and localStorage is a recoverable staged operation, not a single atomic commit. Test interrupted stages and repeat invocation. Keep UI/theme preferences an explicit optional scope.

Replace “clear all” and demo-seed behavior with registry-defined scopes and accurate confirmations. Never expand an old four-store clear operation silently to delete files or all research. No clear, migration, or failed import may call unrestricted `localStorage.clear()` or delete the IndexedDB database.

Keep the production origin stable. Matching key names cannot move data between origins; [localStorage is scoped to origin](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). A preview starts with separate storage. If the old `investment-report.pages.dev` site is retired or users move to `investment-report-app.pages.dev`, provide export on the old origin and tested import on the new origin before redirects. Verify file transfer separately. Redirects cannot transfer browser data.

## 7. Offline, deployment, and trust boundaries

**Minimum invariant:** Once the needed app code and data are loaded, edits, local research/files, calculations, and backtests do not depend on a server. External research links and fresh quote downloads require connectivity. Show quote timestamps offline; do not replace unavailable prices with zero.

**Target for reliable reopening:** Add a bounded, versioned static-asset cache as a separate slice if the revamp promises cold offline use. Cache exported shell HTML, required navigation payloads, JS/CSS/fonts, and explicitly available market histories as one release set. A failed update retains the prior usable set. Avoid forcing reload over unsaved work. Mark uncached routes/history unavailable; do not claim they are offline-ready. Cache eviction must never erase localStorage/IndexedDB personal data. Verify actual Next export output on Pages, not only dev navigation. This is a proposed addition, not a capability of the reviewed code.

Keep one canonical build/deploy path: install from the lockfile, quality checks, `npm run build` in `web-app/`, then `wrangler pages deploy out`. Preserve daily direct deployment; do not assume its bot commit will trigger the main workflow. Include quotes, company data, ingestion code, and relevant workflow changes in build validation triggers. Configure the actual approved feature branch for preview instead of relying on the historical `v3-revamp` name. Prevent overlapping production deploys from publishing an older snapshot after a newer one.

Build-only code may read repository market artifacts. Browser code may read personal data only on that device; personal data must never enter exported build files, telemetry, or quote artifacts. CI credentials stay in CI. Keep Markdown sanitization, external URL checks, file preview constraints, and dependency remediation with Natasha's security work. Provider JSON and imported backups are untrusted boundary inputs, even when generated by a known script.

The root layout currently obtains fonts through `next/font/google` during build. Retain generated self-hosted assets at runtime; a reproducible build may vendor licensed font files in a focused follow-up. Do not add runtime Google Fonts fetching as an offline workaround.

## 8. Deletion classification

No deletion is performed by this spec. Recheck references at the implementation commit.

| Candidate | Classification and evidence | Removal gate |
|---|---|---|
| `web-app/tsconfig.tsbuildinfo` | Safe generated cache; tracked despite incremental TypeScript configuration | Add ignore rule and prove typecheck/build regenerate as needed |
| Root `git` | Safe empty tracked file at reviewed commit; no code/workflow reference found | Recheck it is still empty and unreferenced; do not confuse it with `.git` |
| `scripts/lib/assemble-markdown.js` | Safe for current cockpit pipeline: exported legacy assembler with no repository callers | Repeat caller search; keep history in Git; do not remove `_tickers.py` or quote script |
| `web-app/open-next.config.ts`, `@opennextjs/cloudflare`, `cf:*` scripts | Conditional safe removal as one change; current Pages jobs use static export | Confirm no external operator uses these alternate commands; update lockfile, build instructions, and test Pages preview. Keep `wrangler`, `wrangler.toml`, and Next export config |
| Root `index.html`, `today.html`, `reports.html`, `tracker.html`, `watchlist.html`, `portfolio.html`, `tickers.html`, `settings.html`, `assets/app.js`, `assets/style.css` | Legacy site, absent from current `out` deployment; not proven unused by old hosting | `BACKLOG.md` explicitly requires classification approval. Confirm old hosting/URL owners, backup transfer, and redirect/archive policy first. Do not delete merely because the new app does not import them |
| Old report references in README and `scripts/AGENTS.md` | Historical documentation drift | Rewrite active entry-point guidance narrowly; preserve useful historical context rather than deleting instructions indiscriminately |
| `thesis_crossed_zone_count` readers/writers; old store/loader import wrappers | Removable only after replacement | All consumers migrated; compatibility/alert tests pass; keep stored user datasets |
| Domain helpers, `data/quotes`, `data/company`, design references, historical specs | Retain | No evidence they are safe to delete; quoted spec status is not proof of dead code |

Old report URLs such as `today.html` cannot be redirected to a nonexistent current report route. Choose an explicit archive, retirement notice, or product destination with the site owner. Current Cloudflare dashboard configuration and external consumers were not inspected, so root-site removal and origin changes remain conditional.

## 9. Incremental implementation order

| Step / owner | Change boundary | Exit proof / rollback |
|---|---|---|
| 1 — Bruce, with Steve fixtures | Quality foundation; capture all storage shapes, v1 backups and IDB v1 blobs; baseline financial/parser/backtest behavior | Repeatable check command; no data writes on read; preserve fixtures. Security upgrades may proceed independently |
| 2 — Bruce | Registry, read/write outcomes, compatibility codecs and recoverable migration/restore primitives; migrate one simple store first | Legacy fixtures and failure injection pass; old public wrappers work; no key/shape change. Expand store by store |
| 3 — Bruce | Browser-safe DTOs and build-only loaders; pure financial/research rules and application operations | Type/import checks and static build; malformed data, currency separation, clock determinism and operation retry tests. No broad UI move |
| 4 — Thor | Shared shell/navigation and loading/error states; consume stable ports via feature hooks | Direct route/reload, mobile/keyboard, same-tab updates and failed-save states pass. Preserve URLs and stored preferences |
| 5 — Thor + Bruce by file ownership | Dashboard/watchlist/portfolio/ticker slices; shared alerts, known/unknown symbol paths | Each slice passes behavior fixtures and browser smoke tests before the next; quote payload sizes recorded |
| 6 — Thor + Bruce | Research editor decomposition, review/file operations, then strategy UI | All modes share one draft/save path; import/autofill preview retains untouched fields; review retries do not duplicate; files survive refresh |
| 7 — Bruce + Thor | Complete backup/restore/reset scopes; reliable offline cache if promised; workflow trigger corrections | Old/new backups, blob round trip, interrupted restore, quota denial, offline reopen/update and Pages preview checked. Never test with sole real-user copies |
| 8 — Tony, Natasha, Steve | Independent review; narrowly approved cleanup; documentation and final preview PR | All route/data acceptance checks pass; deletion gates evidenced. Final preview approval before production merge |

Steps 3 and later may move one module at a time behind forwarding exports. Avoid simultaneous path renames, arithmetic changes, data migrations, and visual redesign in one patch. Tony coordinates existing downstream tasks; this review does not create a parallel work queue.

## 10. Acceptance and verification matrix

| Invariant | Downstream validation |
|---|---|
| Static deployment | Typecheck and production static build; serve `out`; direct/reload checks for all route patterns, encoded symbols, and unknown-symbol fallback; no server endpoint/Worker required |
| Dependency boundaries | Import checks prohibit filesystem/build loaders in client dependency graph and storage/browser/framework code in domain |
| Compatibility | v2 watchlist, all eight current datasets, unknown fields, invalid raw data, unknown future version, v1 export, and IDB v1 fixtures survive supported reads/round trips |
| Honest persistence | Inject denied getter/access, quota exhaustion, corrupt JSON, failed remove, interrupted journal and blocked IDB upgrade; no false save success or destructive fallback |
| Cross-store consistency | Review/thesis operation and full restore retry after each stage; no duplicate review IDs, dangling new blob records, or silent deletion of omitted datasets |
| Financial behavior | Fractional holdings, zero basis, missing/stale quotes, mixed currencies, equity alignment, deterministic backtests and explicit rounding policy; no UI-owned alternative formula |
| Research | Quick/Deep/Guided retain the same draft and saved fields; import/autofill patch preview; monitoring does not reset authored research age |
| Pipeline | Fixture-based artifact checks; failed symbol retains last good data and exposes stale metadata; company-only change triggers validation; daily workflow still builds/deploys explicitly |
| Offline | Disconnect after loading and exercise local workflows; if cold reopening is promised, restart offline and test cached routes/files/backtest plus failed cache update; no network needed to save |
| Privacy and origin | Preview uses its own fixture storage; no personal-data build artifacts; old/new origin transfer tested before any origin retirement |

Review verification for this documentation: source inspection at `7880581`, route/store/workflow inventory, repository reference searches, and documentation diff/link checks. Runtime behavior and hosting settings were not independently exercised. Remaining uncertainties have explicit gates above and do not require a backend redesign.
