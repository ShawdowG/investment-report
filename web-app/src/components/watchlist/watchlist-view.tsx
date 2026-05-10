"use client";

import { useEffect, useState } from "react";
import { AddSymbolForm, type AddSymbolFormSubmit } from "./add-symbol-form";
import { ImportSection } from "./import-section";
import { WatchlistTable } from "./watchlist-table";
import type { WatchlistItem } from "@/lib/domain/watchlist";
import {
  addManyToWatchlist,
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/lib/storage/watchlist-store";

export function WatchlistView() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(getWatchlist());
    setReady(true);
  }, []);

  function handleAdd(input: AddSymbolFormSubmit) {
    setItems(addToWatchlist(input));
  }

  function handleRemove(symbol: string) {
    setItems(removeFromWatchlist(symbol));
  }

  function handleSaveMany(symbols: string[]): { added: number; total: number } {
    const result = addManyToWatchlist(symbols);
    setItems(result.items);
    return { added: result.added, total: symbols.length };
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-sm text-muted-foreground">
        Loading watchlist…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddSymbolForm onAdd={handleAdd} />
      <ImportSection onSave={handleSaveMany} />
      <WatchlistTable items={items} onRemove={handleRemove} />
      <p className="text-xs text-muted-foreground">
        {items.length} symbol{items.length === 1 ? "" : "s"} — stored locally
        under <code className="rounded bg-muted px-1 py-0.5 text-[10px]">watchlist_items</code>.
      </p>
    </div>
  );
}
