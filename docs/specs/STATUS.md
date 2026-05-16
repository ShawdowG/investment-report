# v3 / v4 Spec Status Board

Oppdater denne filen hver gang en spec startes, blokkeres eller ferdigstilles.

| Spec | Scope | Owner | Status | Blocked by | PR / Commit | Last update |
|---|---|---|---|---|---|---|
| SPEC-001 | Shell + navigation (6-route IA contract honored 2026-05-09 audit) | codex-agent → claude-code | ✅ done | - | 5d6552d | 2026-05-09 |
| SPEC-002 | Static report indexes — structured payload (sunset under SPEC-022) | claude-code | ✅ done | - | abd102c | 2026-05-09 |
| SPEC-003 | Dashboard v3 cards + compare latest/previous | codex-agent | ⛔ obsolete (SPEC-022 sunset) | - | n/a | 2026-05-10 |
| SPEC-004 | Watchlist local store (CRUD on `/watchlist`, localStorage key `watchlist_items`) | claude-code | ✅ done | - | 8479a92 | 2026-05-10 |
| SPEC-005 | Paste/import ticker parser + preview (inline import section on `/watchlist`) | claude-code | ✅ done | - | cd188b8 | 2026-05-10 |
| SPEC-006 | Watchlist impact card on dashboard (later swapped to quote-driven under SPEC-022) | claude-code | ✅ done | - | cd188b8 | 2026-05-10 |
| SPEC-007 | Ticker detail page + symbol search (later folded into SPEC-015 chart page) | claude-code | ✅ done | - | 39c8472 | 2026-05-10 |
| SPEC-008 | Portfolio local store (later P&L upgraded to real prices under SPEC-018) | claude-code | ✅ done | - | 5697971 | 2026-05-10 |
| SPEC-009 | Notes/journal local-first (Personal Notes widget on `/ticker/[symbol]`) | claude-code | ✅ done | - | 52693e9 | 2026-05-10 |
| SPEC-010 | News adapter abstraction (sunset under SPEC-022 along with reports) | claude-code | ⛔ obsolete | - | f0ce28d | 2026-05-10 |
| SPEC-011 | Stitch design integration (tokens + primitives + layout shell + dashboard re-skin + mobile drawer) | claude-code | ✅ done | - | step 1-4 + drawer shipped | 2026-05-10 |
| SPEC-012 | Supabase-ready schema draft (DDL + RLS + sync plan, no runtime dep) | claude-code | ✅ done | - | pending commit | 2026-05-15 |
| SPEC-013 | Watchlist storage shape extension (status / priority / tags fields) | claude-code | ✅ done | - | 84306d9 | 2026-05-10 |
| SPEC-014 | Daily quote pipeline (`scripts/fetch-quotes.py` + `data/quotes/SYMBOL.json` shape) — v4 cockpit foundation | claude-code | ✅ done | - | 526955b | 2026-05-10 |
| SPEC-015 | Ticker detail with Recharts price chart + quote summary on `/ticker/[symbol]` | claude-code | ✅ done | - | 1aa4b09 | 2026-05-10 |
| SPEC-016 | Repository abstraction — typed contracts + conformance assertions for the 3 stores | claude-code | ✅ done | - | 5b4008b | 2026-05-10 |
| SPEC-017 | Watchlist with quote-driven Last Px + Day Δ columns (also fixes SPEC-013 watchlist-table that never landed) | claude-code | ✅ done | - | 814fe17 | 2026-05-10 |
| SPEC-018 | Portfolio real P&L (replaces avg-price proxy with last-close from quote snapshots) | claude-code | ✅ done | - | 4f905f3 | 2026-05-10 |
| SPEC-019 | Research dispatches — `/research` route + localStorage CRUD + sidebar nav rename | claude-code | ✅ done | - | 5a5bc1c | 2026-05-10 |
| SPEC-020 | Strategy definition + multi-ticker backtest engine + `/strategies` route (4 strategy types, equity curve viz) | claude-code | ✅ done | - | b041aeb | 2026-05-10 |
| SPEC-021 | Mobile-first IA — bottom-nav pattern below md, MobileDrawer retired | claude-code | ✅ done | - | 4f10034 | 2026-05-10 |
| SPEC-022 | Sunset reports — drop report pipeline + scripts + dead components, rebuild dashboard with quote-driven cards | claude-code | ✅ done | - | 21595c2 | 2026-05-10 |
| SPEC-023 | Thesis system — structured stock research + trade-plan zones + quarterly review (per `docs/research-framework.md`) + Notes | claude-code | ✅ done | - | 9b49341..0344970 | 2026-05-16 |
| SPEC-025 | ChatGPT response import — heuristic parser folds LLM markdown back into structured thesis fields with diff preview | claude-code | ✅ done | - | 8f161df..37186a6 | 2026-05-16 |
| SPEC-026 | Thesis monitoring loop — light trajectory chart + TopBar alert badge + crossed-zone `lastCrossedAt` + browser notifications opt-in | claude-code | ✅ done | - | 35a3886..2016418 | 2026-05-16 |
| SPEC-027 | Research workspace files — IndexedDB-backed PDF/image attachments per thesis, drag-drop, inline preview | claude-code | ✅ done | - | 1ac71a9..a75f2b2 | 2026-05-16 |
| SPEC-028 | Thesis guided wizard — 9-step framework walk-through alongside Quick + Deep modes | claude-code | ✅ done | - | 8e8f3e8..dfbfd9d | 2026-05-17 |
| SPEC-029 | Research helpers — build-time company info enrichment + helpers panel + 9 external source links | claude-code | ✅ done | - | 726292c..d995084 | 2026-05-17 |
| SPEC-030 | Stock Overview card on thesis page (Yahoo-style: multi-range chart + key-stats grid + news + description) | unassigned | ⬜ todo | SPEC-029 | - | 2026-05-17 |
| SPEC-031 | Thesis auto-suggest from data (pipeline expansion + diff-preview panel) | unassigned | ⬜ todo | SPEC-029 | - | 2026-05-17 |

## Status Legend
- ⬜ todo
- 🟡 in_progress
- ⛔ blocked / obsolete
- ✅ done
