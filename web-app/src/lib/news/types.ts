export interface NewsItem {
  ticker: string;
  headline: string;
  source: string;
  confidence: number;
  publishedAt?: string;
  sourceUrl?: string;
}

export interface NewsAdapter {
  readonly name: string;
  getNewsForTicker(symbol: string): NewsItem[];
}
