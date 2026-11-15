import { describe, expect, it } from "vitest";
import { runLocalDataMigrations, type KeyValueStorage } from "./migrations";
import { DATASET_IDS, DATASET_REGISTRY, STORAGE_SCHEMA_KEY } from "./registry";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("local data migrations", () => {
  it("records every legacy dataset as v1 without data loss", () => {
    const storage = new MemoryStorage();
    const legacy = [{ symbol: "NVDA", unknownFutureField: { nested: 1 } }];
    storage.setItem(DATASET_REGISTRY.watchlist.key, JSON.stringify(legacy));
    const result = runLocalDataMigrations(storage);
    expect(result.ok).toBe(true);
    expect(JSON.parse(storage.getItem(DATASET_REGISTRY.watchlist.key)!)).toEqual(legacy);
    expect(JSON.parse(storage.getItem(STORAGE_SCHEMA_KEY)!)).toEqual(
      Object.fromEntries(DATASET_IDS.map((id) => [id, 1])),
    );
  });

  it("rejects future versions without changing stored records", () => {
    const storage = new MemoryStorage();
    storage.setItem(DATASET_REGISTRY.portfolio.key, "[{\"symbol\":\"A\"}]");
    storage.setItem(STORAGE_SCHEMA_KEY, JSON.stringify({ portfolio: 99 }));
    const before = new Map(storage.values);
    expect(runLocalDataMigrations(storage).ok).toBe(false);
    expect(storage.values).toEqual(before);
  });
});
