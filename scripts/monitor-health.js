#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const idxPath = path.join(root, 'data', 'search-index.json');
if (!fs.existsSync(idxPath)) {
  console.error('HEALTH_FAIL: search-index missing');
  process.exit(1);
}

const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
if (!Array.isArray(idx.items) || idx.items.length === 0) {
  console.error('HEALTH_FAIL: no indexed items');
  process.exit(1);
}

const latest = idx.items[0];
const latestDate = new Date(`${latest.date}T00:00:00Z`);
const now = new Date();
const ageDays = Math.floor((now - latestDate) / (1000 * 60 * 60 * 24));
if (ageDays > 3) {
  console.error(`HEALTH_FAIL: latest report stale (${ageDays} days)`);
  process.exit(1);
}

const required = [
  'scripts/parity-check.js',
  'scripts/post-cutover-verify.js',
  'web-next/src/pages/index.astro'
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`HEALTH_FAIL: missing ${rel}`);
    process.exit(1);
  }
}

console.log(`HEALTH_OK: latest=${latest.date}/${latest.slot}, ageDays=${ageDays}, items=${idx.items.length}`);
