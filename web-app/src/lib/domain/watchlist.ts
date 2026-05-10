export type WatchlistStatus = "own" | "watching" | "research" | "avoid";
export type WatchlistPriority = "high" | "med" | "low";

export interface WatchlistItem {
  symbol: string;
  id?: string;
  addedAt?: string;
  status?: WatchlistStatus;
  priority?: WatchlistPriority;
  tags?: string[];
}
