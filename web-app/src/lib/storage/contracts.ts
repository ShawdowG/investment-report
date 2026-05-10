import type {
  WatchlistItem,
  WatchlistPriority,
  WatchlistStatus,
} from "@/lib/domain/watchlist";
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import type { TickerNote } from "@/lib/domain/ticker-note";

/**
 * Future-Supabase contract for the 3 client-side stores. Today's localStorage
 * impls satisfy these via `_conforms` assertions at the bottom of each store
 * file. When Supabase lands, a parallel module exporting the same functions
 * (likely Promise-returning — see SPEC-016 §3 out-of-scope) will plug in
 * without touching consumer call sites.
 */

export interface AddWatchlistInput {
  symbol: string;
  status?: WatchlistStatus;
  priority?: WatchlistPriority;
  tags?: string[];
}

export type WatchlistPatch = Partial<
  Pick<WatchlistItem, "status" | "priority" | "tags">
>;

export interface WatchlistRepository {
  list(): WatchlistItem[];
  add(input: string | AddWatchlistInput): WatchlistItem[];
  remove(symbol: string): WatchlistItem[];
  update(symbol: string, patch: WatchlistPatch): WatchlistItem[];
  addMany(symbols: string[]): { added: number; items: WatchlistItem[] };
  clear(): void;
}

export interface AddPortfolioInput {
  symbol: string;
  quantity: number;
  avgPrice: number;
  platform?: string;
}

export interface PortfolioRepository {
  list(): PortfolioPosition[];
  add(input: AddPortfolioInput): PortfolioPosition[];
  remove(symbol: string): PortfolioPosition[];
  clear(): void;
}

export interface NotesRepository {
  list(symbol: string): TickerNote[];
  add(symbol: string, body: string): TickerNote[];
  remove(symbol: string, id: string): TickerNote[];
}
