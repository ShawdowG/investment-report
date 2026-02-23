#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const reportsDir = path.join(ROOT, 'reports', 'daily');
const dataDir = path.join(ROOT, 'data');
const byDateDir = path.join(dataDir, 'by-date');
const byTickerDir = path.join(dataDir, 'by-ticker');
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(byDateDir, { recursive: true });
fs.mkdirSync(byTickerDir, { recursive: true });

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return { meta: {}, body: content };
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { meta: {}, body: content };
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
  const body = content.slice(end + 5);
  return { meta: obj, body };
}

const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md')).sort().reverse();
const items = files.map(file => {
  const full = fs.readFileSync(path.join(reportsDir, file), 'utf8');
  const { meta, body } = parseFrontmatter(full);
  const lines = body.split('\n');
  const title = meta.title || (lines.find(l => l.startsWith('# ')) || '# Daily Report').slice(2).trim();
  const summary = meta.summary || (lines.find(l => l.startsWith('- **Main driver:**')) || '').replace('- **Main driver:**', '').trim();
  const date = meta.date || (file.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '');
  const slot = meta.slot || (file.includes('us-open') ? 'us-open' : file.includes('pre-close') ? 'pre-close' : 'eu');
  const tickers = Array.isArray(meta.tickers) ? meta.tickers : [];
  const regime = meta.regime || (lines.find(l => l.startsWith('- **Regime:**')) || '').replace('- **Regime:**', '').trim();
  return { file, title, summary, date, slot, tickers, regime };
});

const byDate = {};
const byTicker = {};
for (const i of items) {
  if (!byDate[i.date]) byDate[i.date] = [];
  byDate[i.date].push(i);
  for (const t of i.tickers) {
    const tk = t.toUpperCase();
    if (!byTicker[tk]) byTicker[tk] = [];
    byTicker[tk].push(i);
  }
}

for (const [d, arr] of Object.entries(byDate)) {
  fs.writeFileSync(path.join(byDateDir, `${d}.json`), JSON.stringify(arr, null, 2));
}
for (const [t, arr] of Object.entries(byTicker)) {
  const safe = t.replace(/[^A-Z0-9^_.-]/g, '_');
  fs.writeFileSync(path.join(byTickerDir, `${safe}.json`), JSON.stringify(arr, null, 2));
}

const searchIndex = {
  generatedAt: new Date().toISOString(),
  count: items.length,
  items,
};
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports', 'index.json'), JSON.stringify(searchIndex, null, 2));
fs.writeFileSync(path.join(dataDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2));

const latest = items[0];
const uniqueDates = new Set(items.map(i => i.date).filter(Boolean)).size;
const recent = items.slice(0, 30)
  .map(i => `<li><a href="reports/daily/${i.file}">${i.date} • ${i.slot} • ${i.title}</a>${i.regime ? ` <span class="muted">(${i.regime})</span>` : ''}</li>`)
  .join('\n');

const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Investment Reports</title>
<link rel="stylesheet" href="assets/style.css" />
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1>Investment Reports</h1>
          <p class="muted">Daily market archive • Gamma → Alpha → Beta</p>
        </div>
        <span class="badge">Live index: ${items.length} reports</span>
      </div>
      <div class="chips">
        <span class="chip">EU/Nordic 09:30</span>
        <span class="chip">US Open +15m</span>
        <span class="chip">US Pre-close</span>
      </div>
    </section>

    <section class="grid">
      <article class="card col-8">
        <h2>Browse & Filter <span id="resultsCount" class="muted"></span></h2>
        <div class="filters">
          <label>Date <input id="dateFilter" type="date" /></label>
          <label>Ticker <input id="tickerFilter" type="text" placeholder="e.g. NVDA" /></label>
          <label>Slot
            <select id="slotFilter">
              <option value="">All</option>
              <option value="eu">EU</option>
              <option value="us-open">US Open</option>
              <option value="pre-close">Pre-close</option>
            </select>
          </label>
          <button id="clearFilters">Clear</button>
        </div>
        <ul id="results" class="list"></ul>
      </article>

      <aside class="card col-4">
        <h2>Latest</h2>
        ${latest ? `<p><a href="reports/daily/${latest.file}">${latest.date} • ${latest.slot} • ${latest.title}</a></p>` : '<p class="muted">No reports yet.</p>'}
        <p><a href="today.html">Open stable latest permalink</a></p>
        <div class="stats">
          <div class="stat"><span class="muted">Reports</span><b>${items.length}</b></div>
          <div class="stat"><span class="muted">Days covered</span><b>${uniqueDates}</b></div>
          <div class="stat"><span class="muted">Updated</span><b>${new Date().toISOString().slice(0,10)}</b></div>
        </div>
      </aside>

      <article class="card col-12">
        <h2>Recent Reports</h2>
        <ul class="list">${recent || '<li class="muted">No reports yet.</li>'}</ul>
      </article>
    </section>

    <p class="footer">Built from markdown files in <code>reports/daily/</code>. Filter by date, ticker, or slot.</p>
  </div>
  <script src="assets/app.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html);

const todayHtml = latest
  ? `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=reports/daily/${latest.file}"><title>Latest Report</title><p>Redirecting to <a href="reports/daily/${latest.file}">${latest.file}</a>...</p>`
  : '<!doctype html><meta charset="utf-8"><title>Latest Report</title><p>No reports yet.</p>';
fs.writeFileSync(path.join(ROOT, 'today.html'), todayHtml);

console.log(`Index built with ${items.length} report(s).`);
