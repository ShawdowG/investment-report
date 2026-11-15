import { describe, expect, it, vi } from "vitest";
import { addToWatchlist, getWatchlist } from "./watchlist-store";
import { readJsonResult, StorageOperationError } from "./local-storage";

describe("local storage repositories", () => {
  it("preserves unknown legacy fields while decoding known fields", () => {
    localStorage.setItem("watchlist_items", JSON.stringify([{ symbol: "nvda", custom: { keep: true }, status: "own" }]));
    expect(getWatchlist()[0]).toMatchObject({ symbol: "NVDA", custom: { keep: true }, status: "own" });
  });

  it("distinguishes invalid JSON", () => {
    localStorage.setItem("watchlist_items", "{");
    expect(readJsonResult("watchlist_items")).toMatchObject({ ok: false, code: "invalid-json" });
  });

  it("surfaces quota failures to repository callers", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => addToWatchlist("NVDA")).toThrow(StorageOperationError);
  });
});
