/**
 * SPEC-029 Layer A — Company info domain.
 *
 * Mirrors the `data/company/SYMBOL.json` artifact written by `scripts/fetch-quotes.py`
 * (W13.A). Every field is optional except the bookkeeping ones (`symbol`,
 * `generatedAt`) and the structured sub-objects (`metrics`, `analyst`,
 * `calendar`, `news`) which always default to empty containers. The loader and
 * UI handle absent fields gracefully — yfinance occasionally drops values for
 * smaller tickers and we don't want to crash the thesis page when that happens.
 */

export interface CompanyMetrics {
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  enterpriseToEbitda?: number;
  dividendYield?: number;
  payoutRatio?: number;
  profitMargins?: number;
  operatingMargins?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
}

export interface CompanyAnalyst {
  /** 1.0 = strong buy, 5.0 = strong sell (yfinance scale). */
  recommendationMean?: number;
  targetMeanPrice?: number;
}

export interface CompanyCalendar {
  /** ISO date — next earnings call. */
  earningsDate?: string;
  /** ISO date — last fiscal year end. */
  lastFiscalYearEnd?: string;
}

export interface CompanyNewsItem {
  title: string;
  publisher: string;
  url: string;
  /** ISO datetime — when the article was published. */
  publishedAt: string;
}

export interface CompanyInfo {
  symbol: string;
  /** ISO datetime — when the pipeline pulled this snapshot. */
  generatedAt: string;
  description?: string;
  industry?: string;
  sector?: string;
  country?: string;
  website?: string;
  employees?: number;
  city?: string;
  state?: string;
  metrics: CompanyMetrics;
  analyst: CompanyAnalyst;
  calendar: CompanyCalendar;
  news: CompanyNewsItem[];
}
