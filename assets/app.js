async function main() {
  const results = document.getElementById('results');
  const countEl = document.getElementById('resultsCount');
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

  function itemHtml(i) {
    const regime = i.regime ? ` <span class="muted">(${i.regime})</span>` : '';
    return `<li><a href="reports/daily/${i.file}">${i.date} • ${i.slot} • ${i.title}</a>${regime}</li>`;
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

    if (countEl) countEl.textContent = `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`;

    if (!filtered.length) {
      results.innerHTML = '<li class="muted">No reports match filters.</li>';
      return;
    }

    results.innerHTML = filtered.slice(0, 100).map(itemHtml).join('\n');
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
