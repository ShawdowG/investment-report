# investment-report

Daily market report archive for:
- EU/Nordic 09:30 (Oslo)
- US open +15m
- US pre-close (~1h before close)

## Stack
- Static site (plain HTML + CSS) for GitHub Pages
- Markdown files per report in `reports/daily/`
- Node scripts for index generation and report scaffolding

## Structure
- `reports/daily/YYYY-MM-DD-eu.md`
- `reports/daily/YYYY-MM-DD-us-open.md`
- `reports/daily/YYYY-MM-DD-pre-close.md`
- `reports/index.json`
- `index.html`

## Commands

```bash
# create a report scaffold
node scripts/new-report.js 2026-02-23 eu

# rebuild index from all report files
node scripts/build-index.js

# publish
git add .
git commit -m "Add report"
git push
```

## GitHub Pages
1. Push this repo to GitHub.
2. In GitHub: Settings -> Pages
3. Source: `Deploy from branch`
4. Branch: `main` / root

Site URL pattern:
`https://<username>.github.io/investment-report/`
