#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const reportsDir = path.join(ROOT, 'reports', 'daily');
const reportsHtmlDir = path.join(ROOT, 'reports', 'html');
const dataDir = path.join(ROOT, 'data');
const byDateDir = path.join(dataDir, 'by-date');
const byTickerDir = path.join(dataDir, 'by-ticker');

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(reportsHtmlDir, { recursive: true });
fs.mkdirSync(byDateDir, { recursive: true });
fs.mkdirSync(byTickerDir, { recursive: true });

function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

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

function renderMarkdownBasic(md) {
  const lines = md.split('\n');
  const out = [];
  let inUl = false;
  let inCode = false;
  const closeUl = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeUl();
      if (!inCode) {
        inCode = true;
        out.push('<pre><code>');
      } else {
        inCode = false;
        out.push('</code></pre>');
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    if (line.startsWith('### ')) {
      closeUl();
      out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeUl();
      out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeUl();
      out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inUl) {
        inUl = true;
        out.push('<ul>');
      }
      out.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeUl();
      out.push('');
      continue;
    }

    closeUl();
    out.push(`<p>${escapeHtml(line)}</p>`);
  }
  closeUl();
  return out.join('\n');
}

function extractSection(body, startLabel) {
  const lines = body.split('\n');
  const start = lines.findIndex(l => l.trim().startsWith(startLabel));
  if (start === -1) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('## ')) break;
    out.push(lines[i]);
  }
  return out;
}

function parseMovers(body, tickers = []) {
  const movers = [];
  const lines = body.split('\n');
  const re = /^\s*([A-Z0-9^.=\-]+)\s*\|\s*([0-9.,]+)\s*\|\s*([+-]?[0-9.,]+)%/;
  for (const l of lines) {
    const m = l.match(re);
    if (!m) continue;
    const ticker = m[1].trim();
    const price = m[2].trim();
    const pctRaw = m[3].replace(',', '.');
    const pct = Number(pctRaw);
    movers.push({ ticker, name: ticker, price, pct, change: '' });
  }
  if (movers.length) {
    return movers.sort((a, b) => Math.abs(b.pct || 0) - Math.abs(a.pct || 0)).slice(0, 10);
  }

  return (tickers || []).slice(0, 8).map(t => ({
    ticker: t,
    name: t,
    price: '—',
    pct: null,
    change: '—'
  }));
}

function compactSection(lines, fallback) {
  const clean = lines.map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith('('));
  return clean.length ? clean.slice(0, 5) : [fallback];
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
  const htmlFile = file.replace(/\.md$/, '.html');

  const gamma = compactSection(extractSection(body, '## 1) GAMMA'), 'No data section yet.');
  const alpha = compactSection(extractSection(body, '## 2) ALPHA'), 'No Alpha discussion yet.');
  const beta = compactSection(extractSection(body, '## 3) BETA'), 'No Beta discussion yet.');
  const pulse = compactSection(extractSection(body, '## 0) Executive TL;DR'), 'Awaiting pulse update.');
  const movers = parseMovers(body, tickers);

  const reportHtml = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} • ${escapeHtml(date)}</title>
