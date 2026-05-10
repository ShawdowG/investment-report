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
