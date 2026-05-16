"use client";

import { useEffect, useMemo, useState } from "react";
import { AddSymbolForm, type AddSymbolFormSubmit } from "./add-symbol-form";
import { ImportSection } from "./import-section";
import { WatchlistFilters, type StatusFilter } from "./watchlist-filters";
import { WatchlistTable } from "./watchlist-table";
import type {
  WatchlistItem,
  WatchlistPriority,
  WatchlistStatus,
} from "@/lib/domain/watchlist";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import {
  addManyToWatchlist,
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
} from "@/lib/storage/watchlist-store";

export interface WatchlistUpdatePatch {
  status?: WatchlistStatus;
  priority?: WatchlistPriority;
  tags?: string[];
}

interface WatchlistViewProps {
  snapshots?: QuoteSnapshotMap;
}

export function WatchlistView({ snapshots = {} }: WatchlistViewProps = {}) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [ready, setReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activeSectors, setActiveSectors] = useState<Set<string>>(new Set());

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

  function handleUpdate(symbol: string, patch: WatchlistUpdatePatch) {
    setItems(updateWatchlistItem(symbol, patch));
  }

  function handleSaveMany(symbols: string[]): { added: number; total: number } {
    const result = addManyToWatchlist(symbols);
    setItems(result.items);
    return { added: result.added, total: symbols.length };
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function toggleSector(sector: string) {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  }

  function clearFilters() {
    setStatusFilter("all");
    setActiveTags(new Set());
    setActiveSectors(new Set());
  }

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      for (const t of item.tags ?? []) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const sector = snapshots[item.symbol]?.sector;
      if (sector) set.add(sector);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, snapshots]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all") {
        const status = item.status ?? "watching";
        if (status !== statusFilter) return false;
      }
      if (activeTags.size > 0) {
        const tags = item.tags ?? [];
        let match = false;
        for (const t of tags) if (activeTags.has(t)) { match = true; break; }
        if (!match) return false;
      }
      if (activeSectors.size > 0) {
        const sector = snapshots[item.symbol]?.sector;
        if (!sector || !activeSectors.has(sector)) return false;
      }
      return true;
    });
  }, [items, statusFilter, activeTags, activeSectors, snapshots]);

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading watchlist…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddSymbolForm onAdd={handleAdd} />
      <ImportSection onSave={handleSaveMany} />
      <WatchlistFilters
        status={statusFilter}
        onStatusChange={setStatusFilter}
        availableTags={availableTags}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        availableSectors={availableSectors}
        activeSectors={activeSectors}
        onToggleSector={toggleSector}
        onClear={clearFilters}
        filteredCount={filteredItems.length}
        totalCount={items.length}
      />
      {items.length > 0 && filteredItems.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          No symbols match the current filter.{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="text-text-primary underline hover:no-underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <WatchlistTable
          items={filteredItems}
          onRemove={handleRemove}
          onUpdate={handleUpdate}
          snapshots={snapshots}
        />
      )}
      <p className="text-xs text-text-secondary">
        {items.length} symbol{items.length === 1 ? "" : "s"} — stored locally
        under <code className="rounded bg-surface-variant px-1 py-0.5 text-[10px]">watchlist_items</code>.
        Prices reflect last close (~24h delay).
      </p>
    </div>
  );
}
