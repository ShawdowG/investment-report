#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const reportDaily = path.join(root, 'reports', 'daily');
const reportHtml = path.join(root, 'reports', 'html');
const searchIndexPath = path.join(root, 'data', 'search-index.json');

function fail(msg) {
  console.error(`PARITY_FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(searchIndexPath)) fail('data/search-index.json missing');
const idx = JSON.parse(fs.readFileSync(searchIndexPath, 'utf8'));
if (!Array.isArray(idx.items)) fail('search-index items missing');

const mdFiles = fs.readdirSync(reportDaily).filter((f) => f.endsWith('.md'));
const htmlFiles = fs.readdirSync(reportHtml).filter((f) => f.endsWith('.html'));

if (idx.items.length !== mdFiles.length) {
  fail(`search-index item count ${idx.items.length} != markdown count ${mdFiles.length}`);
}

for (const item of idx.items) {
  if (!item.file || !item.htmlFile || !item.date || !item.slot) {
    fail(`invalid item metadata for ${item.file || '<unknown>'}`);
  }
  const mdPath = path.join(reportDaily, item.file);
  const htmlPath = path.join(reportHtml, item.htmlFile);
  if (!fs.existsSync(mdPath)) fail(`missing markdown ${item.file}`);
  if (!fs.existsSync(htmlPath)) fail(`missing html ${item.htmlFile}`);

  const md = fs.readFileSync(mdPath, 'utf8');
  if (!md.includes(`slot: ${item.slot}`)) fail(`slot mismatch in ${item.file}`);
  if (!md.includes(`date: ${item.date}`)) fail(`date mismatch in ${item.file}`);

  if (!item.sections || !Array.isArray(item.sections.alpha) || !Array.isArray(item.sections.beta)) {
    fail(`sections missing in ${item.file}`);
  }
  if (!Array.isArray(item.movers)) fail(`movers missing in ${item.file}`);
}

const requiredWebNext = [
  'web-next/src/components/HeaderBar.astro',
  'web-next/src/components/TimeRangePicker.astro',
  'web-next/src/components/MarketPulse.astro',
  'web-next/src/components/TickerTable.astro',
  'web-next/src/components/DiscussionPanel.astro',
  'web-next/src/components/NewsMoversTable.astro',
  'web-next/src/lib/adapters.js',
  'web-next/src/lib/loaders.js',
];
for (const rel of requiredWebNext) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing migration artifact: ${rel}`);
}

console.log(`PARITY_OK: items=${idx.items.length}, md=${mdFiles.length}, html=${htmlFiles.length}`);