<link rel="stylesheet" href="../../assets/style.css" />
</head><body>
  <div class="wrap">
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p class="muted">${escapeHtml(date)} • ${escapeHtml(slot)} ${regime ? '• ' + escapeHtml(regime) : ''}</p>
        </div>
        <span class="badge"><a href="../../index.html">← Back to dashboard</a></span>
      </div>
      <div class="chips">
        ${(tickers || []).slice(0, 12).map(t => `<a class="chip" href="../../index.html?ticker=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}
      </div>
    </section>

    <article class="card report-body">
      ${renderMarkdownBasic(body)}
    </article>
  </div>
</body></html>`;

  fs.writeFileSync(path.join(reportsHtmlDir, htmlFile), reportHtml);

  return { file, htmlFile, title, summary, date, slot, tickers, regime, sections: { gamma, alpha, beta, pulse }, movers };
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
for (const [d, arr] of Object.entries(byDate)) fs.writeFileSync(path.join(byDateDir, `${d}.json`), JSON.stringify(arr, null, 2));
for (const [t, arr] of Object.entries(byTicker)) {
  const safe = t.replace(/[^A-Z0-9^_.-]/g, '_');
  fs.writeFileSync(path.join(byTickerDir, `${safe}.json`), JSON.stringify(arr, null, 2));
}

const searchIndex = { generatedAt: new Date().toISOString(), count: items.length, items };
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports', 'index.json'), JSON.stringify(searchIndex, null, 2));
fs.writeFileSync(path.join(dataDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2));

const latest = items[0];
const allDates = [...new Set(items.map(i => i.date).filter(Boolean))].sort().reverse();
const allTickers = [...new Set(items.flatMap(i => i.tickers || []))].sort((a, b) => a.localeCompare(b));

const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Investment Reports Dashboard</title>
<link rel="stylesheet" href="assets/style.css" />
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1>Investment Dashboard</h1>
          <p class="muted">Today-first view with date replay • Gamma, Alpha, Beta</p>
        </div>
        <span class="badge">${items.length} reports indexed</span>
      </div>
      <div class="filters compact">
        <label>Date
          <select id="dateSelect"></select>
        </label>
        <label>Session
          <select id="slotFilter">
            <option value="">All</option>
            <option value="eu">EU</option>
            <option value="us-open">US Open</option>
            <option value="pre-close">Pre-close</option>
          </select>
        </label>
        <label>Ticker
          <input id="tickerFilter" type="text" placeholder="NVDA" />
        </label>
        <button id="clearFilters" type="button">Reset</button>
      </div>
      <div id="tickerChips" class="chips"></div>
    </section>

    <section class="grid">
      <article class="card col-12">
        <h2>Market Pulse</h2>
        <div id="pulseSummary" class="muted">Awaiting report selection...</div>
      </article>

      <article class="card col-12">
        <h2>Største bevegelser på listene dine <span id="resultsCount" class="muted"></span></h2>
        <div id="moversList" class="movers"></div>
      </article>

      <article class="card col-4">
        <h2>Summary</h2>
        <ul id="summaryList" class="list"></ul>
      </article>
      <article class="card col-4">
        <h2>Alpha discussion</h2>
        <ul id="alphaList" class="list"></ul>
      </article>
      <article class="card col-4">
        <h2>Beta discussion</h2>
        <ul id="betaList" class="list"></ul>
      </article>

      <article class="card col-12">
        <h2>Relevante finansnyheter (knyttet til dagens highlights)</h2>
        <div class="chips">
          <span class="chip">Hovedoppslag</span>
          <span class="chip">Koblet til movers</span>
          <span class="chip">Kilde-lenker</span>
        </div>
        <ul id="newsList" class="list"></ul>
      </article>

      <article class="card col-12">
        <h2>Report links</h2>
        <ul id="results" class="list"></ul>
      </article>
    </section>

    <p class="footer">Latest permalink: <a href="today.html">today.html</a> • Full report pages in <code>reports/html/</code></p>
  </div>
  <script>window.__DATES__=${JSON.stringify(allDates)};window.__TICKERS__=${JSON.stringify(allTickers)};window.__LATEST__=${JSON.stringify(latest || null)};</script>
  <script src="assets/app.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html);

const todayHtml = latest
  ? `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=reports/html/${latest.htmlFile}"><title>Latest Report</title><p>Redirecting to <a href="reports/html/${latest.htmlFile}">${latest.htmlFile}</a>...</p>`
  : '<!doctype html><meta charset="utf-8"><title>Latest Report</title><p>No reports yet.</p>';
fs.writeFileSync(path.join(ROOT, 'today.html'), todayHtml);

console.log(`Index built with ${items.length} report(s).`);
