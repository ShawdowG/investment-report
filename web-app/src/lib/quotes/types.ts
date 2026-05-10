export interface QuoteMeta {
  generatedAt: string;
  name?: string;
  currency?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
}

export interface QuoteBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface QuoteSeries {
  symbol: string;
  meta: QuoteMeta;
  daily: QuoteBar[];
}
