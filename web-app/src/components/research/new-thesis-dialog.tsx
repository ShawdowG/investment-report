"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/stitch";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { cn } from "@/lib/utils";

interface NewThesisDialogProps {
  open: boolean;
  snapshots: QuoteSnapshotMap;
  /** Called with the chosen uppercase symbol when the user confirms. */
  onSelect: (symbol: string) => void;
  onCancel: () => void;
}

/**
 * Themed replacement for the old window.prompt ticker entry. Filters the canonical
 * quote universe by substring on symbol or name; arrow-key navigation + Enter
 * to select. Refuses unknown symbols so the user can't navigate to a 404'd
 * static-export route.
 */
export function NewThesisDialog({
  open,
  snapshots,
  onSelect,
  onCancel,
}: NewThesisDialogProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const allEntries = useMemo(() => {
    return Object.values(snapshots)
      .map((s) => ({
        symbol: s.symbol,
        name: s.name ?? "",
        sector: s.sector ?? "",
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [snapshots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(
      (e) =>
        e.symbol.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q),
    );
  }, [allEntries, query]);

  // Reset selection when the filter results change so we don't index out of bounds.
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    inputRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Scroll active option into view when arrow-key moves it off-screen.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  if (!open || typeof document === "undefined") return null;

  function commit(idx: number) {
    const pick = filtered[idx];
    if (!pick) return;
    onSelect(pick.symbol);
    setQuery("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        onCancel();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (filtered.length > 0)
          setActiveIdx((i) => (i + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (filtered.length > 0)
          setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        break;
      case "Home":
        if (e.target === inputRef.current) return; // let input handle Home
        e.preventDefault();
        setActiveIdx(0);
        break;
      case "End":
        if (e.target === inputRef.current) return;
        e.preventDefault();
        setActiveIdx(Math.max(0, filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        commit(activeIdx);
        break;
    }
  }

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-24"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-lg border border-border-subtle bg-surface shadow-xl"
      >
        <div className="p-card-padding pb-3">
          <h2
            id={titleId}
            className="font-h2 text-h2 text-text-primary mb-1"
          >
            Start a new thesis
          </h2>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Pick a ticker from the quote feed. Type to filter by symbol or name.
          </p>
        </div>
        <div className="px-card-padding">
          <div className="flex items-center gap-2 rounded-full bg-surface-variant border border-border-subtle focus-within:border-primary/60 px-3 py-2">
            <Search className="size-4 text-text-secondary shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker or company name…"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent border-0 font-body-compact text-body-compact text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-0"
              aria-label="Filter tickers"
            />
          </div>
        </div>
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Available tickers"
          className="mt-3 max-h-[40vh] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <li className="px-card-padding py-6 text-center font-body-compact text-body-compact text-text-secondary">
              No tickers match &ldquo;{query}&rdquo;. Tickers live in the daily
              quote feed; check <code className="rounded bg-surface-variant px-1">data/quotes/</code>.
            </li>
          ) : (
            filtered.map((entry, idx) => {
              const active = idx === activeIdx;
              return (
                <li
                  key={entry.symbol}
                  role="option"
                  aria-selected={active}
                  data-idx={idx}
                  onClick={() => commit(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={cn(
                    "flex items-center justify-between gap-3 px-card-padding py-2 cursor-pointer transition-colors",
                    active
                      ? "bg-primary-container/20 text-text-primary"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-data-mono text-data-mono text-text-primary">
                      {entry.symbol}
                    </div>
                    {entry.name && (
                      <div className="font-body-compact text-body-compact text-text-secondary truncate">
                        {entry.name}
                      </div>
                    )}
                  </div>
                  {entry.sector ? <Tag>{entry.sector}</Tag> : null}
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center justify-end gap-2 p-card-padding pt-3 border-t border-border-subtle">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => commit(activeIdx)}
            disabled={filtered.length === 0}
          >
            Start thesis
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
