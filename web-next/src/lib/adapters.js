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

// Map ticker symbols to clean search-friendly names
const TICKER_NAMES = {
  'BTC-USD':'Bitcoin', 'GC=F':'Gold', '^GSPC':'S&P 500', '^NDX':'Nasdaq 100',
  'AAPL':'Apple', 'TSLA':'Tesla', 'GOOG':'Alphabet', 'NVDA':'NVIDIA', 'AMZN':'Amazon',
  'MSFT':'Microsoft', 'META':'Meta Platforms', 'DUOL':'Duolingo', 'ADBE.US':'Adobe',
  'AMD':'AMD', 'BABA':'Alibaba', 'LMT':'Lockheed Martin', 'BA':'Boeing',
  'TM':'Toyota', 'V':'Visa', 'MA':'Mastercard', 'NFLX':'Netflix', 'RDDT':'Reddit',
  'NVO.US':'Novo Nordisk',
};

function buildSourceUrl(ticker) {
  // Prefer direct publisher links: Yahoo Finance for equities, use clean ticker
  const clean = ticker.replace(/[^A-Za-z0-9-]/g, '');
  if (!clean) return null;
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`;
}

export function deriveNewsFromMovers(movers = []) {
  return adaptMovers(movers, { sortBy: 'absPct', limit: 6 }).map((m) => {
    const name = TICKER_NAMES[m.ticker] || m.name || m.ticker;
    const pctStr = m.pct === null ? 'n/a' : `${m.pct > 0 ? '+' : ''}${m.pct.toFixed(2)}%`;
    return {
      ticker: m.ticker,
      headline: `${name} (${m.ticker}) ${pctStr}`,
      source: 'Yahoo Finance',
      url: buildSourceUrl(m.ticker),
    };
  });
}
