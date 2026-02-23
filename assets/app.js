async function main() {
  const results = document.getElementById('results');
  const dateEl = document.getElementById('dateFilter');
  const tickerEl = document.getElementById('tickerFilter');
  const slotEl = document.getElementById('slotFilter');
  const clearBtn = document.getElementById('clearFilters');

  if (!results) return;

  let data = { items: [] };
  try {
    const res = await fetch('data/search-index.json');
    data = await res.json();
  } catch {
    results.innerHTML = '<li class="muted">Search index unavailable.</li>';
    return;
  }

  function render() {
    const d = (dateEl?.value || '').trim();
    const t = (tickerEl?.value || '').trim().toUpperCase();
    const s = (slotEl?.value || '').trim();

    const filtered = data.items.filter(item => {
      if (d && item.date !== d) return false;
      if (s && item.slot !== s) return false;
      if (t && !(item.tickers || []).map(x => x.toUpperCase()).includes(t)) return false;
      return true;
    });

    if (!filtered.length) {
      results.innerHTML = '<li class="muted">No reports match filters.</li>';
      return;
    }

    results.innerHTML = filtered
      .slice(0, 100)
      .map(i => `<li><a href="reports/daily/${i.file}">${i.date} • ${i.slot} • ${i.title}</a>${i.regime ? ` <span class="muted">(${i.regime})</span>` : ''}</li>`)
      .join('\n');
  }

  [dateEl, tickerEl, slotEl].forEach(el => el && el.addEventListener('input', render));
  clearBtn?.addEventListener('click', () => {
    if (dateEl) dateEl.value = '';
    if (tickerEl) tickerEl.value = '';
    if (slotEl) slotEl.value = '';
    render();
  });

  render();
}

main();
