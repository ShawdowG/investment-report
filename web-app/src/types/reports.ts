// ─── Snapshot / raw data ─────────────────────────────────────────────────────

export interface PriceEntry {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
}

export interface MacroEntry {
  symbol: string;
  price: number;
  changePct: number;
}

export interface GammaSnapshot {
  v: number;
  generatedAt: string;
  date: string;
  slot: string;
  watchlist: string[];
  prices: Record<string, PriceEntry>;
  macro: Record<string, MacroEntry | null>;
}

// ─── Report markdown + search index ──────────────────────────────────────────

export type Slot = "eu" | "us-open" | "pre-close";

export interface ReportItem {
  date: string;          // YYYY-MM-DD
  slug: string;          // {date}-{slot}
  slot: Slot;
  title: string;
  regime: string;
  summary: string;
  tickers: string[];
  // SPEC-002 finish: structured payload emitted by scripts/build-index.js.
  // All optional so older index entries remain valid.
  mainDriver?: string;
  posture?: string;
  sections?: {
    gamma?: string[];
    alpha?: string[];
    beta?: string[];
    pulse?: string[];      // legacy: sourced from Section 0, usually empty
    checklist?: string[];  // current: sourced from Section 5 Unified Action Checklist
  };
  movers?: MoverEntry[];
  discussion?: {
    agreement: string;
    disagreement: string;
    resolution: string;
  };
  catalysts?: Record<string, string>;
}

export interface SearchIndex {
  generatedAt: string;
  items: ReportItem[];
}

// ─── Display types ─────────────────────────────────────────────────────────

export interface Mover {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  changeAbs: number;
}

/** Raw mover entry as emitted by scripts/build-index.js. Adapter normalises to Mover. */
export interface MoverEntry {
  ticker: string;
  name?: string;
  price?: string | number;
  pct?: number | null;
  change?: string | number | null;
  changeValue?: number | null;
  changeAbs?: number | null;
}

export interface NewsRow {
  ticker: string;
  displaySymbol: string;
  changePct: number;
  note: string;
}
