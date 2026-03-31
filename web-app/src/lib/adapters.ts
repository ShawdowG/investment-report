import type { Mover, NewsRow } from "@/types/reports";

// Fix for original adapters.js bug:
// `SYMBOL_FALLS` was referenced on line 10 before being defined on line 13.
// Defined here at the top to avoid the ReferenceError.
const NAME_MAP: Record<string, string> = {
  "BTC-USD": "Bitcoin", "GC=F": "Gold", "^GSPC": "S&P 500", "^NDX": "Nasdaq 100",
  "AAPL": "Apple", "TSLA": "Tesla", "GOOG": "Alphabet", "NVDA": "NVIDIA",
  "AMZN": "Amazon", "MSFT": "Microsoft", "META": "Meta", "DUOL": "Duolingo",
  "ADBE": "Adobe", "ADBE.VI": "Adobe", "AMD": "AMD", "BABA": "Alibaba",
  "LMT": "Lockheed Martin", "BA": "Boeing", "TM": "Toyota", "V": "Visa",
  "MA": "Mastercard", "NFLX": "Netflix", "RDDT": "Reddit",
  "NVO": "Novo Nordisk", "NOVO-B.CO": "Novo Nordisk",
};

const SYMBOL_FALLBACKS: Record<string, string> = {
  "GC_F": "GC=F",
  "GC=F": "GC=F",
  "ADBE.VI": "ADBE",
  "NOVO-B.CO": "NVO",
  "^NDQ": "^NDX",
};

export function normalizeSymbol(symbol: string): string {
  const s = String(symbol ?? "").trim();
  return SYMBOL_FALLBACKS[s] ?? s;
}

interface RawMover {
  ticker?: string;
  name?: string;
  price?: number | string;
  pct?: number | null;
  changePct?: number | null;
  change?: number | string | null;
  changeValue?: number | null;
  changeAbs?: number | null;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function adaptMovers(
  movers: unknown[] = [],
  { sortBy = "absPct", limit = 12 }: { sortBy?: "ticker" | "pct" | "absPct"; limit?: number } = {}
): Mover[] {
  const rows: Mover[] = (Array.isArray(movers) ? movers : []).map((raw) => {
    const m = raw as RawMover;
    const ticker = normalizeSymbol(m?.ticker ?? "");
    // Support both v1 (pct, change as string) and v2 (changePct, changeValue as number)
    const changePct = toNum(m?.changePct ?? m?.pct);
    const changeAbs = toNum(m?.changeAbs ?? m?.changeValue ?? m?.change);
    const price = toNum(m?.price);
    return {
      ticker,
      name: NAME_MAP[m?.ticker ?? ""] || NAME_MAP[ticker] || m?.name || ticker,
      price,
      changePct,
      changeAbs,
    };
  });

  rows.sort((a, b) => {
    if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
    if (sortBy === "pct") return b.changePct - a.changePct;
    return Math.abs(b.changePct) - Math.abs(a.changePct);
  });

  return rows.slice(0, limit);
}

export function deriveNewsFromMovers(movers: unknown[] = []): NewsRow[] {
  return adaptMovers(movers, { sortBy: "absPct", limit: 6 }).map((m) => ({
    ticker: m.ticker,
    displaySymbol: m.ticker,
    changePct: m.changePct,
    note:
      m.changePct === 0
        ? "Flat — catalyst check pending"
        : `Moved ${m.changePct > 0 ? "+" : ""}${m.changePct.toFixed(2)}% — catalyst check pending`,
  }));
}
