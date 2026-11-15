import { describe, expect, it } from "vitest";
import { parseTickers } from "./parse-tickers";

describe("parseTickers", () => {
  it("normalizes exchange prefixes, class shares, duplicates, and separators", () => {
    expect(parseTickers("NASDAQ:NVDA, brk-b; NVDA\nBTC-USD")).toEqual({ accepted: ["BRK.B", "BTC-USD", "NVDA"], unknown: [] });
  });

  it("keeps rejected input visible", () => {
    expect(parseTickers("Apple foo_bar")).toEqual({ accepted: [], unknown: ["Apple", "foo_bar"] });
  });
});
