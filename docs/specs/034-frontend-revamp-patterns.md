# [SPEC-034] Frontend revamp component patterns

Implementation contract for the shared shell and investment workflows delivered by [INT-377](/INT/issues/INT-377). These patterns refine the target in [SPEC-032](032-revamp-ux-audit.md) without changing routes, storage keys, or financial rules.

**Status:** Implemented; independent browser regression is tracked in Paperclip.

## Navigation and page hierarchy

- Both desktop and mobile navigation consume `components/layout/navigation.ts`. Add or rename a destination there instead of maintaining separate route lists.
- Desktop exposes the primary work in this order: Today, Watchlist, Portfolio, Research, then Tickers and Strategies under Explore, with Settings last.
- Mobile exposes Today, Watchlist, Portfolio, and Research directly. `More` opens the shared modal `Sheet` for Tickers, Strategies, and Settings. Use full labels and announce the current route with `aria-current="page"`.
- Keep all existing URLs. Today is the visible name for `/`; Explore is only a group label.

## Overlays and destructive actions

- Use `ui/sheet.tsx` for modal drawers and `ui/confirm-dialog.tsx` for confirmations. Do not call native `confirm()` or create one-off fixed overlays.
- An overlay must have an accessible name, `aria-modal`, initial focus, Escape handling, a contained Tab order, background-scroll suppression, and focus restoration.
- Destructive actions open a confirmation that names the record and states what is retained. Cancel receives initial focus. Deletion must never be triggered by a row icon alone.
- Dialog bodies and action rows must fit within `100dvh` and scroll internally on narrow or landscape screens.

## Responsive data collections

- From `md` upward, dense Watchlist and Portfolio data use the sortable/editable table.
- Below `md`, render cards instead of making removal or primary values depend on horizontal scrolling. Each card keeps the symbol, current value, change or P&L, editable personal state, thesis link, and remove action visible.
- Mobile controls use a minimum 44×44 px hit area. Keep visible text for thesis state; do not expose a small color dot as the only target.
- If a secondary data table still needs overflow, contain it within its section so the page itself does not overflow.

## State language

- Loading means stored browser data has not been read yet; it must not render as an empty list or zero balance.
- Empty states use a dashed surface, an action-oriented heading, and one sentence explaining the next useful action and persistence scope.
- Errors stay beside the failed operation, use `role="alert"` where immediate announcement is needed, and must not discard the user's draft.
- Success copy states what was saved, imported, restored, or removed. Storage operations must report their exact included and excluded scope.
- Missing quotes and mixed currencies are explicit result states. Do not substitute zero or add values from different currencies.

## Long-form drafts and charts

- Thesis and strategy drafts persist in browser storage and display a resume state. Clear the draft only after a successful save or an explicitly confirmed restart.
- Validation messages are linked with `aria-describedby`; invalid fields set `aria-invalid`.
- Charts have a text summary and a keyboard-reachable bounded data table. The SVG is supplementary, and reference levels are also described in text.
- Respect `prefers-reduced-motion` globally. State changes remain visible without relying on animation.

## Verification

For frontend changes, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in `web-app/`. Browser acceptance covers 320×568, 390×844, 768×1024, and 1280×800, including keyboard navigation, modal focus, destructive-action cancel/confirm, and page-level overflow.
