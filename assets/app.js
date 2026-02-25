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
  const pulseCardsEl = document.getElementById('pulseCards');
  const pulseEl = document.getElementById('pulseSummary');
  const summaryEl = document.getElementById('summaryList');
  const alphaEl = document.getElementById('alphaList');
  const betaEl = document.getElementById('betaList');
  const newsTableBodyEl = document.getElementById('newsTableBody');
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
    AAPL:'Apple', TSLA:'Tesla', GOOG:'Alphabet', NVDA:'NVIDIA', AMZN:'Amazon', MSFT:'Microsoft', META:'Meta',
    DUOL:'Duolingo', 'ADBE.VI':'Adobe', AMD:'AMD', BABA:'Alibaba', LMT:'Lockheed Martin', BA:'Boeing',
    TM:'Toyota', V:'Visa', MA:'Mastercard', NFLX:'Netflix', RDDT:'Reddit', 'NOVO-B.CO':'Novo Nordisk'
  };

  const allItems = [...(data.items || [])];
  const allDates = [...new Set(allItems.map(i => i.date).filter(Boolean))].sort().reverse();

  const state = {
    range: 'today',
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

  function parseDate(d) { return new Date(`${d}T00:00:00`); }

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
    const tone = pct === null ? '' : pct < 0 ? 'neg' : pct > 0 ? 'pos' : 'flat';
    const direction = pct === null ? '•' : pct < 0 ? '↓' : pct > 0 ? '↑' : '→';
    const pctText = pct === null ? '—' : pct > 0 ? `+${pct.toFixed(2)}%` : pct < 0 ? `${pct.toFixed(2)}%` : '+0.00%';
    const name = NAME_MAP[m.ticker] || m.name || m.ticker || 'Unknown';
    return `<div class="mover-row">
      <div class="ticker-badge">${m.ticker || '—'}</div>
      <div class="mover-name">${name}</div>
      <div class="mover-price">${m.price || '—'}</div>
      <div class="mover-change ${tone}">${m.change || '—'}</div>
      <div class="mover-pill ${tone}">${direction} ${pctText}</div>
    </div>`;
  }

  function newsLinkFor(ticker) {
    const q = encodeURIComponent(`${ticker} stock news`);
    return `https://www.google.com/search?tbm=nws&q=${q}`;
  }

  function renderNewsTable(primary) {
    if (!newsTableBodyEl) return;
    const movers = primary?.movers || [];
    if (!movers.length) {
      newsTableBodyEl.innerHTML = '<tr><td colspan="3" class="muted">No linked source for this filter yet.</td></tr>';
      return;
    }
    const top = [...movers].filter(m => typeof m.pct === 'number').sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 6);
    newsTableBodyEl.innerHTML = top.map(m => {
      const pct = `${m.pct > 0 ? '+' : ''}${m.pct.toFixed(2)}%`;
      return `<tr>
        <td>${m.ticker}</td>
        <td>${pct}</td>
        <td><a href="${newsLinkFor(m.ticker)}" target="_blank" rel="noopener noreferrer">Search latest source</a></td>
      </tr>`;
    }).join('');
  }

  function renderPulse(primary) {
    const byTicker = Object.fromEntries((primary?.movers || []).map(r => [r.ticker, r]));
    const cards = [
      ['^GSPC', 'S&P'],
      ['^NDQ', 'NDQ'],
      ['BTC-USD', 'BTC'],
      ['GC=F', 'Gold']
    ].map(([key, label]) => {
      const v = byTicker[key];
      const pct = (typeof v?.pct === 'number') ? `${v.pct > 0 ? '+' : ''}${v.pct.toFixed(2)}%` : 'n/a';
      return `<div class="pulse-card"><span class="muted">${label}</span><strong>${v?.price || 'n/a'}</strong><span>${pct}</span></div>`;
    }).join('');

    if (pulseCardsEl) pulseCardsEl.innerHTML = cards;

    const pulseLines = (primary?.sections?.pulse || []).filter(Boolean);
    if (pulseLines.length) {
      setList(pulseEl, pulseLines, 'Awaiting pulse update.');
      return;
    }

    const rows = [...(primary?.movers || [])].filter(m => typeof m.pct === 'number');
    const topDown = rows.slice().sort((a,b)=>a.pct-b.pct)[0];
    const topUp = rows.slice().sort((a,b)=>b.pct-a.pct)[0];
    const fallback = [
      `Market pulse generated from latest report snapshot (${primary?.date || 'n/a'} ${primary?.slot || ''}).`,
      topDown ? `Biggest downside: ${topDown.ticker} (${topDown.pct.toFixed(2)}%).` : '',
      topUp ? `Relative strength: ${topUp.ticker} (${topUp.pct.toFixed(2)}%).` : ''
    ].filter(Boolean);
    setList(pulseEl, fallback, 'Awaiting pulse update.');
  }

  function renderDetailedSections(primary) {
    const rows = [...(primary?.movers || [])].filter(m => typeof m.pct === 'number');
    const topDown = rows.slice().sort((a,b)=>a.pct-b.pct).slice(0,3);
    const topUp = rows.slice().sort((a,b)=>b.pct-a.pct).slice(0,2);

    const summary = [primary?.summary || '',
      topDown.length ? `Main pressure names: ${topDown.map(x=>`${x.ticker} (${x.pct.toFixed(2)}%)`).join(', ')}.` : '',
      topUp.length ? `Relative strength: ${topUp.map(x=>`${x.ticker} (${x.pct.toFixed(2)}%)`).join(', ')}.` : ''
    ].filter(Boolean);
    setList(summaryEl, summary, 'Awaiting next Gamma sync.');

    const alphaLines = (primary?.sections?.alpha || []).filter(Boolean);
    const betaLines = (primary?.sections?.beta || []).filter(Boolean);

    const alphaFallback = [
      'Keep core exposure selective while downside dispersion is elevated.',
      topDown.length ? `Avoid concentration in weak cluster: ${topDown.map(x=>x.ticker).join(', ')}.` : '',
      'Re-risk only after breadth and follow-through improve.'
    ].filter(Boolean);
    const betaFallback = [
      'Use smaller sizing on high-volatility names until confirmation.',
      topDown.length ? `Prioritize catalyst checks for: ${topDown.map(x=>x.ticker).join(', ')}.` : '',
      'Favor staged entries over first-bounce chasing.'
    ].filter(Boolean);

    setList(alphaEl, alphaLines.length ? alphaLines : alphaFallback, 'Awaiting Alpha commentary.');
    setList(betaEl, betaLines.length ? betaLines : betaFallback, 'Awaiting Beta commentary.');

    if (agreementEl) agreementEl.textContent = 'Both lean selective and confirmation-first on new risk adds.';
    if (disagreementEl) disagreementEl.textContent = 'Primary debate: re-risk timing (early bounce vs confirmed follow-through).';
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
    if (headerContextEl) headerContextEl.textContent = `Showing: ${getRangeLabel()} • ${state.slot || 'All sessions'} • ${state.ticker || 'All tickers'}`;
    updateSortButtons();

    if (!filtered.length) {
      moversEl.innerHTML = '<div class="muted">No ticker moves for this selection.</div>';
      results.innerHTML = '<li class="muted">No reports match filters.</li>';
      setList(summaryEl, [], 'Awaiting next Gamma sync.');
      setList(alphaEl, [], 'Awaiting Alpha commentary.');
      setList(betaEl, [], 'Awaiting Beta commentary.');
      if (agreementEl) agreementEl.textContent = 'Awaiting shared view from Alpha and Beta.';
      if (disagreementEl) disagreementEl.textContent = 'No active disagreement logged.';
      if (pulseCardsEl) pulseCardsEl.innerHTML = '';
      setList(pulseEl, [], 'No pulse data for selected filters.');
      if (newsTableBodyEl) newsTableBodyEl.innerHTML = '<tr><td colspan="3" class="muted">No linked source for this filter yet.</td></tr>';
      return;
    }

    const rows = [...(primary?.movers || [])];
    sortRows(rows);
    moversEl.innerHTML = rows.length ? rows.map(renderMoverRow).join('') : '<div class="muted">No ticker moves to display.</div>';

    renderPulse(primary);
    renderDetailedSections(primary);
    renderNewsTable(primary);

    results.innerHTML = filtered.slice(0, 40).map(i => `<li><a href="reports/html/${i.htmlFile}">${i.date} • ${i.slot} • ${i.title}</a>${i.regime ? ` <span class="muted">(${i.regime})</span>` : ''}</li>`).join('');
  }

  slotEl?.addEventListener('input', () => { state.slot = (slotEl.value || '').trim(); render(); });
  tickerEl?.addEventListener('input', () => { state.ticker = (tickerEl.value || '').trim().toUpperCase(); render(); });

  rangeTodayBtn?.addEventListener('click', () => { state.range = 'today'; render(); });
  rangeYesterdayBtn?.addEventListener('click', () => { state.range = 'yesterday'; render(); });
  range7Btn?.addEventListener('click', () => { state.range = 'last7'; render(); });
  range30Btn?.addEventListener('click', () => { state.range = 'last30'; render(); });
  headerDateEl?.addEventListener('input', () => { state.range = 'date'; state.date = headerDateEl.value; render(); });

  sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (!key) return;
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else {
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
