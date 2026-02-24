#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.cwd();
const distDir = path.join(root, 'web-next', 'dist');
const srcDir = path.join(root, 'web-next', 'src');
const outDir = path.join(root, 'migration', 'visual-regression');
fs.mkdirSync(outDir, { recursive: true });

function sha(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const targets = fs.existsSync(path.join(distDir, 'index.html'))
  ? [{ key: 'dist/index.html', path: path.join(distDir, 'index.html') }]
  : [{ key: 'src/pages/index.astro', path: path.join(srcDir, 'pages', 'index.astro') }];

const snapshots = {};
for (const t of targets) {
  if (!fs.existsSync(t.path)) continue;
  const raw = fs.readFileSync(t.path, 'utf8');
  snapshots[t.key] = {
    bytes: Buffer.byteLength(raw, 'utf8'),
    hash: sha(raw),
    h1Count: (raw.match(/<h1/g) || []).length,
    tableCount: (raw.match(/<table/g) || []).length,
    listCount: (raw.match(/<ul/g) || []).length,
  };
}

const payload = {
  generatedAt: new Date().toISOString(),
  snapshots,
};

const latestPath = path.join(outDir, 'latest.json');
fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2));

const baselinePath = path.join(outDir, 'baseline.json');
if (!fs.existsSync(baselinePath)) {
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2));
}

console.log(`VISUAL_SNAPSHOT_OK: files=${Object.keys(snapshots).length}`);
