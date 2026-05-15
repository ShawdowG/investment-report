import type {
  Light,
  QuarterlyReview,
  QuarterlyReviewChanges,
  QuarterlyReviewInput,
  QuarterlyReviewThesisStatus,
  QuarterlyReviewUpdatedView,
} from "@/lib/domain/quarterly-review";
import { readJson, writeJson } from "@/lib/storage/local-storage";

const STORAGE_KEY = "quarterly_reviews";

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

function genId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.length > 0);
}

function coerceLight(raw: unknown): Light {
  if (raw === "green" || raw === "yellow" || raw === "red") return raw;
  return "yellow";
}

function coerceChanges(raw: unknown): QuarterlyReviewChanges {
  if (typeof raw !== "object" || raw === null) return {};
  const c = raw as Partial<QuarterlyReviewChanges>;
  const out: QuarterlyReviewChanges = {};
  if (typeof c.revenue === "string" && c.revenue) out.revenue = c.revenue;
  if (typeof c.margins === "string" && c.margins) out.margins = c.margins;
  if (typeof c.fcf === "string" && c.fcf) out.fcf = c.fcf;
  if (typeof c.guidance === "string" && c.guidance) out.guidance = c.guidance;
  if (typeof c.segmentGrowth === "string" && c.segmentGrowth) out.segmentGrowth = c.segmentGrowth;
  if (typeof c.productRoadmap === "string" && c.productRoadmap) out.productRoadmap = c.productRoadmap;
  if (typeof c.risks === "string" && c.risks) out.risks = c.risks;
  return out;
}

function coerceStatus(raw: unknown): QuarterlyReviewThesisStatus {
  if (typeof raw !== "object" || raw === null) {
    return { stronger: [], weaker: [], unchanged: [] };
  }
  const s = raw as Partial<QuarterlyReviewThesisStatus>;
  return {
    stronger: coerceStringArray(s.stronger),
    weaker: coerceStringArray(s.weaker),
    unchanged: coerceStringArray(s.unchanged),
  };
}

function coerceUpdatedView(raw: unknown): QuarterlyReviewUpdatedView {
  if (typeof raw !== "object" || raw === null) return {};
  const v = raw as Partial<QuarterlyReviewUpdatedView>;
  const out: QuarterlyReviewUpdatedView = {};
  if (typeof v.companyQuality === "string" && v.companyQuality) out.companyQuality = v.companyQuality;
  if (typeof v.valuation === "string" && v.valuation) out.valuation = v.valuation;
  if (typeof v.thesisStrength === "string" && v.thesisStrength) out.thesisStrength = v.thesisStrength;
  if (typeof v.averagingDownRisk === "string" && v.averagingDownRisk) out.averagingDownRisk = v.averagingDownRisk;
  if (typeof v.mostImportantNextCheck === "string" && v.mostImportantNextCheck) {
    out.mostImportantNextCheck = v.mostImportantNextCheck;
  }
  return out;
}

function coerceReview(raw: unknown): QuarterlyReview | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<QuarterlyReview>;
  if (typeof r.id !== "string" || !r.id) return null;
  if (typeof r.thesisSymbol !== "string" || !r.thesisSymbol) return null;
  if (typeof r.quarterLabel !== "string") return null;
  if (typeof r.createdAt !== "string") return null;
  return {
    id: r.id,
    thesisSymbol: normalizeSymbol(r.thesisSymbol),
    quarterLabel: r.quarterLabel,
    createdAt: r.createdAt,
    changes: coerceChanges(r.changes),
    thesisStatus: coerceStatus(r.thesisStatus),
    light: coerceLight(r.light),
    lightWhy: typeof r.lightWhy === "string" ? r.lightWhy : "",
    nextReportWatch: coerceStringArray(r.nextReportWatch),
    updatedView: coerceUpdatedView(r.updatedView),
  };
}

function readAll(): QuarterlyReview[] {
  const raw = readJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  const out: QuarterlyReview[] = [];
  for (const entry of raw) {
    const review = coerceReview(entry);
    if (review) out.push(review);
  }
  return out;
}

function writeAll(items: QuarterlyReview[]): void {
  const ok = writeJson(STORAGE_KEY, items);
  if (!ok) {
    throw new Error("localStorage write returned false (quota or unavailable)");
  }
}

function sortByCreatedDesc(items: QuarterlyReview[]): QuarterlyReview[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listQuarterlyReviews(): QuarterlyReview[] {
  return sortByCreatedDesc(readAll());
}

export function listByThesis(symbol: string): QuarterlyReview[] {
  const sym = normalizeSymbol(symbol);
  if (!sym) return [];
  return sortByCreatedDesc(readAll().filter((r) => r.thesisSymbol === sym));
}

export function getReview(id: string): QuarterlyReview | null {
  if (!id) return null;
  return readAll().find((r) => r.id === id) ?? null;
}

export function createReview(input: QuarterlyReviewInput): QuarterlyReview {
  const all = readAll();
  const now = new Date().toISOString();
  const next: QuarterlyReview = {
    ...input,
    id: genId(),
    createdAt: now,
    thesisSymbol: normalizeSymbol(input.thesisSymbol),
  };
  try {
    writeAll([next, ...all]);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create quarterly review: ${reason}`);
  }
  return next;
}

export function deleteReview(id: string): void {
  if (!id) return;
  const all = readAll();
  const next = all.filter((r) => r.id !== id);
  if (next.length === all.length) return;
  try {
    writeAll(next);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to delete quarterly review ${id}: ${reason}`);
  }
}

// SPEC-016: compile-time conformance check vs the contract.
import type { QuarterlyReviewRepository } from "./contracts";
const _conforms: QuarterlyReviewRepository = {
  list: listQuarterlyReviews,
  listByThesis,
  get: getReview,
  create: createReview,
  remove: deleteReview,
};
void _conforms;
