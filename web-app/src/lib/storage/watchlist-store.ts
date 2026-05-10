import type {
  WatchlistItem,
  WatchlistPriority,
  WatchlistStatus,
} from "@/lib/domain/watchlist";
import { readJson, removeKey, writeJson } from "@/lib/storage/local-storage";

// Compat with v2 assets/app.js — same key, same array shape.
const STORAGE_KEY = "watchlist_items";

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

function normalizeTags(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: string[] = [];
  for (const t of input) {
    if (typeof t !== "string") continue;
    const trimmed = t.trim().slice(0, 20);
    if (trimmed) out.push(trimmed);
  }
  return out.length ? out : undefined;
}

const VALID_STATUSES: WatchlistStatus[] = ["own", "watching", "research", "avoid"];
const VALID_PRIORITIES: WatchlistPriority[] = ["high", "med", "low"];

function coerceStatus(value: unknown): WatchlistStatus | undefined {
  return typeof value === "string" && (VALID_STATUSES as string[]).includes(value)
    ? (value as WatchlistStatus)
    : undefined;
}

function coercePriority(value: unknown): WatchlistPriority | undefined {
  return typeof value === "string" && (VALID_PRIORITIES as string[]).includes(value)
    ? (value as WatchlistPriority)
    : undefined;
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
    const candidate = entry as Partial<WatchlistItem> & { [k: string]: unknown };
    if (typeof candidate.symbol !== "string") continue;
    const symbol = normalizeSymbol(candidate.symbol);
    if (!symbol) continue;
    const item: WatchlistItem = { ...candidate, symbol };
    const status = coerceStatus(candidate.status);
    const priority = coercePriority(candidate.priority);
    const tags = normalizeTags(candidate.tags);
    if (status) item.status = status;
    else delete item.status;
    if (priority) item.priority = priority;
    else delete item.priority;
    if (tags) item.tags = tags;
    else delete item.tags;
    items.push(item);
  }
  return items;
}

export function getWatchlist(): WatchlistItem[] {
  return sortItems(readItems());
}

export interface AddWatchlistInput {
  symbol: string;
  status?: WatchlistStatus;
  priority?: WatchlistPriority;
  tags?: string[];
}

export function addToWatchlist(
  rawSymbolOrInput: string | AddWatchlistInput,
): WatchlistItem[] {
  const input: AddWatchlistInput =
    typeof rawSymbolOrInput === "string"
      ? { symbol: rawSymbolOrInput }
      : rawSymbolOrInput;
  const symbol = normalizeSymbol(input.symbol);
  if (!symbol) return getWatchlist();
  const items = readItems();
  if (items.some((i) => i.symbol === symbol)) {
    return sortItems(items);
  }
  const next: WatchlistItem = {
    symbol,
    addedAt: new Date().toISOString(),
  };
  const status = coerceStatus(input.status);
  const priority = coercePriority(input.priority);
  const tags = normalizeTags(input.tags);
  if (status) next.status = status;
  if (priority) next.priority = priority;
  if (tags) next.tags = tags;
  const updated: WatchlistItem[] = [...items, next];
  writeJson(STORAGE_KEY, updated);
  return sortItems(updated);
}

export function updateWatchlistItem(
  rawSymbol: string,
  patch: Partial<Pick<WatchlistItem, "status" | "priority" | "tags">>,
): WatchlistItem[] {
  const symbol = normalizeSymbol(rawSymbol);
  const items = readItems();
  const idx = items.findIndex((i) => i.symbol === symbol);
  if (idx === -1) return sortItems(items);
  const current = items[idx];
  const next: WatchlistItem = { ...current };
  if ("status" in patch) {
    const s = coerceStatus(patch.status);
    if (s) next.status = s;
    else delete next.status;
  }
  if ("priority" in patch) {
    const p = coercePriority(patch.priority);
    if (p) next.priority = p;
    else delete next.priority;
  }
  if ("tags" in patch) {
    const t = normalizeTags(patch.tags);
    if (t) next.tags = t;
    else delete next.tags;
  }
  const updated = [...items];
  updated[idx] = next;
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

export function addManyToWatchlist(
  rawSymbols: string[],
): { added: number; items: WatchlistItem[] } {
  const items = readItems();
  const existing = new Set(items.map((i) => i.symbol));
  const additions: WatchlistItem[] = [];
  const now = new Date().toISOString();
  for (const raw of rawSymbols) {
    const symbol = normalizeSymbol(raw);
    if (!symbol) continue;
    if (existing.has(symbol)) continue;
    existing.add(symbol);
    additions.push({ symbol, addedAt: now });
  }
  if (additions.length === 0) {
    return { added: 0, items: sortItems(items) };
  }
  const updated = [...items, ...additions];
  writeJson(STORAGE_KEY, updated);
  return { added: additions.length, items: sortItems(updated) };
}

export function clearWatchlist(): void {
  removeKey(STORAGE_KEY);
}

// SPEC-016: compile-time check that this store satisfies the future-Supabase
// contract. Failing TS errors here mean a method drifted; update both sides.
import type { WatchlistRepository } from "./contracts";
const _conforms: WatchlistRepository = {
  list: getWatchlist,
  add: addToWatchlist,
  remove: removeFromWatchlist,
  update: updateWatchlistItem,
  addMany: addManyToWatchlist,
  clear: clearWatchlist,
};
void _conforms;
