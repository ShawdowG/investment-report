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

function formatInline(txt) {
  const escaped = escapeHtml(txt);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function isTableDivider(line = '') {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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

    if (line.includes('|') && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      closeUl();
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean);
      const alignCells = lines[i + 1].split('|').map(c => c.trim()).filter(Boolean);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() && !lines[i].trim().startsWith('## ')) {
        bodyRows.push(lines[i]);
        i++;
      }
      i -= 1;

      const alignFor = (idx) => {
        const raw = alignCells[idx] || '';
        if (raw.startsWith(':') && raw.endsWith(':')) return 'center';
        if (raw.endsWith(':')) return 'right';
        return 'left';
      };

      out.push('<div class="table-wrap"><table class="report-table"><thead><tr>');
      out.push(headerCells.map((cell, idx) => `<th style="text-align:${alignFor(idx)}">${formatInline(cell)}</th>`).join(''));
      out.push('</tr></thead><tbody>');
      for (const row of bodyRows) {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        out.push('<tr>');
        out.push(cells.map((cell, idx) => `<td style="text-align:${alignFor(idx)}">${formatInline(cell)}</td>`).join(''));
        out.push('</tr>');
      }
      out.push('</tbody></table></div>');
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
      out.push(`<li>${formatInline(line.slice(2))}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeUl();
      out.push('');
      continue;
    }

    closeUl();
    out.push(`<p>${formatInline(line)}</p>`);
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

function removeSection(body, startLabel) {
  const lines = body.split('\n');
  const start = lines.findIndex(l => l.trim().startsWith(startLabel));
  if (start === -1) return body;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('## ')) {
      end = i;
      break;
    }
  }
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function classifyMove(pct) {
  if (typeof pct !== 'number') return { tone: '', arrow: '•', pctText: '—' };
  if (pct > 0) return { tone: 'pos', arrow: '↑', pctText: `+${pct.toFixed(2)}%` };
  if (pct < 0) return { tone: 'neg', arrow: '↓', pctText: `${pct.toFixed(2)}%` };
  return { tone: 'flat', arrow: '→', pctText: '+0.00%' };
}

function parseMovers(body, tickers = []) {
  const movers = [];
  const lines = body.split('\n');
  // Match 4-column (Ticker | Price | Δ$ | Δ%) or 3-column (Ticker | Price | Δ%) tables
  const re4 = /^\s*([A-Z0-9^.=-]+)\s*\|\s*([0-9.,]+)\s*\|\s*([+-]?[0-9.,]+)\s*\|\s*([+-]?[0-9.,]+)%/;
  const re3 = /^\s*([A-Z0-9^.=-]+)\s*\|\s*([0-9.,]+)\s*\|\s*([+-]?[0-9.,]+)%/;
  for (const l of lines) {
    const m4 = l.match(re4);
    if (m4) {
      const ticker = m4[1].trim();
      const price = m4[2].trim();
      const changeAbs = Number(m4[3].replace(',', '.'));
      const pct = Number(m4[4].replace(',', '.'));
      const changeValue = Number.isFinite(changeAbs) ? changeAbs : null;
      const change = changeValue === null ? '—' : `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}`;
      movers.push({ ticker, name: ticker, price, pct, change, changeValue, changeAbs: changeValue });
      continue;
    }
    const m3 = l.match(re3);
    if (m3) {
      const ticker = m3[1].trim();
      const price = m3[2].trim();
      const pctRaw = m3[3].replace(',', '.');
      const pct = Number(pctRaw);
      const closeNum = Number(price.replace(',', '.'));
      const prevClose = Number.isFinite(closeNum) && Number.isFinite(pct) && (1 + pct / 100) !== 0
        ? closeNum / (1 + pct / 100)
        : null;
      const changeValue = Number.isFinite(prevClose) ? closeNum - prevClose : null;
      const change = changeValue === null ? '—' : `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}`;
      movers.push({ ticker, name: ticker, price, pct, change, changeValue, changeAbs: changeValue });
    }
  }

  const byTicker = new Map(movers.map(m => [m.ticker, m]));
  for (const t of (tickers || [])) {
    if (!byTicker.has(t)) {
      byTicker.set(t, { ticker: t, name: t, price: '—', pct: null, change: '—', changeValue: null, changeAbs: null });
    }
  }

  return [...byTicker.values()];
}

function compactSection(lines, fallback) {
  const clean = lines.map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith('('));
  return clean.length ? clean.slice(0, 5) : [fallback];
}

const NAME_MAP = {
  'BTC-USD':'Bitcoin', 'GC=F':'Gold', '^GSPC':'S&P 500', '^NDQ':'Nasdaq 100',
  'AAPL':'Apple', 'TSLA':'Tesla', 'GOOG':'Alphabet', 'NVDA':'NVIDIA', 'AMZN':'Amazon', 'MSFT':'Microsoft', 'META':'Meta',
  'DUOL':'Duolingo', 'ADBE.VI':'Adobe', 'AMD':'AMD', 'BABA':'Alibaba', 'LMT':'Lockheed Martin', 'BA':'Boeing',
  'TM':'Toyota', 'V':'Visa', 'MA':'Mastercard', 'NFLX':'Netflix', 'RDDT':'Reddit', 'NOVO-B.CO':'Novo Nordisk'
};

function renderReportMovers(movers = []) {
  if (!movers.length) return '<div class="muted">No ticker data in this report.</div>';
  const rows = [...movers].sort((a, b) => Math.abs((b.pct ?? -999)) - Math.abs((a.pct ?? -999)));
  return rows.map(m => {
    const { tone, arrow, pctText } = classifyMove(m.pct);
    const name = NAME_MAP[m.ticker] || m.name || m.ticker || 'Unknown';
    return `<div class="mover-row">
      <div class="ticker-badge">${escapeHtml(m.ticker || '—')}</div>
      <div class="mover-name">${escapeHtml(name)}</div>
      <div class="mover-price">${escapeHtml(String(m.price || '—'))}</div>
      <div class="mover-change ${tone}">${escapeHtml(String(m.change || '—'))}</div>
      <div class="mover-pill ${tone}">${arrow} ${pctText}</div>
    </div>`;
  }).join('');
}

function renderGammaSignalPanel(movers = []) {
  const rows = [...movers].filter(m => typeof m.pct === 'number');
  if (!rows.length) return '<p class="muted">No gamma signal rows parsed for this report.</p>';

  const topUps = rows.slice().sort((a, b) => b.pct - a.pct).slice(0, 3);
  const topDowns = rows.slice().sort((a, b) => a.pct - b.pct).slice(0, 3);
  const positive = rows.filter(r => r.pct > 0).length;
  const negative = rows.filter(r => r.pct < 0).length;
  const flat = rows.length - positive - negative;

  const renderList = (list) => list.map(r => `<li><strong>${escapeHtml(r.ticker)}</strong> <span class="muted">${r.pct > 0 ? '+' : ''}${r.pct.toFixed(2)}%</span></li>`).join('');

  return `<div class="signal-grid">
    <article class="signal-box">
      <h3>Leaders</h3>
      <ul>${renderList(topUps)}</ul>
    </article>
    <article class="signal-box">
      <h3>Laggards</h3>
      <ul>${renderList(topDowns)}</ul>
    </article>
    <article class="signal-box">
      <h3>Breadth</h3>
      <ul>
        <li><strong>${positive}</strong> positive</li>
        <li><strong>${negative}</strong> negative</li>
        <li><strong>${flat}</strong> flat</li>
      </ul>
    </article>
  </div>`;
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
  const reportBody = removeSection(body, '## 1) GAMMA');

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

    <article class="card">
      <h2>Gamma signal panel</h2>
      ${renderGammaSignalPanel(movers)}
    </article>

    <article class="card">
      <h2>Ticker overview (from this report)</h2>
      <div class="mover-row mover-header">
        <div>Ticker</div><div>Name</div><div>Price</div><div>Δ$</div><div>Move</div>
      </div>
      <div class="movers">
        ${renderReportMovers(movers)}
      </div>
    </article>

    <article class="card report-body">
      ${renderMarkdownBasic(reportBody)}
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
    <nav class="topnav">
      <a class="nav-brand" href="index.html">Investment Report</a>
      <div class="nav-links">
        <a class="nav-link active" href="index.html">Main</a>
        <a class="nav-link" href="tracker.html">Tracker</a>
        <a class="nav-link" href="reports.html">Reports / Analysis</a>
      </div>
    </nav>
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1>Investment Dashboard</h1>
          <p id="headerContext" class="muted">Showing: Today • All sessions • All tickers</p>
        </div>
        <div class="time-presets">
          <button id="rangeToday" class="time-btn" type="button">Today</button>
          <button id="rangeYesterday" class="time-btn" type="button">Yesterday</button>
          <button id="range7" class="time-btn" type="button">Last 7 days</button>
          <button id="range30" class="time-btn" type="button">Last 30 days</button>
          <label class="pick-date-label">Pick date
            <input id="headerDate" type="date" />
          </label>
        </div>
      </div>
      <span class="badge">${items.length} reports indexed</span>
    </section>

    <section class="grid">
      <article class="card col-12">
        <h2>📈 Market Pulse</h2>
        <div id="pulseCards" class="pulse-cards"></div>
        <ul id="pulseSummary" class="list"></ul>
      </article>

      <article class="card col-12">
        <details class="section-toggle" open>
          <summary>
            <h2>Tickeroversikt (pris og bevegelse) <span id="resultsCount" class="muted"></span></h2>
          </summary>
          <div class="section-filters">
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
            <button id="clearFilters" type="button">Reset filters</button>
          </div>
          <div class="mover-row mover-header">
            <div><button class="sort-btn" data-sort="ticker" type="button">Ticker</button></div>
            <div><button class="sort-btn" data-sort="name" type="button">Name</button></div>
            <div><button class="sort-btn" data-sort="price" type="button">Price</button></div>
            <div>Δ$</div>
            <div><button class="sort-btn" data-sort="pct" type="button">Δ%</button></div>
          </div>
          <div id="moversList" class="movers"></div>
        </details>
      </article>

      <article class="card col-12">
        <h2>📌 Today’s takeaway</h2>
        <ul id="summaryList" class="list"></ul>
      </article>

      <article class="card col-12">
        <h2>🧠 Alpha vs Beta</h2>
        <div class="discussion-grid">
          <div>
            <h3 class="muted" style="margin:0 0 6px">Alpha</h3>
            <ul id="alphaList" class="list"></ul>
          </div>
          <div>
            <h3 class="muted" style="margin:0 0 6px">Beta</h3>
            <ul id="betaList" class="list"></ul>
          </div>
        </div>
        <div class="agreement-box">
          <p><strong>Agreement:</strong> <span id="agreementLine" class="muted">—</span></p>
          <p><strong>Disagreement:</strong> <span id="disagreementLine" class="muted">—</span></p>
        </div>
      </article>

      <article class="card col-12">
        <h2>📰 News linked to movers</h2>
        <div class="table-wrap">
          <table class="news-table">
            <thead>
              <tr><th>Ticker</th><th>Move</th><th>Why / source</th></tr>
            </thead>
            <tbody id="newsTableBody"></tbody>
          </table>
        </div>
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

const reportsList = items.slice(0, 200)
  .map(i => `<li><a href="reports/html/${i.htmlFile}">${i.date} • ${i.slot} • ${i.title}</a>${i.regime ? ` <span class="muted">(${i.regime})</span>` : ''}</li>`)
  .join('');

const reportsPage = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Reports / Analysis</title>
<link rel="stylesheet" href="assets/style.css" />
</head><body>
  <div class="wrap">
    <nav class="topnav">
      <a class="nav-brand" href="index.html">Investment Report</a>
      <div class="nav-links">
        <a class="nav-link" href="index.html">Main</a>
        <a class="nav-link" href="tracker.html">Tracker</a>
        <a class="nav-link active" href="reports.html">Reports / Analysis</a>
      </div>
    </nav>
    <section class="hero"><h1>Reports / Analysis</h1><p class="muted">Browse generated daily reports by date and session.</p></section>
    <article class="card"><ul class="list">${reportsList || '<li class="muted">No reports available.</li>'}</ul></article>
  </div>
</body></html>`;
fs.writeFileSync(path.join(ROOT, 'reports.html'), reportsPage);

