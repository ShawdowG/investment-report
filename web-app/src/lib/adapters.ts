import type { Mover, NewsRow } from "@/types/reports";

// Fix for original adapters.js bug:
// `SYMBOL_FALLS` was referenced on line 10 before being defined on line 13.
// Defined here at the top to avoid the ReferenceError.
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
}

export function adaptMovers(
  movers: unknown[] = [],
  { sortBy = "absPct", limit = 12 }: { sortBy?: "ticker" | "pct" | "absPct"; limit?: number } = {}
): Mover[] {
  const rows: Mover[] = (Array.isArray(movers) ? movers : []).map((raw) => {
    const m = raw as RawMover;
    const ticker = normalizeSymbol(m?.ticker ?? "");
    // Support both v1 (pct) and v2 (changePct) snapshot field names
    const changePct =
      typeof m?.changePct === "number"
        ? m.changePct
        : typeof m?.pct === "number"
        ? m.pct
        : 0;
    const changeAbs =
      typeof m?.changeValue === "number"
        ? m.changeValue
        : typeof m?.change === "number"
        ? m.change
        : 0;
    const price = typeof m?.price === "number" ? m.price : 0;
    return {
      ticker,
      name: m?.name ?? ticker,
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
