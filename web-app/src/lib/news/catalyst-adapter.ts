import type { NewsAdapter, NewsItem } from "./types";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _latest = require("../../../../data/latest.json") as {
  date?: string;
  catalysts?: Record<string, string>;
};

export class CatalystAdapter implements NewsAdapter {
  readonly name = "report-catalyst";

  getNewsForTicker(symbol: string): NewsItem[] {
    const upper = symbol.toUpperCase();
    const catalysts = _latest.catalysts ?? {};
    const headline = catalysts[upper];
    if (!headline) return [];
    return [
      {
        ticker: upper,
        headline,
        source: this.name,
        confidence: 1,
        publishedAt: _latest.date,
      },
    ];
  }
}
