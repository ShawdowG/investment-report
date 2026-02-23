async function main() {
  const results = document.getElementById('results');
  const countEl = document.getElementById('resultsCount');
  const dateEl = document.getElementById('dateSelect');
  const tickerEl = document.getElementById('tickerFilter');
  const slotEl = document.getElementById('slotFilter');
  const clearBtn = document.getElementById('clearFilters');
  const chipsEl = document.getElementById('tickerChips');

  const moversEl = document.getElementById('moversList');
  const pulseEl = document.getElementById('pulseSummary');
  const summaryEl = document.getElementById('summaryList');
  const alphaEl = document.getElementById('alphaList');
  const betaEl = document.getElementById('betaList');
  const newsEl = document.getElementById('newsList');
  const agreementEl = document.getElementById('agreementLine');
  const disagreementEl = document.getElementById('disagreementLine');
  const sortBtns = [...document.querySelectorAll('.sort-btn')];

  if (!results || !dateEl || !moversEl) return;

  let data = { items: [] };
  try {
    const res = await fetch('data/search-index.json');
    data = await res.json();
  } catch {
    results.innerHTML = '<li class="muted">Search index unavailable.</li>';
    return;
  }

  const dates = Array.isArray(window.__DATES__) ? window.__DATES__ : [];
  const tickers = Array.isArray(window.__TICKERS__) ? window.__TICKERS__ : [];
  const latest = window.__LATEST__ || null;

  dateEl.innerHTML = dates.map(d => `<option value="${d}">${d}</option>`).join('');
  if (latest?.date) dateEl.value = latest.date;

  chipsEl.innerHTML = tickers.slice(0, 30).map(t => `<button class="chip ticker-chip" data-ticker="${t}" type="button">${t}</button>`).join('');

  const params = new URLSearchParams(window.location.search);
  if (params.get('date')) dateEl.value = params.get('date');
  if (params.get('ticker') && tickerEl) tickerEl.value = params.get('ticker');
  if (params.get('slot') && slotEl) slotEl.value = params.get('slot');

  function setList(el, lines, fallback) {
    if (!el) return;
    const arr = (lines || []).filter(Boolean);
    if (!arr.length) {
      el.innerHTML = `<li class="muted">${fallback}</li>`;
      return;
    }
    el.innerHTML = arr.map(l => `<li>${l}</li>`).join('');
  }

  function syncUrl(d, t, s) {
    const q = new URLSearchParams();
    if (d) q.set('date', d);
    if (t) q.set('ticker', t);
    if (s) q.set('slot', s);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    history.replaceState({}, '', `${window.location.pathname}${suffix}`);
  }

  let sortKey = 'pct';
  let sortDir = 'desc';

  function normPrice(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function sortRows(rows) {
    rows.sort((a, b) => {
      let av, bv;
      if (sortKey === 'ticker') {
        av = (a.ticker || '').toUpperCase();
        bv = (b.ticker || '').toUpperCase();
        const cmp = av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortKey === 'price') {
        av = normPrice(a.price) ?? -Infinity;
        bv = normPrice(b.price) ?? -Infinity;
      } else {
        av = typeof a.pct === 'number' ? a.pct : -Infinity;
        bv = typeof b.pct === 'number' ? b.pct : -Infinity;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }

  const NAME_MAP = {
    'BTC-USD':'Bitcoin', 'GC=F':'Gold', '^GSPC':'S&P 500', '^NDQ':'Nasdaq 100',
    'AAPL':'Apple', 'TSLA':'Tesla', 'GOOG':'Alphabet', 'NVDA':'NVIDIA', 'AMZN':'Amazon', 'MSFT':'Microsoft', 'META':'Meta',
    'DUOL':'Duolingo', 'ADBE.VI':'Adobe', 'AMD':'AMD', 'BABA':'Alibaba', 'LMT':'Lockheed Martin', 'BA':'Boeing',
    'TM':'Toyota', 'V':'Visa', 'MA':'Mastercard', 'NFLX':'Netflix', 'RDDT':'Reddit', 'NOVO-B.CO':'Novo Nordisk'
  };

  function renderMoverRow(m) {
    const pct = typeof m.pct === 'number' ? m.pct : null;
    const isDown = pct !== null ? pct < 0 : null;
    const direction = pct === null ? '•' : (isDown ? '↓' : '↑');
    const pctText = pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
    const name = NAME_MAP[m.ticker] || m.name || m.ticker || 'Unknown';
    return `<div class="mover-row">
      <div class="ticker-badge">${m.ticker || '—'}</div>
      <div class="mover-name">${name}</div>
      <div class="mover-price">${m.price || '—'}</div>
      <div class="mover-change ${isDown === null ? '' : isDown ? 'neg':'pos'}">${m.change || '—'}</div>
      <div class="mover-pill ${isDown === null ? '' : isDown ? 'neg':'pos'}">${direction} ${pctText}</div>
      <div class="mover-check">✓</div>
    </div>`;
  }

  function newsLinkFor(ticker) {
    const q = encodeURIComponent(`${ticker} stock news`);
    return `https://www.google.com/search?tbm=nws&q=${q}`;
  }

  function renderNews(primary) {
    if (!newsEl) return;
    const movers = primary?.movers || [];
    if (!movers.length) {
      newsEl.innerHTML = '<li class="muted">Ingen relevante nyheter funnet for valgt rapport.</li>';
      return;
    }
    const top = [...movers]
      .filter(m => typeof m.pct === 'number')
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 5);
    newsEl.innerHTML = top.map(m => {
      const dir = m.pct < 0 ? 'ned' : 'opp';
      const pct = `${m.pct > 0 ? '+' : ''}${m.pct.toFixed(2)}%`;
      const href = newsLinkFor(m.ticker);
      return `<li><strong>${m.ticker}</strong>: ${dir} ${pct} i rapporten — <a href="${href}" target="_blank" rel="noopener noreferrer">kilde-søk</a></li>`;
    }).join('');
  }

  function render() {
    const d = (dateEl.value || '').trim();
    const t = (tickerEl?.value || '').trim().toUpperCase();
    const s = (slotEl?.value || '').trim();

    const filtered = data.items.filter(item => {
      if (d && item.date !== d) return false;
      if (s && item.slot !== s) return false;
      if (t && !(item.tickers || []).map(x => x.toUpperCase()).includes(t)) return false;
      return true;
    });

    const primary = filtered[0] || null;

    document.querySelectorAll('.ticker-chip').forEach(ch => {
      ch.classList.toggle('is-active', t && ch.dataset.ticker?.toUpperCase() === t);
    });

    if (countEl) countEl.textContent = `${filtered.length} report${filtered.length === 1 ? '' : 's'}`;
    syncUrl(d, t, s);

    if (!filtered.length) {
      moversEl.innerHTML = '<div class="muted">Ingen bevegelser å vise for dette utvalget.</div>';
      results.innerHTML = '<li class="muted">No reports match filters.</li>';
      setList(summaryEl, [], 'Awaiting next Gamma sync.');
      setList(alphaEl, [], 'Awaiting Alpha commentary.');
      setList(betaEl, [], 'Awaiting Beta commentary.');
      if (agreementEl) agreementEl.textContent = 'Awaiting shared view from Alpha and Beta.';
      if (disagreementEl) disagreementEl.textContent = 'No active disagreement logged.';
      if (pulseEl) pulseEl.textContent = 'No pulse data for selected filters.';
      if (newsEl) newsEl.innerHTML = '<li class="muted">No linked source for this filter yet.</li>';
      return;
    }

    const rows = [...(primary?.movers || [])];
    sortRows(rows);
    moversEl.innerHTML = rows.length ? rows.map(renderMoverRow).join('') : '<div class="muted">Ingen bevegelser å vise.</div>';

    if (pulseEl) {
      const p = primary?.sections?.pulse || [];
      pulseEl.innerHTML = p.map(x => `<div>${x}</div>`).join('') || 'Awaiting pulse update.';
    }

    setList(summaryEl, [primary.summary || ''].filter(Boolean), 'No summary yet.');
    const alphaLines = primary?.sections?.alpha || [];
    const betaLines = primary?.sections?.beta || [];
    setList(alphaEl, alphaLines, 'No Alpha notes yet.');
    setList(betaEl, betaLines, 'No Beta notes yet.');

    const a = alphaLines.find(x => x && !x.toLowerCase().includes('no ')) || alphaLines[0] || '';
    const b = betaLines.find(x => x && !x.toLowerCase().includes('no ')) || betaLines[0] || '';
    if (agreementEl) {
      agreementEl.textContent = a && b ? 'Both lean defensive/selective unless confirmation improves.' : 'Awaiting clearer overlap between Alpha and Beta.';
    }
    if (disagreementEl) {
      disagreementEl.textContent = a && b ? 'Timing of re-risking (buy now vs wait for confirmation).' : 'No active disagreement.';
    }

    renderNews(primary);

    results.innerHTML = filtered
      .slice(0, 40)
      .map(i => `<li><a href="reports/html/${i.htmlFile}">${i.date} • ${i.slot} • ${i.title}</a>${i.regime ? ` <span class="muted">(${i.regime})</span>` : ''}</li>`)
      .join('');
  }

  [dateEl, tickerEl, slotEl].forEach(el => el && el.addEventListener('input', render));
  chipsEl.querySelectorAll('.ticker-chip').forEach(ch => {
    ch.addEventListener('click', () => {
      if (!tickerEl) return;
      const target = ch.dataset.ticker || '';
      tickerEl.value = tickerEl.value.toUpperCase() === target.toUpperCase() ? '' : target;
      render();
    });
  });

  sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (!key) return;
      if (sortKey === key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = key === 'ticker' ? 'asc' : 'desc';
      }
      render();
    });
  });

  clearBtn?.addEventListener('click', () => {
    if (latest?.date) dateEl.value = latest.date;
    if (tickerEl) tickerEl.value = '';
    if (slotEl) slotEl.value = '';
    render();
  });

  render();
}

main();
