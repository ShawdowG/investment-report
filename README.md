# investment-report

## Current application

The maintained application is the account-free, local-first Next.js app in
`web-app/`. It builds to the static `web-app/out/` directory for Cloudflare
Pages. Market data is loaded from repository JSON at build time; personal
watchlists, portfolios, notes, strategies, theses, reviews, and research files
stay in the browser.

- Current app: `https://investment-report-app.pages.dev/`
- Cloudflare Pages project: `investment-report-app`

Use the Node version pinned in `.nvmrc` (Node 20.19.5). Install the locked app
dependencies, then run the complete quality gate from the repository root:

```bash
nvm use
npm --prefix web-app ci
npm run check
```

`npm run check` runs ESLint, TypeScript, unit tests, and the static production
build. The data settings page exports version 2 backups with every local
dataset and research-file bytes. It also accepts legacy
`investment-report-v1` backups without clearing newer datasets that v1 did not
contain.

To inspect the exact Cloudflare Pages artifact without a development HMR
connection, build it and start the static preview:

```bash
npm --prefix web-app run build
npm --prefix web-app run preview
```

Open `http://127.0.0.1:3000/`. The preview serves `web-app/out/`, so it is the
preferred path for browser acceptance and screenshots. Use `npm --prefix
web-app run dev` only while editing.

## Legacy report site

The sections below describe the historical report pipeline and are retained as
operational history. They are not the current application build instructions,
and the URLs below do not host the maintained app.

## Historical live site
- Full reports site: `https://investment-report.pages.dev/`
- Latest report permalink: `https://investment-report.pages.dev/today.html`

> Hosted on Cloudflare Pages.

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
