export interface QuoteDelta {
  abs: number;
  pct: number;
}

export interface QuoteSnapshot {
  symbol: string;
  lastClose: number;
  dayDelta: QuoteDelta | null;
  currency: string;
  name?: string;
  sector?: string;
  asOf: string;
  generatedAt?: string;
}

export type QuoteSnapshotMap = Record<string, QuoteSnapshot>;

export interface CompactBar {
  date: string;
  close: number;
}

export type CompactDailyMap = Record<string, CompactBar[]>;
