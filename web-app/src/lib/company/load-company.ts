import fs from "node:fs";
import path from "node:path";
import type {
  CompanyAnalyst,
  CompanyCalendar,
  CompanyInfo,
  CompanyMetrics,
  CompanyNewsItem,
} from "@/lib/domain/company";

/**
 * Server-side filesystem loader for `data/company/SYMBOL.json` artifacts
 * (SPEC-029 Layer A). Mirrors the pattern in `load-quote.ts`: resolves the repo
 * root from the `web-app/` cwd, lists symbols by reading the directory, and
 * returns `null` for missing or malformed files so callers can render a
 * placeholder.
 *
 * Important: the `data/company/` directory may not exist yet when the Python
 * pipeline (W13.A) hasn't been run. Both functions handle that gracefully.
 */

const ROOT = path.resolve(process.cwd(), "..");
const COMPANY_DIR = path.join(ROOT, "data", "company");

export function listCompanySymbols(): string[] {
  if (!fs.existsSync(COMPANY_DIR)) return [];
  try {
    return fs
      .readdirSync(COMPANY_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -5))
      .sort();
  } catch {
    return [];
  }
}

interface RawCompany {
  symbol?: unknown;
  generatedAt?: unknown;
  description?: unknown;
  industry?: unknown;
  sector?: unknown;
  country?: unknown;
  website?: unknown;
  employees?: unknown;
  city?: unknown;
  state?: unknown;
  metrics?: unknown;
  analyst?: unknown;
  calendar?: unknown;
  news?: unknown;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function coerceMetrics(raw: unknown): CompanyMetrics {
  const obj = asObject(raw);
  return {
    trailingPE: asNumber(obj.trailingPE),
    forwardPE: asNumber(obj.forwardPE),
    priceToBook: asNumber(obj.priceToBook),
    enterpriseToEbitda: asNumber(obj.enterpriseToEbitda),
    dividendYield: asNumber(obj.dividendYield),
    payoutRatio: asNumber(obj.payoutRatio),
    profitMargins: asNumber(obj.profitMargins),
    operatingMargins: asNumber(obj.operatingMargins),
    returnOnAssets: asNumber(obj.returnOnAssets),
    returnOnEquity: asNumber(obj.returnOnEquity),
    // SPEC-030 W14.B — extra Yahoo-style overview stats.
    beta: asNumber(obj.beta),
    trailingEps: asNumber(obj.trailingEps),
    exDividendDate: asString(obj.exDividendDate),
  };
}

function coerceAnalyst(raw: unknown): CompanyAnalyst {
  const obj = asObject(raw);
  return {
    recommendationMean: asNumber(obj.recommendationMean),
    targetMeanPrice: asNumber(obj.targetMeanPrice),
  };
}

function coerceCalendar(raw: unknown): CompanyCalendar {
  const obj = asObject(raw);
  return {
    earningsDate: asString(obj.earningsDate),
    lastFiscalYearEnd: asString(obj.lastFiscalYearEnd),
  };
}

function coerceNews(raw: unknown): CompanyNewsItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CompanyNewsItem[] = [];
  for (const item of raw) {
    const obj = asObject(item);
    const title = asString(obj.title);
    const publisher = asString(obj.publisher);
    const url = asString(obj.url);
    const publishedAt = asString(obj.publishedAt);
    if (!title || !publisher || !url || !publishedAt) continue;
    out.push({ title, publisher, url, publishedAt });
  }
  return out;
}

export function loadCompany(symbol: string): CompanyInfo | null {
  if (!fs.existsSync(COMPANY_DIR)) return null;
  const filePath = path.join(COMPANY_DIR, `${symbol}.json`);
  if (!fs.existsSync(filePath)) return null;
  let raw: RawCompany;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as RawCompany;
  } catch {
    return null;
  }
  const resolvedSymbol = asString(raw.symbol) ?? symbol.toUpperCase();
  const generatedAt = asString(raw.generatedAt) ?? "";
  return {
    symbol: resolvedSymbol,
    generatedAt,
    description: asString(raw.description),
    industry: asString(raw.industry),
    sector: asString(raw.sector),
    country: asString(raw.country),
    website: asString(raw.website),
    employees: asNumber(raw.employees),
    city: asString(raw.city),
    state: asString(raw.state),
    metrics: coerceMetrics(raw.metrics),
    analyst: coerceAnalyst(raw.analyst),
    calendar: coerceCalendar(raw.calendar),
    news: coerceNews(raw.news),
  };
}
