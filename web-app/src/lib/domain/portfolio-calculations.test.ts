import { describe, expect, it } from "vitest";
import { buildEquityCurve, getPortfolioPnL } from "./portfolio-calculations";

describe("portfolio calculations", () => {
  it("uses deterministic rounding for fractional positions", () => {
    const result = getPortfolioPnL(
      [{ symbol: "ABC", quantity: 0.3333, avgPrice: 10 }],
      { ABC: { symbol: "ABC", lastClose: 12.3456, currency: "USD", asOf: "2026-11-13", dayDelta: { abs: 0.1, pct: 0.82 } } },
    );
    expect(result.rows[0]).toMatchObject({ currentValue: 4.11478848, costBasis: 3.333, totalPnL: 0.78178848 });
    expect(result.totalCurrentValue).toBe(4.11478848);
  });

  it("does not aggregate unrelated currencies", () => {
    const result = getPortfolioPnL(
      [{ symbol: "US", quantity: 1, avgPrice: 10 }, { symbol: "NO", quantity: 1, avgPrice: 100 }],
      {
        US: { symbol: "US", lastClose: 12, currency: "USD", asOf: "2026-11-13", dayDelta: null },
        NO: { symbol: "NO", lastClose: 110, currency: "NOK", asOf: "2026-11-13", dayDelta: null },
      },
    );
    expect(result.hasMixedCurrencies).toBe(true);
    expect(result.totalCurrentValue).toBe(0);
    expect(result.totalsByCurrency.USD.currentValue).toBe(12);
    expect(result.totalsByCurrency.NOK.currentValue).toBe(110);
  });

  it("aligns equity dates and forward-fills missing market days", () => {
    const curve = buildEquityCurve(
      [{ symbol: "A", quantity: 2, avgPrice: 8 }, { symbol: "B", quantity: 1, avgPrice: 20 }],
      { A: [{ date: "2026-01-01", close: 10 }, { date: "2026-01-02", close: 11 }], B: [{ date: "2026-01-02", close: 20 }, { date: "2026-01-03", close: 21 }] },
    );
    expect(curve.startDate).toBe("2026-01-02");
    expect(curve.points).toEqual([{ date: "2026-01-02", value: 42, pnl: 6 }, { date: "2026-01-03", value: 43, pnl: 7 }]);
  });
});
