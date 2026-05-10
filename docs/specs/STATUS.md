# v3 Spec Status Board

Oppdater denne filen hver gang en spec startes, blokkeres eller ferdigstilles.

| Spec | Scope | Owner | Status | Blocked by | PR / Commit | Last update |
|---|---|---|---|---|---|---|
| SPEC-001 | Shell + navigation (6-route IA contract honored 2026-05-09 audit) | codex-agent → claude-code | ✅ done | - | 982ecc7, see next | 2026-05-09 |
| SPEC-002 | Static report indexes — structured payload (mainDriver, posture, discussion, catalysts, checklist) | claude-code | ✅ done | - | 99f6eea, abd102c | 2026-05-09 |
| SPEC-003 | Dashboard v3 cards + compare latest/previous | codex-agent | 🟡 in_progress | none |  | 2026-05-07 |
| SPEC-004 | Watchlist local store (CRUD on `/watchlist`, localStorage key `watchlist_items`) | claude-code | ✅ done | - | 8479a92 | 2026-05-10 |
| SPEC-005 | Paste/import ticker parser + preview (inline import section on `/watchlist`) | claude-code | ✅ done | - | cd188b8 | 2026-05-10 |
| SPEC-006 | Watchlist impact vs latest report (high/medium/missing buckets on dashboard) | claude-code | ✅ done | - | cd188b8 | 2026-05-10 |
| SPEC-007 | Ticker detail page + symbol search (`/ticker/[symbol]`, /tickers grid, TopBar search wiring) | claude-code | ✅ done | - | _pending commit_ | 2026-05-10 |
| SPEC-008 | Portfolio local store (`localStorage["portfolio_positions"]`) + dashboard impact card | claude-code | ✅ done | - | 5697971 | 2026-05-10 |
| SPEC-016 | Repository abstraction — typed contracts + conformance assertions for the 3 stores | claude-code | ✅ done | - | _pending commit_ | 2026-05-10 |
| SPEC-018 | Portfolio real P&L (replaces avg-price proxy with last-close from quote snapshots) | claude-code | ✅ done | - | 4f905f3 | 2026-05-10 |
| SPEC-009 | Notes/journal local-first (Personal Notes widget on `/ticker/[symbol]`) | claude-code | ✅ done | - | _pending commit_ | 2026-05-10 |
| SPEC-010 | News adapter abstraction + confidence scoring (CatalystAdapter wraps `latest.json#catalysts`; LatestIntelligenceCard on `/ticker/[symbol]`) | claude-code | ✅ done | - | _pending commit_ | 2026-05-10 |
| SPEC-011 | Stitch design integration (tokens + primitives + layout shell + dashboard re-skin + mobile drawer + watchlist re-skin via SPEC-013) | claude-code | ✅ done | - | step 1-4 + drawer shipped | 2026-05-10 |
| SPEC-012 | Supabase-ready schema draft | unassigned | ⬜ todo | none | - | - |
| SPEC-013 | Watchlist storage shape extension (status / priority / tags fields) — Brief Task 4.3 | claude-code | ✅ done | - | 84306d9 | 2026-05-10 |
| SPEC-014 | Daily quote pipeline (`scripts/fetch-quotes.py` + `data/quotes/SYMBOL.json` shape) — v4 cockpit foundation | claude-code | ✅ done | - | 526955b | 2026-05-10 |
| SPEC-022 | Sunset reports — drop report pipeline + scripts + dead components, rebuild dashboard with quote-driven cards | claude-code | ✅ done | - | _pending commit_ | 2026-05-10 |
| SPEC-015 | Ticker detail with Recharts price chart + quote summary on `/ticker/[symbol]` | claude-code | ✅ done | - | 1aa4b09 | 2026-05-10 |
| SPEC-017 | Watchlist with quote-driven Last Px + Day Δ columns (also fixes SPEC-013 watchlist-table that never landed) | claude-code | ✅ done | - | _pending commit_ | 2026-05-10 |

## Status Legend
- ⬜ todo
- 🟡 in_progress
- ⛔ blocked
- ✅ done
