#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const reportsDir = path.join(process.cwd(), 'reports', 'daily');
if (!fs.existsSync(reportsDir)) {
  console.log('No reports/daily directory yet.');
  process.exit(0);
}

const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md'));
const errors = [];

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const raw = content.slice(4, end).split('\n');
  const obj = {};
  for (const line of raw) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }
    obj[k] = v;
  }
  return obj;
}

for (const f of files) {
  const full = fs.readFileSync(path.join(reportsDir, f), 'utf8');
  const fm = parseFrontmatter(full);
  if (!fm) {
    errors.push(`${f}: missing frontmatter`);
    continue;
  }
  if (!fm.date || !/^\d{4}-\d{2}-\d{2}$/.test(fm.date)) errors.push(`${f}: invalid date`);
  if (!fm.slot || !['eu', 'us-open', 'pre-close'].includes(fm.slot)) errors.push(`${f}: invalid slot`);
  if (!fm.title) errors.push(`${f}: missing title`);
  if (!Array.isArray(fm.tickers)) errors.push(`${f}: tickers must be array`);
}

if (errors.length) {
  console.error('Validation failed:\n' + errors.map(e => `- ${e}`).join('\n'));
  process.exit(1);
}

console.log(`Validation passed for ${files.length} report(s).`);
