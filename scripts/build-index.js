#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const reportsDir = path.join(ROOT, 'reports', 'daily');
fs.mkdirSync(reportsDir, { recursive: true });

const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md')).sort().reverse();
const items = files.map(file => {
  const full = fs.readFileSync(path.join(reportsDir, file), 'utf8');
  const lines = full.split('\n');
  const title = (lines.find(l => l.startsWith('# ')) || '# Daily Report').slice(2).trim();
  const summary = (lines.find(l => l.startsWith('- **Regime:**')) || '').replace('- **Regime:**','').trim();
  const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
  return { file, title, summary, date: dateMatch?.[1] || '' };
});

fs.writeFileSync(path.join(ROOT, 'reports', 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items }, null, 2));

const latest = items[0];
const list = items.slice(0, 30).map(i => `<li><a href="reports/daily/${i.file}">${i.date} — ${i.title}</a>${i.summary ? ` <span class="muted">(${i.summary})</span>`:''}</li>`).join('\n');

const html = `<!doctype html>
<html><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Investment Reports</title>
<link rel="stylesheet" href="assets/style.css" />
</head><body><div class="wrap">
<h1>Investment Reports</h1>
<p class="muted">Full daily archive (Gamma → Alpha → Beta)</p>
<div class="card">
<h2>Latest Report</h2>
${latest ? `<a href="reports/daily/${latest.file}">${latest.date} — ${latest.title}</a>` : '<span class="muted">No reports yet.</span>'}
</div>
<div class="card"><h2>Recent Reports</h2><ul>${list || '<li class="muted">No reports yet.</li>'}</ul></div>
<div class="card"><h2>Publishing Flow</h2><ul>
<li>Generate full report markdown in <code>reports/daily/</code></li>
<li>Run <code>node scripts/build-index.js</code></li>
<li>Commit + push to GitHub (Pages serves latest)</li>
</ul></div>
</div></body></html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log(`Index built with ${items.length} report(s).`);
