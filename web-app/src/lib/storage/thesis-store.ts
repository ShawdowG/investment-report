import type {
  ClassifiedThesisPoint,
  Concerns,
  Thesis,
  TradeLevel,
} from "@/lib/domain/thesis";
import { readJson, writeJson } from "@/lib/storage/local-storage";

const STORAGE_KEY = "theses";

type ThesesMap = Record<string, Thesis>;

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

function coerceClassifiedPoints(raw: unknown): ClassifiedThesisPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: ClassifiedThesisPoint[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const c = entry as Partial<ClassifiedThesisPoint>;
    if (typeof c.point !== "string") continue;
    if (c.type !== "core" && c.type !== "optional" && c.type !== "valuation" && c.type !== "risk") {
      continue;
    }
    out.push({
      point: c.point,
      type: c.type,
      needsProof: Boolean(c.needsProof),
    });
  }
  return out;
}

function coerceTradeLevels(raw: unknown): TradeLevel[] {
  if (!Array.isArray(raw)) return [];
  const out: TradeLevel[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const t = entry as Partial<TradeLevel>;
    if (t.kind !== "add" && t.kind !== "trim" && t.kind !== "sell") continue;
    if (typeof t.price !== "number" || !Number.isFinite(t.price)) continue;
    const level = t.level === 1 || t.level === 2 || t.level === 3 ? t.level : undefined;
    out.push({
      kind: t.kind,
      price: t.price,
      ...(level !== undefined ? { level } : {}),
      ...(typeof t.note === "string" && t.note ? { note: t.note } : {}),
    });
  }
  return out;
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string");
}

function coerceConcerns(raw: unknown): Concerns {
  if (typeof raw !== "object" || raw === null) return {};
  const c = raw as Partial<Concerns>;
  const out: Concerns = {};
  if (typeof c.valuation === "string" && c.valuation) out.valuation = c.valuation;
  if (typeof c.competition === "string" && c.competition) out.competition = c.competition;
  if (typeof c.macro === "string" && c.macro) out.macro = c.macro;
  if (typeof c.execution === "string" && c.execution) out.execution = c.execution;
  if (typeof c.other === "string" && c.other) out.other = c.other;
  return out;
}

function coerceThesis(raw: unknown): Thesis | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Partial<Thesis> & { [key: string]: unknown };
  if (typeof candidate.symbol !== "string") return null;
  const symbol = normalizeSymbol(candidate.symbol);
  if (!symbol) return null;
  if (typeof candidate.createdAt !== "string" || typeof candidate.updatedAt !== "string") {
    return null;
  }
  // Spread the raw entry first so W8.B-L extra fields survive untouched.
  const next: Thesis = {
    ...(candidate as Thesis),
    symbol,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    thesisPoints: coerceStringArray(candidate.thesisPoints),
    questions: coerceStringArray(candidate.questions),
    concerns: coerceConcerns(candidate.concerns),
    classifiedPoints: coerceClassifiedPoints(candidate.classifiedPoints),
    tradeLevels: coerceTradeLevels(candidate.tradeLevels),
  };
  if (typeof candidate.currentPriceAtCreation === "number" && Number.isFinite(candidate.currentPriceAtCreation)) {
    next.currentPriceAtCreation = candidate.currentPriceAtCreation;
  } else {
    delete next.currentPriceAtCreation;
  }
  if (typeof candidate.avgEntryPrice === "number" && Number.isFinite(candidate.avgEntryPrice)) {
    next.avgEntryPrice = candidate.avgEntryPrice;
  } else {
    delete next.avgEntryPrice;
  }
  if (typeof candidate.positionSize === "number" && Number.isFinite(candidate.positionSize)) {
    next.positionSize = candidate.positionSize;
  } else {
    delete next.positionSize;
  }
  if (typeof candidate.maxPositionSize === "number" && Number.isFinite(candidate.maxPositionSize)) {
    next.maxPositionSize = candidate.maxPositionSize;
  } else {
    delete next.maxPositionSize;
  }
  if (typeof candidate.timeHorizon === "string" && candidate.timeHorizon) {
    next.timeHorizon = candidate.timeHorizon;
  } else {
    delete next.timeHorizon;
  }
  if (
    candidate.plannedAction === "hold" ||
    candidate.plannedAction === "add" ||
    candidate.plannedAction === "trim" ||
    candidate.plannedAction === "sell" ||
    candidate.plannedAction === "watch"
  ) {
    next.plannedAction = candidate.plannedAction;
  } else {
    delete next.plannedAction;
  }
  return next;
}

function readMap(): ThesesMap {
  const raw = readJson<unknown>(STORAGE_KEY, {});
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: ThesesMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const thesis = coerceThesis(value);
    if (!thesis) continue;
    const sym = normalizeSymbol(thesis.symbol || key);
    if (!sym) continue;
    out[sym] = { ...thesis, symbol: sym };
  }
  return out;
}

function writeMap(map: ThesesMap): void {
  const ok = writeJson(STORAGE_KEY, map);
  if (!ok) {
    throw new Error("localStorage write returned false (quota or unavailable)");
  }
}

export function getTheses(): ThesesMap {
  return readMap();
}

export function getThesis(symbol: string): Thesis | null {
  const sym = normalizeSymbol(symbol);
  if (!sym) return null;
  const map = readMap();
  return map[sym] ?? null;
}

export function upsertThesis(thesis: Thesis): Thesis {
  const sym = normalizeSymbol(thesis.symbol);
  if (!sym) {
    throw new Error("Failed to upsert thesis: symbol is required");
  }
  const map = readMap();
  const existing = map[sym];
  const now = new Date().toISOString();
  const next: Thesis = {
    ...thesis,
    symbol: sym,
    createdAt: existing?.createdAt ?? thesis.createdAt ?? now,
    updatedAt: now,
  };
  map[sym] = next;
  try {
    writeMap(map);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to upsert thesis for ${sym}: ${reason}`);
  }
  return next;
}

export function deleteThesis(symbol: string): void {
  const sym = normalizeSymbol(symbol);
  if (!sym) return;
  const map = readMap();
  if (!(sym in map)) return;
  delete map[sym];
  try {
    writeMap(map);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to delete thesis for ${sym}: ${reason}`);
  }
}

// SPEC-016: compile-time conformance check vs the contract.
import type { ThesisRepository } from "./contracts";
const _conforms: ThesisRepository = {
  list: getTheses,
  get: getThesis,
  upsert: upsertThesis,
  remove: deleteThesis,
};
void _conforms;
