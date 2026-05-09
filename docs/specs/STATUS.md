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
| SPEC-007 | Ticker detail page + search | unassigned | ⬜ todo | SPEC-002 | - | - |
| SPEC-008 | Portfolio local store + dashboard impact | unassigned | ⬜ todo | SPEC-004 + SPEC-006 | - | - |
| SPEC-009 | Notes/journal local-first | unassigned | ⬜ todo | SPEC-007 | - | - |
| SPEC-010 | News source abstraction/scoring | unassigned | ⬜ todo | none | - | - |
| SPEC-011 | Stitch design integration (tokens + primitives + layout shell + per-route features) | claude-code | 🟡 in_progress | none | step 1+2 done; comp primitives + per-route features pending | 2026-05-10 |
| SPEC-012 | Supabase-ready schema draft | unassigned | ⬜ todo | none | - | - |

## Status Legend
- ⬜ todo
- 🟡 in_progress
- ⛔ blocked
- ✅ done
