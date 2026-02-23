# investment-report

Daily market report archive for:
- EU/Nordic 09:30 (Oslo)
- US open +15m
- US pre-close (~1h before close)

## Stack (v2)
- Static site (plain HTML + CSS + small JS) for GitHub Pages
- Markdown reports with frontmatter metadata in `reports/daily/`
- Node scripts for scaffolding, validation, and index generation
- Client-side filter by date / ticker / slot
- Stable permalink: `today.html` (always points to latest report)

## Structure
- `reports/daily/YYYY-MM-DD-eu.md`
- `reports/daily/YYYY-MM-DD-us-open.md`
- `reports/daily/YYYY-MM-DD-pre-close.md`
- `data/search-index.json`
- `data/by-date/*.json`
- `data/by-ticker/*.json`
- `today.html`
- `index.html`

## Commands

```bash
# create report scaffold
node scripts/new-report.js 2026-02-24 eu

# validate metadata schema
node scripts/validate-reports.js

# rebuild index + filter data + today permalink
node scripts/build-index.js

# publish
git add .
git commit -m "Add daily report"
git push
```

## Report metadata schema (frontmatter)

```yaml
---
date: 2026-02-24
slot: eu
title: EU/Nordic Morning
regime: risk-off
summary: Soft open, defensives leading
tickers: [AAPL, NVDA, TSLA]
---
```

## GitHub Pages
1. Push repo to GitHub
2. Settings -> Pages
3. Source: Deploy from branch
4. Branch: `main` / root

Site URL pattern:
`https://<username>.github.io/investment-report/`
