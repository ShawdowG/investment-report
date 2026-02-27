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

export interface NewsRow {
  ticker: string;
  displaySymbol: string;
  changePct: number;
  note: string;
}
