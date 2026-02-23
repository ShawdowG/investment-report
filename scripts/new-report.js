#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const [date, slot='eu'] = process.argv.slice(2);
if (!date) {
  console.error('Usage: node scripts/new-report.js YYYY-MM-DD [eu|us-open|pre-close]');
  process.exit(1);
}
const dir = path.join(process.cwd(), 'reports', 'daily');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${date}-${slot}.md`);
if (fs.existsSync(file)) {
  console.log(file);
  process.exit(0);
}
const titleMap = { eu:'EU/Nordic Morning', 'us-open':'US Open +15m', 'pre-close':'US Pre-close' };
const title = titleMap[slot] || slot;
const content = `# ${title} — ${date}

- **Regime:** 
- **Main driver:** 
- **Posture:** 

## 1) GAMMA — Data Pack
(Insert full ticker table)

## 2) ALPHA — Strategic View

## 3) BETA — Tactical View

## 4) Agent Discussion

## 5) Unified Action Checklist

## 6) Source & Verification Notes
- Missing fields and verification needs:
`;
fs.writeFileSync(file, content);
console.log(file);
