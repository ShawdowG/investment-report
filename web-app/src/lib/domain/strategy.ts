export type StrategyType = "buy-hold" | "ma-crossover" | "rsi" | "price-threshold";

export interface PositionSizing {
  type: "equal-weight" | "fixed-dollar";
  fixedAmount?: number;
}

interface BaseStrategy {
  id: string;
  name: string;
  type: StrategyType;
  symbols: string[];
  initialCapital: number;
  positionSizing: PositionSizing;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BuyHoldStrategy extends BaseStrategy {
  type: "buy-hold";
}

export interface MACrossStrategy extends BaseStrategy {
  type: "ma-crossover";
  shortPeriod: number;
  longPeriod: number;
}

export interface RSIStrategy extends BaseStrategy {
  type: "rsi";
  period: number;
  buyThreshold: number;
  sellThreshold: number;
}

export interface PriceThresholdStrategy extends BaseStrategy {
  type: "price-threshold";
  buyPrice: number;
  sellPrice: number;
}

export type Strategy =
  | BuyHoldStrategy
  | MACrossStrategy
  | RSIStrategy
  | PriceThresholdStrategy;

// Default parameters for each strategy type. Extracted from strategy-form.tsx
// (W4.7) so the form, tests, and any future seed data share a single source.

export const DEFAULT_INITIAL_CAPITAL = 100_000;
export const DEFAULT_FIXED_AMOUNT = 10_000;

export const DEFAULT_MA_CROSS_PARAMS = {
  shortPeriod: 50,
  longPeriod: 200,
} as const;

export const DEFAULT_RSI_PARAMS = {
  period: 14,
  buyThreshold: 30,
  sellThreshold: 70,
} as const;

