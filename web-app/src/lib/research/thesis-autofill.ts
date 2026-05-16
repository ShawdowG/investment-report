/**
 * SPEC-031 W15.B — Deterministic thesis autofill helper.
 *
 * Given a `CompanyInfo` payload (from `data/company/SYMBOL.json`) and the
 * matching `QuoteSnapshot`, the helper produces a sparse `Thesis` patch
 * (`ThesisSuggestion`) the UI can render as a diff-preview and apply selectively.
 *
 * The output is intentionally prose-shaped — it mirrors the format the user
 * would type by hand into the deep-dive fields. Nothing here calls an LLM;
 * every line follows a fixed template against the pipeline data so the result
 * is reproducible and unit-testable. Each field is independently guarded
 * against absent data, so the helper degrades gracefully on tickers whose
 * yfinance payload is incomplete (W15.A still has to ingest them before the
 * counts climb).
 *
 * The thesis form mounts this through {@link ThesisAutofillPanel} (W15.C),
 * which sits next to the "Copy to ChatGPT" button on the deep-dive form.
 */

import type { CompanyInfo, FinancialTrend } from "@/lib/domain/company";
import type {
  Concerns,
  FundamentalsSnapshot,
  MarketPositionNotes,
  Scenario,
  ValuationNotes,
} from "@/lib/domain/thesis";
import type { QuoteSnapshot } from "@/lib/quotes/snapshots";
import { fmtMoney, fmtPct } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface ThesisSuggestion {
  thesisPoints?: string[];
  concerns?: Partial<Concerns>;
  fundamentals?: Partial<FundamentalsSnapshot>;
  marketPosition?: Partial<MarketPositionNotes>;
  valuation?: Partial<ValuationNotes>;
  scenarios?: Partial<Scenario>[];
  questions?: string[];
}

export interface SuggestionReport {
  parsed: ThesisSuggestion;
  /** How many fields the helper actually filled. */
  matchedFieldCount: number;
  /** How many fields the helper considers (constant). */
  totalFieldCount: number;
  /**
   * Soft warnings — empty for the v1 since every field is data-gated by
   * absence rather than by validation. Kept so the report shape mirrors the
   * existing import-panel pattern.
   */
  warnings: string[];
}

/**
 * Sentinel length the helper inspects — keeps the matched / total ratio
 * stable across calls regardless of how much data the company actually has.
 * Update whenever a new suggestion is added below.
 */
const TOTAL_FIELDS = 12;

/* ------------------------------------------------------------------ */
/* Tiny prose helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Truncate a paragraph to one sentence (or 200 chars, whichever wins). The
 * description field is sometimes a wall of marketing prose — we want a
 * short factual snippet the user can refine.
 */
