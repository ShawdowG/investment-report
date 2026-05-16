import type { PortfolioPosition } from "@/lib/domain/portfolio";
import { readJson, removeKey, writeJson } from "@/lib/storage/local-storage";

const STORAGE_KEY = "portfolio_positions";

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

function sortPositions(items: PortfolioPosition[]): PortfolioPosition[] {
  return [...items].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function readItems(): PortfolioPosition[] {
  const raw = readJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  const positions: PortfolioPosition[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Partial<PortfolioPosition>;
    if (typeof candidate.symbol !== "string") continue;
    if (typeof candidate.quantity !== "number" || !(candidate.quantity > 0)) continue;
    if (typeof candidate.avgPrice !== "number" || !(candidate.avgPrice > 0)) continue;
    const symbol = normalizeSymbol(candidate.symbol);
    if (!symbol) continue;
    positions.push({
      ...candidate,
      symbol,
      quantity: candidate.quantity,
      avgPrice: candidate.avgPrice,
    });
  }
  return positions;
}

export function getPortfolio(): PortfolioPosition[] {
  return sortPositions(readItems());
}

export interface AddPositionInput {
  symbol: string;
  quantity: number;
  avgPrice: number;
  platform?: string;
}

export function addPosition(input: AddPositionInput): PortfolioPosition[] {
  const symbol = normalizeSymbol(input.symbol);
  if (!symbol) return getPortfolio();
  if (!(input.quantity > 0) || !(input.avgPrice > 0)) return getPortfolio();
  const items = readItems().filter((p) => p.symbol !== symbol);
  const next: PortfolioPosition = {
    symbol,
    quantity: input.quantity,
    avgPrice: input.avgPrice,
    addedAt: new Date().toISOString(),
    ...(input.platform ? { platform: input.platform } : {}),
  };
  const updated = [...items, next];
  writeJson(STORAGE_KEY, updated);
  return sortPositions(updated);
}

export function removePosition(rawSymbol: string): PortfolioPosition[] {
  const symbol = normalizeSymbol(rawSymbol);
  const items = readItems();
  const updated = items.filter((p) => p.symbol !== symbol);
  writeJson(STORAGE_KEY, updated);
  return sortPositions(updated);
}

export type UpdatePositionPatch = Partial<
  Pick<PortfolioPosition, "quantity" | "avgPrice" | "platform">
>;

export function updatePosition(
  rawSymbol: string,
  patch: UpdatePositionPatch,
): PortfolioPosition[] {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return getPortfolio();
  // Reject invalid numeric fields up-front so a bad inline edit can't silently
  // corrupt the row — readItems() would later drop it on the next reload.
  if (patch.quantity !== undefined && !(patch.quantity > 0)) return getPortfolio();
  if (patch.avgPrice !== undefined && !(patch.avgPrice > 0)) return getPortfolio();
  const items = readItems();
  let touched = false;
  const updated = items.map((p) => {
    if (p.symbol !== symbol) return p;
    touched = true;
    return {
      ...p,
      ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
      ...(patch.avgPrice !== undefined ? { avgPrice: patch.avgPrice } : {}),
      ...(patch.platform !== undefined ? { platform: patch.platform } : {}),
    };
  });
  if (!touched) return sortPositions(items);
  writeJson(STORAGE_KEY, updated);
  return sortPositions(updated);
}

export function clearPortfolio(): void {
  removeKey(STORAGE_KEY);
}

// SPEC-016: compile-time conformance check vs the contract.
import type { PortfolioRepository } from "./contracts";
const _conforms: PortfolioRepository = {
  list: getPortfolio,
  add: addPosition,
  remove: removePosition,
  update: updatePosition,
  clear: clearPortfolio,
};
void _conforms;