const trackerPage = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tracker</title>
<link rel="stylesheet" href="assets/style.css" />
</head><body>
  <div class="wrap">
    <nav class="topnav">
      <a class="nav-brand" href="index.html">Investment Report</a>
      <div class="nav-links">
        <a class="nav-link" href="index.html">Main</a>
        <a class="nav-link active" href="tracker.html">Tracker</a>
        <a class="nav-link" href="reports.html">Reports / Analysis</a>
      </div>
    </nav>
    <section class="hero"><h1>Tracker</h1><p class="muted">Live tracking workspace (signals, alerts, watch status) — scaffold ready for next iteration.</p></section>
    <article class="card"><h2>Planned widgets</h2><ul class="list"><li>Watchlist health</li><li>Signal triggers</li><li>Risk posture quick panel</li><li>Catalyst calendar</li></ul></article>
  </div>
</body></html>`;
fs.writeFileSync(path.join(ROOT, 'tracker.html'), trackerPage);

const todayHtml = latest
  ? `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=reports/html/${latest.htmlFile}"><title>Latest Report</title><p>Redirecting to <a href="reports/html/${latest.htmlFile}">${latest.htmlFile}</a>...</p>`
  : '<!doctype html><meta charset="utf-8"><title>Latest Report</title><p>No reports yet.</p>';
fs.writeFileSync(path.join(ROOT, 'today.html'), todayHtml);

console.log(`Index built with ${items.length} report(s).`);
