# [SPEC-016] Repository Abstraction (Future-Supabase Contract)

## 1. Context
ADR-002 keeps user data local-first. ADR-003 reserves Supabase as an optional sync layer. Three localStorage-backed stores live under `web-app/src/lib/storage/`: `watchlist-store.ts`, `portfolio-store.ts`, `ticker-notes-store.ts`. Each exports a small CRUD surface that consumers (views, cards, widgets) call directly.

When Supabase ships (SPEC-012 or later), we'll need parallel implementations. Without a typed contract, the swap is "find and replace every import" — risky.

## 2. Problem
Today's contract between stores and consumers is *implicit* — defined by the named exports and their signatures. A future Supabase impl that drops or renames a method silently breaks consumers. We want compile-time enforcement.

## 3. Scope

### In scope
- `web-app/src/lib/storage/contracts.ts` — `WatchlistRepository`, `PortfolioRepository`, `NotesRepository` interfaces.
- Type-level conformance assertion in each store (zero runtime cost; just `const _conforms: XRepository = { … }` at the bottom of the file).
- Spec doc + STATUS.md row.

### Out of scope
- Changing consumer call sites (they continue to import named functions; the contract works as a check, not a router).
- Implementing Supabase impl — separate spec when auth lands.
- Async-aware contracts — current API is sync; Supabase impl will be async, requires Promise-returning interfaces. Address when we get there (probably async-first contract from day one).
- Repository factory / dependency injection — overkill until we have multiple impls to choose between.

## 4. Functional requirements
- FR1: `contracts.ts` exposes 3 typed interfaces matching the current store APIs.
- FR2: Each store has a `_conforms: XRepository = { … }` assertion that fails to typecheck if any method signature drifts.
- FR3: No consumer code changes. Existing imports keep working.

## 5. Acceptance criteria
- [ ] AC1: Renaming or removing any function in a store fails `tsc --noEmit`.
- [ ] AC2: `npm run build` passes.
- [ ] AC3: STATUS.md SPEC-016 row updated.

## 6. Risks
- **Risiko**: Sync interfaces will need to become Promise-returning when Supabase lands.
  **Mitigasjon**: Future spec adds async wrappers; the type alias makes that swap a single-file change.
