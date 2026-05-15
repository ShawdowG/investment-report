/**
 * SPEC-023 thesis domain. W8.A ships the minimal slice needed to capture the
 * §1 input template + §2 classification + §8 trade plan. The full thesis
 * (fundamentals, scenarios, light/checklists, notes, market position,
 * valuation) lands in W8.B-L.
 *
 * The store deliberately tolerates extra fields on read (see `thesis-store`)
 * so subsequent workstreams can grow the type without a migration step.
 */

export type PlannedAction = "hold" | "add" | "trim" | "sell" | "watch";
export type TradeLevelKind = "add" | "trim" | "sell";
export type ClassifiedPointType = "core" | "optional" | "valuation" | "risk";

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
}

export interface Concerns {
  valuation?: string;
  competition?: string;
  macro?: string;
  execution?: string;
  other?: string;
}

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
}
