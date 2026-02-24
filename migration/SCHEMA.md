# Investment Report Migration Schema v1

This schema defines the minimum contract for migration inputs used by the next web stack.

## 1) `data/search-index.json`

Top-level object:

- `generatedAt` (string, ISO datetime)
- `count` (number)
- `items` (array of `SearchIndexItem`)

`SearchIndexItem` required fields:

- `file` (string, `YYYY-MM-DD-{eu|us-open|pre-close}.md`)
- `htmlFile` (string, matching `.html` variant)
- `title` (string, non-empty)
- `summary` (string)
- `date` (string, `YYYY-MM-DD`)
- `slot` (`eu` | `us-open` | `pre-close`)
- `tickers` (string[])
- `regime` (string; may be empty)
- `sections` (object)
  - `gamma` (string[])
  - `alpha` (string[])
  - `beta` (string[])
  - `pulse` (string[])
- `movers` (array of `MoverRow`)

`MoverRow` required fields:

- `ticker` (string)
- `name` (string)
- `price` (string)
- `pct` (number or `null`)
- `change` (string)

Optional (for migration parity with future renderer):

- `news` (array of `NewsRow`)

`NewsRow`:

- `headline` (string, required)
- `ticker` (string, optional)
- `source` (string, optional)
- `url` (string URL, optional)
- `publishedAt` (string ISO datetime, optional)

## 2) `data/by-date/*.json`

Each file is an array of `SearchIndexItem` objects. Every item must satisfy the same shape above.

## 3) Report frontmatter (`reports/daily/*.md`)

Required frontmatter keys:

- `date` (`YYYY-MM-DD`)
- `slot` (`eu` | `us-open` | `pre-close`)
- `title` (string, non-empty)
- `summary` (string)
- `tickers` (array literal)

Optional frontmatter keys:

- `regime` (string)

## 4) Consistency rules

- `search-index.count === search-index.items.length`
- `date` + `slot` pair should match filename convention.
- `htmlFile` should be derived from `file` by swapping `.md` to `.html`.
- `movers` and `sections` must always exist (can be empty arrays where applicable).
