/**
 * SPEC-023 thesis domain.
 *
 * W8.A shipped the minimal slice (§1 input + §2 classification + §1/§8 trade
 * plan). W8.B + W8.C + W8.D + W8.L extend the type with the deep-dive sections
 * (§4 fundamentals, §5 market position, §6 valuation, §7 scenarios, §8 light /
 * checklists, §10 analysis notes, attached notes).
 *
 * The store deliberately tolerates extra fields on read (see `thesis-store`)
 * so subsequent workstreams can grow the type without a migration step.
 */

export type PlannedAction = "hold" | "add" | "trim" | "sell" | "watch";
export type TradeLevelKind = "add" | "trim" | "sell";
export type ClassifiedPointType = "core" | "optional" | "valuation" | "risk";
export type Light = "green" | "yellow" | "red";
export type ScenarioKind = "worst" | "bear" | "base" | "better" | "moonshot";

export interface ClassifiedThesisPoint {
  point: string;
  type: ClassifiedPointType;
  needsProof: boolean;
}

export interface TradeLevel {
  kind: TradeLevelKind;
  price: number;
  /** Tranche number for "add" levels following the framework's 3-tranche pattern. */
  level?: 1 | 2 | 3;
  note?: string;
  /**
   * SPEC-026 W10.A — ISO date (YYYY-MM-DD) of the last time today's close was
   * within `thesisProximityPct` of this level. Written client-side by the
   * dashboard's CrossedZonesCard; persists across refreshes so the user can
   * still see "Add L1 was crossed 2026-04-12" even after price recovers.
   */
  lastCrossedAt?: string;
}

export interface Concerns {
  valuation?: string;
  competition?: string;
  macro?: string;
  execution?: string;
  other?: string;
}

export interface FundamentalsSnapshot {
  revenueGrowth?: string;
  margins?: string;
  fcf?: string;
  balanceSheet?: string;
  segmentGrowth?: string;
  guidance?: string;
  capitalAllocation?: string;
}

export interface MarketPositionNotes {
  realCompetition?: string;
  dominanceToday?: string;
  durability?: string;
  newMarkets?: string;
  newAreasProven?: string;
}

export interface ValuationNotes {
  metricsTracked?: string;
  growthAssumed?: string;
  marginAssumed?: string;
  multipleAssumed?: string;
  notes?: string;
}

export interface Scenario {
  kind: ScenarioKind;
  businessAssumptions?: string;
  valuationAssumptions?: string;
  priceTarget?: number;
  probability?: number; // 0..100
  meaning?: string;
}

export interface ResearchNote {
  id: string;
  title: string;
  body: string; // markdown
  createdAt: string;
  updatedAt?: string;
}

export const SCENARIO_KINDS: ScenarioKind[] = [
  "worst",
  "bear",
  "base",
  "better",
  "moonshot",
];

export const GREEN_CHECK_COUNT = 9;
export const YELLOW_CHECK_COUNT = 6;
export const RED_CHECK_COUNT = 8;
export const TRIM_SELL_CHECK_COUNT = 6;

export interface Thesis {
  symbol: string;
  createdAt: string;
  updatedAt: string;

  // §1 Input snapshot
  currentPriceAtCreation?: number;
  avgEntryPrice?: number;
  positionSize?: number;
  timeHorizon?: string;
  plannedAction?: PlannedAction;

  // §1 Narrative
  thesisPoints: string[];
  concerns: Concerns;
  questions: string[];

  // §2 Classification — array of typed thesis points
  classifiedPoints: ClassifiedThesisPoint[];

  // §1 + §8 Trade plan
  tradeLevels: TradeLevel[];
  maxPositionSize?: number;

  // §4 Fundamentals
  fundamentals: FundamentalsSnapshot;

  // §5 Market position
  marketPosition: MarketPositionNotes;
  coreDrivers: string[];
  optionalDrivers: string[];

  // §6 Valuation
  valuation: ValuationNotes;

  // §7 Scenarios — array of 5, one per kind. Pre-stubbed on create.
  scenarios: Scenario[];

  // §8 Checklist state + light
  currentLight: Light;
  greenChecks: boolean[];
  yellowChecks: boolean[];
  redChecks: boolean[];
  trimSellChecks: boolean[];

  // §10 Round-trip — legacy free-form analysis blob (ChatGPT round-trip target in W9).
  analysisNotes?: string;

  // Attached notes — multiple markdown notes (ChatGPT responses, scratch, transcripts).
  notes: ResearchNote[];
}

/** Build the canonical 5-row scenario stub (one per kind, in framework order). */
export function defaultScenarios(): Scenario[] {
  return SCENARIO_KINDS.map((kind) => ({ kind }));
}

/** Allocate a fixed-length boolean array of `false` values for checklist defaults. */
export function emptyChecks(length: number): boolean[] {
  return Array<boolean>(length).fill(false);
}
