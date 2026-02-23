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

  function renderMoverRow(m) {
    const pct = typeof m.pct === 'number' ? m.pct : null;
    const isDown = pct !== null ? pct < 0 : null;
    const direction = pct === null ? '•' : (isDown ? '↓' : '↑');
    const pctText = pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
    return `<div class="mover-row">
      <div class="ticker-badge">${m.ticker || '—'}</div>
      <div class="mover-name">${m.name || m.ticker || 'Unknown'}</div>
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
    const top = movers
      .filter(m => typeof m.pct === 'number')
      .sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct))
      .slice(0,5);
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
      moversEl.innerHTML = '<div class="muted">Ingen bevegelser å vise.</div>';
      results.innerHTML = '<li class="muted">No reports match filters.</li>';
      setList(summaryEl, [], 'No summary yet.');
      setList(alphaEl, [], 'No Alpha notes yet.');
      setList(betaEl, [], 'No Beta notes yet.');
      if (pulseEl) pulseEl.textContent = 'No pulse data for selected filters.';
      if (newsEl) newsEl.innerHTML = '<li class="muted">Ingen relevante nyheter for valgt filter.</li>';
      return;
    }

    if (primary?.movers?.length) {
      moversEl.innerHTML = primary.movers.slice(0, 10).map(renderMoverRow).join('');
    } else {
      moversEl.innerHTML = '<div class="muted">Ingen bevegelser å vise.</div>';
    }

    if (pulseEl) {
      const p = primary?.sections?.pulse || [];
      pulseEl.innerHTML = p.map(x => `<div>${x}</div>`).join('') || 'Awaiting pulse update.';
    }

    setList(summaryEl, [primary.summary || '', ...(primary?.sections?.gamma || [])].slice(0, 5), 'No summary yet.');
    setList(alphaEl, primary?.sections?.alpha || [], 'No Alpha notes yet.');
    setList(betaEl, primary?.sections?.beta || [], 'No Beta notes yet.');
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
  clearBtn?.addEventListener('click', () => {
    if (latest?.date) dateEl.value = latest.date;
    if (tickerEl) tickerEl.value = '';
    if (slotEl) slotEl.value = '';
    render();
  });

  render();
}

main();
