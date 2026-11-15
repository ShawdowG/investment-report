import { describe, expect, it } from "vitest";
import type { Strategy } from "@/lib/domain/strategy";
import type { QuoteBar } from "@/lib/quotes/types";
import { runBacktest } from "./engine";

const bar = (date: string, close: number): QuoteBar => ({ date, open: close, high: close, low: close, close, volume: 1 });

describe("runBacktest", () => {
  it("produces deterministic buy-and-hold trades and stats", () => {
    const strategy: Strategy = { id: "s", name: "hold", type: "buy-hold", symbols: ["ABC"], initialCapital: 100, positionSizing: { type: "equal-weight" }, createdAt: "2026-01-01" };
    const result = runBacktest(strategy, { ABC: [bar("2026-01-01", 10), bar("2026-01-02", 12)] });
    expect(result.trades).toEqual([{ date: "2026-01-01", symbol: "ABC", side: "buy", shares: 10, price: 10, value: 100 }]);
    expect(result.stats).toMatchObject({ finalEquity: 120, totalReturn: 20, totalReturnPct: 20, numTrades: 1 });
  });

  it("reports missing symbols without changing initial capital", () => {
    const strategy: Strategy = { id: "s", name: "hold", type: "buy-hold", symbols: ["NONE"], initialCapital: 100, positionSizing: { type: "equal-weight" }, createdAt: "2026-01-01" };
    expect(runBacktest(strategy, {}).errors).toEqual(["No quote data for NONE."]);
  });
});
