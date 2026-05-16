/**
 * SPEC-029 Layer A — Company info domain.
 *
 * Mirrors the `data/company/SYMBOL.json` artifact written by `scripts/fetch-quotes.py`
 * (W13.A). Every field is optional except the bookkeeping ones (`symbol`,
 * `generatedAt`) and the structured sub-objects (`metrics`, `analyst`,
 * `calendar`, `news`) which always default to empty containers. The loader and
 * UI handle absent fields gracefully — yfinance occasionally drops values for
 * smaller tickers and we don't want to crash the thesis page when that happens.
 *
 * SPEC-031 W15.B extends the type with two additional sub-objects —
 * `financials` (revenue / margin / FCF / balance-sheet summaries) and
 * `recommendations` (latest analyst rating change). Both are fully optional;
 * the Python pipeline (W15.A) writes them when yfinance returns the
 * underlying data and the loader / autofill helper tolerate their absence so
 * the page works even before the pipeline has been re-run.
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
  /**
   * SPEC-030 W14.B — extra Yahoo-style overview stats surfaced by the
   * Stock Overview card alongside the existing valuation rows. All three
   * remain optional so existing tickers (and macro indices) continue to
   * parse cleanly without these fields.
   */
  /** 5Y monthly beta (yfinance `info.beta`). */
  beta?: number;
  /** Trailing twelve-month EPS (yfinance `info.trailingEps`). */
  trailingEps?: number;
  /** ISO date — last ex-dividend date (yfinance `info.exDividendDate`). */
  exDividendDate?: string;
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

/**
 * SPEC-031 §5 — qualitative trend tag attached to a single metric. The Python
 * pipeline classifies a 5y series into one of three buckets so the thesis
 * autofill helper can render a one-word qualifier alongside the number.
 */
export type FinancialTrend = "expanding" | "stable" | "compressing";

/**
 * Single-metric block with a current value plus its 5y high/low and trend tag.
 * Used for operating margin today; extend to other ratios as the pipeline
 * widens.
 */
export interface FinancialMetric {
  latest?: number;
  fiveYearHigh?: number;
  fiveYearLow?: number;
  trend?: FinancialTrend;
}

/** Latest annual revenue plus YoY growth + 5y CAGR. */
export interface RevenueSummary {
  latestAnnual?: number;
  latestAnnualDate?: string;
  yoyPct?: number;
  cagr5y?: number;
}

/** Latest annual FCF plus 5y average + trend. */
export interface FreeCashFlowSummary {
  latestAnnual?: number;
  fiveYearAvg?: number;
  trend?: FinancialTrend;
}

/** Debt / cash / liquidity snapshot. */
export interface BalanceSheetSummary {
  totalDebt?: number;
  totalCash?: number;
  /** Positive ⇒ net cash; negative ⇒ net debt. */
  netCash?: number;
  currentRatio?: number;
}

/** Container for the four financial sub-summaries. All optional. */
export interface CompanyFinancials {
  revenue?: RevenueSummary;
  operatingMargin?: FinancialMetric;
  freeCashFlow?: FreeCashFlowSummary;
  balanceSheet?: BalanceSheetSummary;
}

/** Most recent analyst rating change captured by the pipeline. */
export type RecommendationChange = "upgrade" | "downgrade" | "init" | "reiterate";

export interface RecommendationsSummary {
  /** ISO datetime — when the rating change was published. */
  lastChangedAt?: string;
  lastChange?: RecommendationChange;
  lastFirm?: string;
  lastFromGrade?: string;
  lastToGrade?: string;
}

export interface CompanyInfo {
  symbol: string;
  /** ISO datetime — when the pipeline pulled this snapshot. */
  generatedAt: string;
  /** Company name from yfinance `longName` (falls back to `shortName`). */
  name?: string;
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
  /** SPEC-031 — revenue / margin / FCF / balance-sheet summaries. */
  financials?: CompanyFinancials;
  /** SPEC-031 — last analyst rating change. */
  recommendations?: RecommendationsSummary;
}
