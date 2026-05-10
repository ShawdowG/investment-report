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

export function clearPortfolio(): void {
  removeKey(STORAGE_KEY);
}
