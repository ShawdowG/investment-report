const SYMBOL_FALLBACKS = {
  'GC_F': 'GC=F',
  'GC=F': 'GC=F',
  'ADBE.VI': 'ADBE.US',
  'NOVO-B.CO': 'NVO.US'
};

export function normalizeSymbol(symbol) {
  const s = String(symbol ?? '').trim();
  return SYMBOL_FALLS[s] ?? s;
}

const SYMBOL_FALLS = SYMBOL_FALLBACKS;

export function adaptMovers(movers = [], { sortBy = 'absPct', limit = 12 } = {}) {
  const rows = (Array.isArray(movers) ? movers : []).map((m) => ({
    ...m,
    ticker: normalizeSymbol(m?.ticker),
    pct: typeof m?.pct === 'number' ? m.pct : null,
  }));

  rows.sort((a, b) => {
    if (sortBy === 'ticker') return String(a.ticker).localeCompare(String(b.ticker));
    if (sortBy === 'pct') return (b.pct ?? -9999) - (a.pct ?? -9999);
    return Math.abs(b.pct ?? -9999) - Math.abs(a.pct ?? -9999);
  });

  return rows.slice(0, limit);
}

export function deriveNewsFromMovers(movers = []) {
  return adaptMovers(movers, { sortBy: 'absPct', limit: 6 }).map((m) => ({
    ticker: m.ticker,
    headline: `${m.ticker} moved ${m.pct === null ? 'n/a' : `${m.pct > 0 ? '+' : ''}${m.pct.toFixed(2)}%`} — catalyst check pending`,
    source: 'Internal mover feed',
    url: null,
  }));
}
