# Migration Requirements (Narrative + Tactical)

## M-05 — Required Narrative Fields (Alpha)

These fields are required per rendered report view (`eu`, `us-open`, `pre-close`):

1. `summary` (frontmatter, string)
   - One concise market-state statement.
2. `regime` (frontmatter, string)
   - Must classify session context (e.g., risk-on, mixed, risk-off).
3. `sections.alpha` (string[])
   - Minimum 3 bullets for strategic framing.
4. `sections.pulse` (string[])
   - At least 1 current pulse/breadth/liquidity note.
5. `Agent Discussion` block in markdown body
   - Must include agreement/disagreement/resolution.

Narrative acceptance:
- No placeholder text like “No Alpha discussion yet.” for same-day production report.
- Narrative must align with `movers` direction and index deltas.

## M-06 — Required Tactical Fields (Beta)

These fields are required per report:

1. `sections.beta` (string[])
   - Minimum 3 actionable bullets.
2. `movers[]` (array)
   - Required keys: `ticker`, `name`, `price`, `pct`, `change`.
3. `tickers` (frontmatter array)
   - Canonical universe used for tables and filters.
4. `sections.gamma` (string[])
   - Must include table header and at least one row.
5. `Unified Action Checklist` block in markdown body
   - At least 3 concrete checks/actions.

Tactical acceptance:
- Actions must include entry/risk framing (e.g., pullback vs chase, stop/size discipline).
- `pct` values must be numeric or null (no string percentages in JSON).
