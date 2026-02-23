async function main() {
  const results = document.getElementById('results');
  const countEl = document.getElementById('resultsCount');
  const dateEl = document.getElementById('dateFilter');
  const tickerEl = document.getElementById('tickerFilter');
  const slotEl = document.getElementById('slotFilter');
  const clearBtn = document.getElementById('clearFilters');
  const tickerChips = [...document.querySelectorAll('.ticker-chip')];

  if (!results) return;

  let data = { items: [] };
  try {
    const res = await fetch('data/search-index.json');
    data = await res.json();
  } catch {
    results.innerHTML = '<li class="muted">Search index unavailable.</li>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (dateEl && params.get('date')) dateEl.value = params.get('date');
  if (tickerEl && params.get('ticker')) tickerEl.value = params.get('ticker');
  if (slotEl && params.get('slot')) slotEl.value = params.get('slot');

  function itemHtml(i) {
    const regime = i.regime ? ` <span class="muted">(${i.regime})</span>` : '';
    return `<li><a href="reports/html/${i.htmlFile}">${i.date} • ${i.slot} • ${i.title}</a>${regime}</li>`;
  }

  function syncUrl(d, t, s) {
    const q = new URLSearchParams();
    if (d) q.set('date', d);
    if (t) q.set('ticker', t);
    if (s) q.set('slot', s);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    history.replaceState({}, '', `${window.location.pathname}${suffix}`);
  }

  function render() {
    const d = (dateEl?.value || '').trim();
    const t = (tickerEl?.value || '').trim().toUpperCase();
    const s = (slotEl?.value || '').trim();

    tickerChips.forEach(chip => {
      const isActive = t && chip.dataset.ticker?.toUpperCase() === t;
      chip.classList.toggle('is-active', !!isActive);
    });

    const filtered = data.items.filter(item => {
      if (d && item.date !== d) return false;
      if (s && item.slot !== s) return false;
      if (t && !(item.tickers || []).map(x => x.toUpperCase()).includes(t)) return false;
      return true;
    });

    if (countEl) countEl.textContent = `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`;
    syncUrl(d, t, s);

    if (!filtered.length) {
      results.innerHTML = '<li class="muted">No reports match filters.</li>';
      return;
    }

    results.innerHTML = filtered.slice(0, 100).map(itemHtml).join('\n');
  }

  [dateEl, tickerEl, slotEl].forEach(el => el && el.addEventListener('input', render));

  tickerChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (!tickerEl) return;
      const target = chip.dataset.ticker || '';
      tickerEl.value = tickerEl.value.toUpperCase() === target.toUpperCase() ? '' : target;
      render();
    });
  });

  clearBtn?.addEventListener('click', () => {
    if (dateEl) dateEl.value = '';
    if (tickerEl) tickerEl.value = '';
    if (slotEl) slotEl.value = '';
    render();
  });

  render();
}

main();
