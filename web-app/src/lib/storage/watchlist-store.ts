import type { WatchlistItem } from "@/lib/domain/watchlist";
import { readJson, removeKey, writeJson } from "@/lib/storage/local-storage";

// Compat with v2 assets/app.js — same key, same array shape.
const STORAGE_KEY = "watchlist_items";

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

function sortItems(items: WatchlistItem[]): WatchlistItem[] {
  return [...items].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function readItems(): WatchlistItem[] {
  const raw = readJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  const items: WatchlistItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Partial<WatchlistItem>;
    if (typeof candidate.symbol !== "string") continue;
    const symbol = normalizeSymbol(candidate.symbol);
    if (!symbol) continue;
    items.push({ ...candidate, symbol });
  }
  return items;
}

export function getWatchlist(): WatchlistItem[] {
  return sortItems(readItems());
}

export function addToWatchlist(rawSymbol: string): WatchlistItem[] {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return getWatchlist();
  const items = readItems();
  if (items.some((i) => i.symbol === symbol)) {
    return sortItems(items);
  }
  const updated: WatchlistItem[] = [
    ...items,
    { symbol, addedAt: new Date().toISOString() },
  ];
  writeJson(STORAGE_KEY, updated);
  return sortItems(updated);
}

export function removeFromWatchlist(rawSymbol: string): WatchlistItem[] {
  const symbol = normalizeSymbol(rawSymbol);
  const items = readItems();
  const updated = items.filter((i) => i.symbol !== symbol);
  writeJson(STORAGE_KEY, updated);
  return sortItems(updated);
}

export function clearWatchlist(): void {
  removeKey(STORAGE_KEY);
}
