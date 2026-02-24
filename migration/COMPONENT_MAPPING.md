# M-07 Field-to-Component Mapping Matrix

| Data field | Source | Component (Astro) | Required | Notes |
|---|---|---|---|---|
| `date`, `slot`, `title` | frontmatter | `HeaderBar` | Yes | Drives report identity + range state |
| `summary` | frontmatter | `MarketPulse` | Yes | Primary narrative sentence |
| `regime` | frontmatter | `MarketPulse` | Yes | Regime badge/tag |
| `sections.gamma` | JSON/index item | `TickerTable` | Yes | Parsed into table rows |
| `movers[]` | JSON/index item | `NewsMoversTable` | Yes | Sortable mover rows |
| `sections.alpha[]` | JSON/index item | `DiscussionPanel` | Yes | Strategic bullets |
| `sections.beta[]` | JSON/index item | `DiscussionPanel` | Yes | Tactical bullets |
| `sections.pulse[]` | JSON/index item | `MarketPulse` | Yes | Pulse callouts |
| `tickers[]` | frontmatter/index item | `TickerTable` filters | Yes | Universe scope |
| `news[]` (optional) | JSON/index item | `NewsMoversTable` | No | Enables catalyst/news links |

Implementation notes:
- Adapter layer should normalize `GC_F`/`GC=F` and proxy symbols before render.
- Missing optional `news[]` must not break rendering; component should degrade gracefully.