function firstSentence(text: string, maxLen = 200): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentenceEnd = trimmed.search(/\.\s/);
  if (sentenceEnd >= 0 && sentenceEnd + 1 <= maxLen) {
    return trimmed.slice(0, sentenceEnd + 1);
  }
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen).trimEnd()}…`;
}

function trendLabel(trend: FinancialTrend | undefined): string {
  switch (trend) {
    case "expanding":
      return "expanding";
    case "compressing":
      return "compressing";
    case "stable":
      return "stable";
    default:
      return "";
  }
}

/**
 * yfinance's `recommendationMean` is a 1.0 (strong buy) to 5.0 (strong sell)
 * scale. Map to a human label so the autofill prose reads naturally.
 */
function recommendationLabel(mean: number): string {
  if (mean <= 1.5) return "Strong buy";
  if (mean <= 2.5) return "Buy";
  if (mean <= 3.5) return "Hold";
  if (mean <= 4.5) return "Sell";
  return "Strong sell";
}

/** "+12.34%" / "−1.20%" — wrapper so we get the signed % style consistently. */
function pct(value: number, decimals = 1): string {
  return fmtPct(value, decimals);
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/* ------------------------------------------------------------------ */
/* Field builders                                                     */
/* ------------------------------------------------------------------ */

function suggestDominanceToday(company: CompanyInfo): string | undefined {
  if (!company.description) return undefined;
  const sentence = firstSentence(company.description, 200);
  return sentence || undefined;
}

function suggestRealCompetition(company: CompanyInfo): string | undefined {
  if (!company.sector || !company.industry) return undefined;
  return `Sector: ${company.sector}. Industry: ${company.industry}.`;
}

function suggestRevenueGrowth(company: CompanyInfo, currency: string): string | undefined {
  const revenue = company.financials?.revenue;
  if (!revenue) return undefined;
  if (!isFiniteNumber(revenue.latestAnnual) || !isFiniteNumber(revenue.yoyPct)) return undefined;
  const parts = [
    `Revenue ${fmtMoney(revenue.latestAnnual, currency)} YoY ${pct(revenue.yoyPct)}.`,
  ];
  if (isFiniteNumber(revenue.cagr5y)) {
    parts.push(`5y CAGR ${pct(revenue.cagr5y)}.`);
  }
  return parts.join(" ");
}

function suggestMargins(company: CompanyInfo): string | undefined {
  const margin = company.financials?.operatingMargin;
  if (!margin) return undefined;
  if (!isFiniteNumber(margin.latest)) return undefined;
  const latest = margin.latest * 100;
  let line = `Op margin ${pct(latest)}`;
  const trend = trendLabel(margin.trend);
  if (trend) line += ` (${trend})`;
  if (isFiniteNumber(margin.fiveYearLow) && isFiniteNumber(margin.fiveYearHigh)) {
    const low = margin.fiveYearLow * 100;
    const high = margin.fiveYearHigh * 100;
    line += `; range ${pct(low)} – ${pct(high)}`;
  }
  return `${line}.`;
}

function suggestFcf(company: CompanyInfo, currency: string): string | undefined {
  const fcf = company.financials?.freeCashFlow;
  if (!fcf) return undefined;
  if (!isFiniteNumber(fcf.latestAnnual)) return undefined;
  const parts = [`TTM FCF ${fmtMoney(fcf.latestAnnual, currency)}`];
  if (isFiniteNumber(fcf.fiveYearAvg)) {
    parts.push(`5y avg ${fmtMoney(fcf.fiveYearAvg, currency)}`);
  }
  const trend = trendLabel(fcf.trend);
  if (trend) parts.push(`(${trend})`);
  return `${parts.join("; ")}.`;
}

function suggestBalanceSheet(company: CompanyInfo, currency: string): string | undefined {
  const bs = company.financials?.balanceSheet;
  if (!bs) return undefined;
  const pieces: string[] = [];
  if (isFiniteNumber(bs.netCash)) {
    if (bs.netCash >= 0) {
      pieces.push(`Net cash ${fmtMoney(bs.netCash, currency)}`);
    } else {
      pieces.push(`Net debt ${fmtMoney(Math.abs(bs.netCash), currency)}`);
    }
  }
  if (isFiniteNumber(bs.currentRatio)) {
    pieces.push(`Current ratio ${bs.currentRatio.toFixed(2)}`);
  }
  if (pieces.length === 0) return undefined;
  return `${pieces.join("; ")}.`;
}

function suggestGuidance(company: CompanyInfo): string | undefined {
  const earnings = company.calendar?.earningsDate;
  if (!earnings) return undefined;
  return `Next earnings: ${earnings}. Watch: revenue, margins, guidance.`;
}

function suggestMetricsTracked(company: CompanyInfo): string | undefined {
  const m = company.metrics;
  const parts: string[] = [];
  if (isFiniteNumber(m.trailingPE)) parts.push(`P/E (TTM) ${m.trailingPE.toFixed(1)}`);
  if (isFiniteNumber(m.forwardPE)) parts.push(`Forward P/E ${m.forwardPE.toFixed(1)}`);
  if (isFiniteNumber(m.priceToBook)) parts.push(`P/B ${m.priceToBook.toFixed(1)}`);
  if (isFiniteNumber(m.enterpriseToEbitda)) parts.push(`EV/EBITDA ${m.enterpriseToEbitda.toFixed(1)}`);
  if (parts.length === 0) return undefined;
  return parts.join("; ");
}

function suggestValuationNotes(
  company: CompanyInfo,
  snapshot: QuoteSnapshot | undefined,
  currency: string,
): string | undefined {
  const analyst = company.analyst;
  const recMean = analyst.recommendationMean;
  const target = analyst.targetMeanPrice;
  if (!isFiniteNumber(recMean) && !isFiniteNumber(target)) return undefined;
  const parts: string[] = [];
  if (isFiniteNumber(recMean)) {
    parts.push(`Analyst consensus: ${recommendationLabel(recMean)} (${recMean.toFixed(1)}).`);
  }
  if (isFiniteNumber(target)) {
    let line = `1Y target ${fmtMoney(target, currency)}`;
    if (snapshot && isFiniteNumber(snapshot.lastClose) && snapshot.lastClose > 0) {
      const delta = ((target - snapshot.lastClose) / snapshot.lastClose) * 100;
      line += ` (${pct(delta)} vs current)`;
    }
    parts.push(`${line}.`);
  }
  return parts.join(" ");
}

function suggestBaseScenario(
  company: CompanyInfo,
  currency: string,
): Partial<Scenario> | undefined {
  void currency;
  const target = company.analyst.targetMeanPrice;
  if (!isFiniteNumber(target)) return undefined;
  return {
    kind: "base",
    priceTarget: target,
    businessAssumptions: "Management delivers consensus; mid-cycle margins hold",
  };
}

function suggestQuestions(company: CompanyInfo): string[] | undefined {
  const out: string[] = [];
  const revenue = company.financials?.revenue;
  if (revenue && isFiniteNumber(revenue.yoyPct)) {
    out.push(`Will next quarter's revenue track ${pct(revenue.yoyPct)}?`);
  }
  const margin = company.financials?.operatingMargin;
  if (margin && isFiniteNumber(margin.latest)) {
    out.push(`Can margins hold above ${pct(margin.latest * 100)}?`);
  }
  const bs = company.financials?.balanceSheet;
  const hasBs =
    bs && (isFiniteNumber(bs.netCash) || isFiniteNumber(bs.totalCash) || isFiniteNumber(bs.totalDebt));
  if (hasBs) {
    out.push("Capital allocation: buybacks vs M&A?");
  }
  return out.length > 0 ? out : undefined;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */

