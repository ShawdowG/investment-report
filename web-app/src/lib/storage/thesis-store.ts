import type {
  ClassifiedThesisPoint,
  Concerns,
  FundamentalsSnapshot,
  Light,
  MarketPositionNotes,
  ResearchNote,
  Scenario,
  ScenarioKind,
  Thesis,
  TradeLevel,
  ValuationNotes,
} from "@/lib/domain/thesis";
import {
  GREEN_CHECK_COUNT,
  RED_CHECK_COUNT,
  SCENARIO_KINDS,
  TRIM_SELL_CHECK_COUNT,
  YELLOW_CHECK_COUNT,
  defaultScenarios,
  emptyChecks,
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

function coerceFundamentals(raw: unknown): FundamentalsSnapshot {
  if (typeof raw !== "object" || raw === null) return {};
  const f = raw as Partial<FundamentalsSnapshot>;
  const out: FundamentalsSnapshot = {};
  if (typeof f.revenueGrowth === "string" && f.revenueGrowth) out.revenueGrowth = f.revenueGrowth;
  if (typeof f.margins === "string" && f.margins) out.margins = f.margins;
  if (typeof f.fcf === "string" && f.fcf) out.fcf = f.fcf;
  if (typeof f.balanceSheet === "string" && f.balanceSheet) out.balanceSheet = f.balanceSheet;
  if (typeof f.segmentGrowth === "string" && f.segmentGrowth) out.segmentGrowth = f.segmentGrowth;
  if (typeof f.guidance === "string" && f.guidance) out.guidance = f.guidance;
  if (typeof f.capitalAllocation === "string" && f.capitalAllocation) {
    out.capitalAllocation = f.capitalAllocation;
  }
  return out;
}

function coerceMarketPosition(raw: unknown): MarketPositionNotes {
  if (typeof raw !== "object" || raw === null) return {};
  const m = raw as Partial<MarketPositionNotes>;
  const out: MarketPositionNotes = {};
  if (typeof m.realCompetition === "string" && m.realCompetition) out.realCompetition = m.realCompetition;
  if (typeof m.dominanceToday === "string" && m.dominanceToday) out.dominanceToday = m.dominanceToday;
  if (typeof m.durability === "string" && m.durability) out.durability = m.durability;
  if (typeof m.newMarkets === "string" && m.newMarkets) out.newMarkets = m.newMarkets;
  if (typeof m.newAreasProven === "string" && m.newAreasProven) out.newAreasProven = m.newAreasProven;
  return out;
}

function coerceValuation(raw: unknown): ValuationNotes {
  if (typeof raw !== "object" || raw === null) return {};
  const v = raw as Partial<ValuationNotes>;
  const out: ValuationNotes = {};
  if (typeof v.metricsTracked === "string" && v.metricsTracked) out.metricsTracked = v.metricsTracked;
  if (typeof v.growthAssumed === "string" && v.growthAssumed) out.growthAssumed = v.growthAssumed;
  if (typeof v.marginAssumed === "string" && v.marginAssumed) out.marginAssumed = v.marginAssumed;
  if (typeof v.multipleAssumed === "string" && v.multipleAssumed) out.multipleAssumed = v.multipleAssumed;
  if (typeof v.notes === "string" && v.notes) out.notes = v.notes;
  return out;
}

function isScenarioKind(value: unknown): value is ScenarioKind {
  return (
    value === "worst" ||
    value === "bear" ||
    value === "base" ||
    value === "better" ||
    value === "moonshot"
  );
}

function coerceScenarios(raw: unknown): Scenario[] {
  // Always materialise the canonical 5-row layout. If the stored value has any
  // matching kinds we merge their fields in; missing kinds get a blank stub.
  const stubs = defaultScenarios();
  if (!Array.isArray(raw)) return stubs;
  const byKind = new Map<ScenarioKind, Partial<Scenario>>();
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const s = entry as Partial<Scenario>;
    if (!isScenarioKind(s.kind)) continue;
    byKind.set(s.kind, s);
  }
  return stubs.map((stub) => {
    const merged = byKind.get(stub.kind);
    if (!merged) return stub;
    const out: Scenario = { kind: stub.kind };
    if (typeof merged.businessAssumptions === "string" && merged.businessAssumptions) {
      out.businessAssumptions = merged.businessAssumptions;
    }
    if (typeof merged.valuationAssumptions === "string" && merged.valuationAssumptions) {
      out.valuationAssumptions = merged.valuationAssumptions;
    }
    if (typeof merged.priceTarget === "number" && Number.isFinite(merged.priceTarget)) {
      out.priceTarget = merged.priceTarget;
    }
    if (typeof merged.probability === "number" && Number.isFinite(merged.probability)) {
      out.probability = Math.max(0, Math.min(100, merged.probability));
    }
    if (typeof merged.meaning === "string" && merged.meaning) {
      out.meaning = merged.meaning;
    }
    return out;
  });
}

function coerceLight(raw: unknown): Light {
  if (raw === "green" || raw === "yellow" || raw === "red") return raw;
  return "yellow";
}

function coerceBoolArray(raw: unknown, length: number): boolean[] {
  const out = emptyChecks(length);
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < length; i += 1) {
    out[i] = Boolean(raw[i]);
  }
  return out;
}

function coerceNotes(raw: unknown): ResearchNote[] {
  if (!Array.isArray(raw)) return [];
  const out: ResearchNote[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const n = entry as Partial<ResearchNote>;
    if (typeof n.id !== "string" || !n.id) continue;
    if (typeof n.title !== "string") continue;
    if (typeof n.body !== "string") continue;
    if (typeof n.createdAt !== "string" || !n.createdAt) continue;
    const note: ResearchNote = {
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
    };
    if (typeof n.updatedAt === "string" && n.updatedAt) {
      note.updatedAt = n.updatedAt;
    }
    out.push(note);
  }
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
  // Spread the raw entry first so any extra fields survive untouched.
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
    fundamentals: coerceFundamentals(candidate.fundamentals),
    marketPosition: coerceMarketPosition(candidate.marketPosition),
    coreDrivers: coerceStringArray(candidate.coreDrivers),
    optionalDrivers: coerceStringArray(candidate.optionalDrivers),
    valuation: coerceValuation(candidate.valuation),
    scenarios: coerceScenarios(candidate.scenarios),
    currentLight: coerceLight(candidate.currentLight),
    greenChecks: coerceBoolArray(candidate.greenChecks, GREEN_CHECK_COUNT),
    yellowChecks: coerceBoolArray(candidate.yellowChecks, YELLOW_CHECK_COUNT),
    redChecks: coerceBoolArray(candidate.redChecks, RED_CHECK_COUNT),
    trimSellChecks: coerceBoolArray(candidate.trimSellChecks, TRIM_SELL_CHECK_COUNT),
    notes: coerceNotes(candidate.notes),
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
  if (typeof candidate.analysisNotes === "string" && candidate.analysisNotes) {
    next.analysisNotes = candidate.analysisNotes;
  } else {
    delete next.analysisNotes;
  }
  // Touch SCENARIO_KINDS to keep the import live (used implicitly by coerceScenarios).
  void SCENARIO_KINDS;
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
