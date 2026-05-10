import type { Strategy, StrategyType } from "@/lib/domain/strategy";
import { readJson, removeKey, writeJson } from "./local-storage";

const STORAGE_KEY = "strategies";

const VALID_TYPES: StrategyType[] = [
  "buy-hold",
  "ma-crossover",
  "rsi",
  "price-threshold",
];

function readItems(): Strategy[] {
  const raw = readJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  const items: Strategy[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const c = entry as Partial<Strategy>;
    if (
      typeof c.id !== "string" ||
      typeof c.name !== "string" ||
      typeof c.type !== "string" ||
      !VALID_TYPES.includes(c.type as StrategyType) ||
      !Array.isArray(c.symbols) ||
      typeof c.initialCapital !== "number" ||
      typeof c.createdAt !== "string"
    ) {
      continue;
    }
    items.push(entry as Strategy);
  }
  return items;
}

function sortNewestFirst(items: Strategy[]): Strategy[] {
  return [...items].sort((a, b) => {
    const aKey = a.updatedAt ?? a.createdAt;
    const bKey = b.updatedAt ?? b.createdAt;
    return bKey.localeCompare(aKey);
  });
}

function genId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

import type { StrategyInputContract } from "./contracts";
export type StrategyInput = StrategyInputContract;

export function getStrategies(): Strategy[] {
  return sortNewestFirst(readItems());
}

export function getStrategy(id: string): Strategy | null {
  return readItems().find((s) => s.id === id) ?? null;
}

export function createStrategy(input: StrategyInput): Strategy {
  const items = readItems();
  const next = {
    id: genId(),
    createdAt: new Date().toISOString(),
    ...input,
  } as Strategy;
  writeJson(STORAGE_KEY, [next, ...items]);
  return next;
}

export function updateStrategy(
  id: string,
  patch: Partial<StrategyInput>,
): Strategy | null {
  const items = readItems();
  const idx = items.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const next = {
    ...items[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  } as Strategy;
  items[idx] = next;
  writeJson(STORAGE_KEY, items);
  return next;
}

export function deleteStrategy(id: string): void {
  const items = readItems().filter((s) => s.id !== id);
  writeJson(STORAGE_KEY, items);
}

export function clearStrategies(): void {
  removeKey(STORAGE_KEY);
}

// SPEC-016 conformance assertion.
import type { StrategyRepository } from "./contracts";
const _conforms: StrategyRepository = {
  list: getStrategies,
  get: getStrategy,
  create: createStrategy,
  update: updateStrategy,
  remove: deleteStrategy,
};
void _conforms;