/**
 * Build a sparse `ThesisSuggestion` from whatever data the pipeline has on
 * disk for `company`. Pure function — no I/O, no side effects. Safe to call
 * from server components (e.g. ticker pages) or directly from the thesis
 * form on the client.
 *
 * Each field's suggestion is dropped if its required source data is absent;
 * the result is therefore the maximally helpful patch the user can apply
 * piecemeal via the diff preview.
 */
export function suggestFromData(
  company: CompanyInfo | null,
  snapshot: QuoteSnapshot | undefined,
): SuggestionReport {
  const empty: SuggestionReport = {
    parsed: {},
    matchedFieldCount: 0,
    totalFieldCount: TOTAL_FIELDS,
    warnings: [],
  };
  if (!company) return empty;

  const currency = snapshot?.currency ?? "USD";

  // Market position — two distinct fields.
  const marketPosition: Partial<MarketPositionNotes> = {};
  const dominance = suggestDominanceToday(company);
  if (dominance) marketPosition.dominanceToday = dominance;
  const competition = suggestRealCompetition(company);
  if (competition) marketPosition.realCompetition = competition;

  // Fundamentals — five distinct fields.
  const fundamentals: Partial<FundamentalsSnapshot> = {};
  const revenueGrowth = suggestRevenueGrowth(company, currency);
  if (revenueGrowth) fundamentals.revenueGrowth = revenueGrowth;
  const margins = suggestMargins(company);
  if (margins) fundamentals.margins = margins;
  const fcf = suggestFcf(company, currency);
  if (fcf) fundamentals.fcf = fcf;
  const balanceSheet = suggestBalanceSheet(company, currency);
  if (balanceSheet) fundamentals.balanceSheet = balanceSheet;
  const guidance = suggestGuidance(company);
  if (guidance) fundamentals.guidance = guidance;

  // Valuation — two distinct fields.
  const valuation: Partial<ValuationNotes> = {};
  const metricsTracked = suggestMetricsTracked(company);
  if (metricsTracked) valuation.metricsTracked = metricsTracked;
  const valuationNotes = suggestValuationNotes(company, snapshot, currency);
  if (valuationNotes) valuation.notes = valuationNotes;

  // Scenarios — only the base case, only if we have a price target.
  const scenarios: Partial<Scenario>[] = [];
  const baseScenario = suggestBaseScenario(company, currency);
  if (baseScenario) scenarios.push(baseScenario);

  // Questions — counted as one slot regardless of how many fire.
  const questions = suggestQuestions(company);

  const parsed: ThesisSuggestion = {};
  if (Object.keys(marketPosition).length > 0) parsed.marketPosition = marketPosition;
  if (Object.keys(fundamentals).length > 0) parsed.fundamentals = fundamentals;
  if (Object.keys(valuation).length > 0) parsed.valuation = valuation;
  if (scenarios.length > 0) parsed.scenarios = scenarios;
  if (questions) parsed.questions = questions;

  const matchedFieldCount = countMatchedFields(parsed);

  return {
    parsed,
    matchedFieldCount,
    totalFieldCount: TOTAL_FIELDS,
    warnings: [],
  };
}

/**
 * Count individual non-empty fields in a suggestion. Each populated sub-key
 * counts once; the questions array counts once regardless of length; the
 * scenarios array counts once per scenario kind (we only ever emit "base"
 * today). Matches the labels the diff-preview panel renders so the summary
 * counter aligns with the row count shown to the user.
 */
export function countMatchedFields(parsed: ThesisSuggestion): number {
  let count = 0;
  if (parsed.marketPosition) count += Object.keys(parsed.marketPosition).length;
  if (parsed.fundamentals) count += Object.keys(parsed.fundamentals).length;
  if (parsed.valuation) count += Object.keys(parsed.valuation).length;
  if (parsed.scenarios) count += parsed.scenarios.length;
  if (parsed.questions && parsed.questions.length > 0) count += 1;
  if (parsed.concerns) count += Object.keys(parsed.concerns).length;
  if (parsed.thesisPoints && parsed.thesisPoints.length > 0) count += 1;
  return count;
}
