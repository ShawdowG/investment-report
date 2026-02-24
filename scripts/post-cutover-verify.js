#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();
const distIndex = path.join(root, 'web-next', 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
  console.error('POST_CUTOVER_FAIL: web-next/dist/index.html missing');
  process.exit(1);
}

execSync('node scripts/parity-check.js', { stdio: 'inherit' });

const idx = JSON.parse(fs.readFileSync(path.join(root, 'data', 'search-index.json'), 'utf8'));
if (!idx.items?.length) {
  console.error('POST_CUTOVER_FAIL: search-index empty');
  process.exit(1);
}

console.log(`POST_CUTOVER_OK: dist present; parity OK; indexed=${idx.items.length}`);
