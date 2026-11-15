import { describe, expect, it } from "vitest";
import { assessQuoteFreshness, businessDaysBetween } from "./quote-freshness";

describe("quote freshness", () => {
  it("does not count a weekend as stale trading days", () => {
    expect(businessDaysBetween(new Date("2026-11-13T00:00:00Z"), new Date("2026-11-16T12:00:00Z"))).toBe(1);
    expect(assessQuoteFreshness({ latestBarDate: "2026-11-13", generatedAt: "2026-11-13T23:00:00Z", now: new Date("2026-11-16T08:00:00Z") }).status).toBe("fresh");
  });

  it("reports stale ingestion separately from the bar date", () => {
    const result = assessQuoteFreshness({ latestBarDate: "2026-11-13", generatedAt: "2026-11-10T00:00:00Z", now: new Date("2026-11-14T00:00:00Z") });
    expect(result.status).toBe("stale");
    expect(result.reasons).toContain("The quote ingestion is stale.");
  });
});
