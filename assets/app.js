async function main() {
  const results = document.getElementById('results');
  const countEl = document.getElementById('resultsCount');
  const headerContextEl = document.getElementById('headerContext');

  const slotEl = document.getElementById('slotFilter');
  const tickerEl = document.getElementById('tickerFilter');
  const clearBtn = document.getElementById('clearFilters');

  const rangeTodayBtn = document.getElementById('rangeToday');
  const rangeYesterdayBtn = document.getElementById('rangeYesterday');
  const range7Btn = document.getElementById('range7');
  const range30Btn = document.getElementById('range30');
  const headerDateEl = document.getElementById('headerDate');

  const moversEl = document.getElementById('moversList');
  const pulseEl = document.getElementById('pulseSummary');
  const summaryEl = document.getElementById('summaryList');
  const alphaEl = document.getElementById('alphaList');
  const betaEl = document.getElementById('betaList');
  const newsEl = document.getElementById('newsList');
  const agreementEl = document.getElementById('agreementLine');
  const disagreementEl = document.getElementById('disagreementLine');
  const sortBtns = [...document.querySelectorAll('.sort-btn')];

  if (!results || !moversEl) return;

  let data = { items: [] };
  try {
    const res = await fetch('data/search-index.json');
    data = await res.json();
  } catch {
    results.innerHTML = '<li class="muted">Search index unavailable.</li>';
    return;
  }

  const NAME_MAP = {
    'BTC-USD':'Bitcoin', 'GC=F':'Gold', '^GSPC':'S&P 500', '^NDQ':'Nasdaq 100',
    'AAPL':'Apple', 'TSLA':'Tesla', 'GOOG':'Alphabet', 'NVDA':'NVIDIA', 'AMZN':'Amazon', 'MSFT':'Microsoft', 'META':'Meta',
    'DUOL':'Duolingo', 'ADBE.VI':'Adobe', 'AMD':'AMD', 'BABA':'Alibaba', 'LMT':'Lockheed Martin', 'BA':'Boeing',
    'TM':'Toyota', 'V':'Visa', 'MA':'Mastercard', 'NFLX':'Netflix', 'RDDT':'Reddit', 'NOVO-B.CO':'Novo Nordisk'
  };

  const allItems = [...(data.items || [])];
  const allDates = [...new Set(allItems.map(i => i.date).filter(Boolean))].sort().reverse();

  const state = {
    range: 'today', // today|yesterday|last7|last30|date
    date: allDates[0] || '',
    slot: '',
    ticker: '',
    sortKey: 'pct',
    sortDir: 'desc'
  };

  if (headerDateEl && state.date) headerDateEl.value = state.date;

  function setList(el, lines, fallback) {
    if (!el) return;
    const arr = (lines || []).filter(Boolean);
    el.innerHTML = arr.length ? arr.map(l => `<li>${l}</li>`).join('') : `<li class="muted">${fallback}</li>`;
  }

  function parseDate(d) {
    return new Date(`${d}T00:00:00`);
  }

  function dateInRange(d, days) {
    if (!d || !allDates.length) return false;
    const latest = parseDate(allDates[0]);
    const target = parseDate(d);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    return target >= cutoff && target <= latest;
  }

  function getDateFilterFn() {
    if (state.range === 'today') {
      const d = allDates[0] || '';
      return item => item.date === d;
    }
    if (state.range === 'yesterday') {
      const d = allDates[1] || allDates[0] || '';
      return item => item.date === d;
    }
    if (state.range === 'last7') return item => dateInRange(item.date, 7);
    if (state.range === 'last30') return item => dateInRange(item.date, 30);
    if (state.range === 'date') return item => item.date === state.date;
    return () => true;
  }

  function getRangeLabel() {
    if (state.range === 'today') return 'Today';
    if (state.range === 'yesterday') return 'Yesterday';
    if (state.range === 'last7') return 'Last 7 days';
    if (state.range === 'last30') return 'Last 30 days';
    return state.date || 'Pick date';
  }

  const sortBaseLabel = { ticker: 'Ticker', name: 'Name', price: 'Price', pct: 'Δ%' };
  function updateSortButtons() {
    sortBtns.forEach(btn => {
      const key = btn.dataset.sort;
      if (!key) return;
      const active = key === state.sortKey;
      btn.classList.toggle('active', active);
      const arrow = active ? (state.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      btn.textContent = `${sortBaseLabel[key] || key}${arrow}`;
    });
  }

  function normPrice(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function sortRows(rows) {
    rows.sort((a, b) => {
      let av, bv;
      if (state.sortKey === 'ticker') {
        av = (a.ticker || '').toUpperCase();
        bv = (b.ticker || '').toUpperCase();
        const cmp = av.localeCompare(bv);
        return state.sortDir === 'asc' ? cmp : -cmp;
      }
      if (state.sortKey === 'name') {
        av = (NAME_MAP[a.ticker] || a.name || a.ticker || '').toUpperCase();
        bv = (NAME_MAP[b.ticker] || b.name || b.ticker || '').toUpperCase();
        const cmp = av.localeCompare(bv);
        return state.sortDir === 'asc' ? cmp : -cmp;
      }
      if (state.sortKey === 'price') {
        av = normPrice(a.price) ?? -Infinity;
        bv = normPrice(b.price) ?? -Infinity;
      } else {
        av = typeof a.pct === 'number' ? a.pct : -Infinity;
        bv = typeof b.pct === 'number' ? b.pct : -Infinity;
      }
      return state.sortDir === 'asc' ? av - bv : bv - av;
    });
  }

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
      newsEl.innerHTML = '<li class="muted">No linked source for this filter yet.</li>';
      return;
    }
    const top = [...movers].filter(m => typeof m.pct === 'number').sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 5);
    newsEl.innerHTML = top.map(m => {
      const dir = m.pct < 0 ? 'down' : 'up';
      const pct = `${m.pct > 0 ? '+' : ''}${m.pct.toFixed(2)}%`;
      const href = newsLinkFor(m.ticker);
      return `<li><strong>${m.ticker}</strong>: ${dir} ${pct} — <a href="${href}" target="_blank" rel="noopener noreferrer">source search</a></li>`;
    }).join('');
  }

  function render() {
    const dateFn = getDateFilterFn();
    const filtered = allItems.filter(item => {
      if (!dateFn(item)) return false;
      if (state.slot && item.slot !== state.slot) return false;
      if (state.ticker && !(item.tickers || []).map(x => x.toUpperCase()).includes(state.ticker)) return false;
      return true;
    });

    const primary = filtered[0] || null;

    if (countEl) countEl.textContent = `${filtered.length} report${filtered.length === 1 ? '' : 's'}`;
    if (headerContextEl) {
      headerContextEl.textContent = `Showing: ${getRangeLabel()} • ${state.slot || 'All sessions'} • ${state.ticker || 'All tickers'}`;
    }
    updateSortButtons();

    if (!filtered.length) {
      moversEl.innerHTML = '<div class="muted">No ticker moves for this selection.</div>';
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
    moversEl.innerHTML = rows.length ? rows.map(renderMoverRow).join('') : '<div class="muted">No ticker moves to display.</div>';

    if (pulseEl) {
      const p = primary?.sections?.pulse || [];
      pulseEl.innerHTML = p.map(x => `<div>${x}</div>`).join('') || 'Awaiting pulse update.';
    }

    setList(summaryEl, [primary.summary || ''].filter(Boolean), 'No summary yet.');
    const alphaLines = primary?.sections?.alpha || [];
    const betaLines = primary?.sections?.beta || [];
    setList(alphaEl, alphaLines, 'No Alpha notes yet.');
    setList(betaEl, betaLines, 'No Beta notes yet.');

    if (agreementEl) agreementEl.textContent = alphaLines.length && betaLines.length ? 'Both lean selective until confirmation improves.' : 'Awaiting shared view from Alpha and Beta.';
    if (disagreementEl) disagreementEl.textContent = alphaLines.length && betaLines.length ? 'Main disagreement is timing of re-risking.' : 'No active disagreement.';

    renderNews(primary);

    results.innerHTML = filtered.slice(0, 40).map(i => `<li><a href="reports/html/${i.htmlFile}">${i.date} • ${i.slot} • ${i.title}</a>${i.regime ? ` <span class="muted">(${i.regime})</span>` : ''}</li>`).join('');
  }

  slotEl?.addEventListener('input', () => {
    state.slot = (slotEl.value || '').trim();
    render();
  });

  tickerEl?.addEventListener('input', () => {
    state.ticker = (tickerEl.value || '').trim().toUpperCase();
    render();
  });

  rangeTodayBtn?.addEventListener('click', () => { state.range = 'today'; render(); });
  rangeYesterdayBtn?.addEventListener('click', () => { state.range = 'yesterday'; render(); });
  range7Btn?.addEventListener('click', () => { state.range = 'last7'; render(); });
  range30Btn?.addEventListener('click', () => { state.range = 'last30'; render(); });
  headerDateEl?.addEventListener('input', () => {
    state.range = 'date';
    state.date = headerDateEl.value;
    render();
  });

  sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (!key) return;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = (key === 'ticker' || key === 'name') ? 'asc' : 'desc';
      }
      render();
    });
  });

  clearBtn?.addEventListener('click', () => {
    state.slot = '';
    state.ticker = '';
    if (slotEl) slotEl.value = '';
    if (tickerEl) tickerEl.value = '';
    render();
  });

  render();
}

main();
