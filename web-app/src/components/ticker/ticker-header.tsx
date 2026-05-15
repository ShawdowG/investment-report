"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Plus } from "lucide-react";
import { BadgeSelect, PriorityBadge, StatusBadge } from "@/components/ui/stitch";
import { cn } from "@/lib/utils";
import type {
  WatchlistItem,
  WatchlistPriority,
  WatchlistStatus,
} from "@/lib/domain/watchlist";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
} from "@/lib/storage/watchlist-store";

interface TickerHeaderProps {
  symbol: string;
  /** Optional friendly name (e.g. "NVIDIA Corporation") */
  name?: string;
  /** Optional sector / tag chips */
  tags?: string[];
}

const STATUS_OPTIONS: { value: WatchlistStatus; label: string }[] = [
  { value: "own", label: "Own" },
  { value: "watching", label: "Watching" },
  { value: "research", label: "Research" },
  { value: "avoid", label: "Avoid" },
];

const PRIORITY_OPTIONS: { value: WatchlistPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "med", label: "Med" },
  { value: "low", label: "Low" },
];

export function TickerHeader({ symbol, name, tags }: TickerHeaderProps) {
  const [entry, setEntry] = useState<WatchlistItem | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const found = getWatchlist().find((item) => item.symbol === symbol) ?? null;
    setEntry(found);
    setReady(true);
  }, [symbol]);

  function syncFromList(next: WatchlistItem[]) {
    setEntry(next.find((i) => i.symbol === symbol) ?? null);
  }

  function handleAdd() {
    syncFromList(addToWatchlist({ symbol, status: "watching", priority: "med" }));
  }

  function handleStatusChange(status: WatchlistStatus) {
    syncFromList(updateWatchlistItem(symbol, { status }));
  }

  function handlePriorityChange(priority: WatchlistPriority) {
    syncFromList(updateWatchlistItem(symbol, { priority }));
  }

  function handleRemove() {
    syncFromList(removeFromWatchlist(symbol));
  }

  const status: WatchlistStatus = entry?.status ?? "watching";
  const priority: WatchlistPriority = entry?.priority ?? "med";

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-border-subtle/50">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="font-h1 text-h1 text-text-primary tracking-tight">{symbol}</h1>
          {name ? (
            <span className="font-h2 text-h2 text-text-secondary font-normal">{name}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 min-h-[28px]">
          {ready ? (
            entry ? (
              <>
                <BadgeSelect<WatchlistStatus>
                  value={status}
                  options={STATUS_OPTIONS}
                  onSelect={handleStatusChange}
                  ariaLabel={`Watchlist status for ${symbol}`}
                >
                  <StatusBadge status={status} />
                </BadgeSelect>
                <WatchlistMoreMenu
                  symbol={symbol}
                  priority={priority}
                  onPriorityChange={handlePriorityChange}
                  onRemove={handleRemove}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                aria-label={`Add ${symbol} to watchlist`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-badge text-badge border border-border-subtle bg-surface-variant text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Add to watchlist
              </button>
            )
          ) : null}
          {(tags ?? []).map((tag) => (
            <span
              key={tag}
              className="font-badge text-badge px-2 py-1 rounded bg-surface-variant text-text-secondary border border-border-subtle"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

interface WatchlistMoreMenuProps {
  symbol: string;
  priority: WatchlistPriority;
  onPriorityChange: (next: WatchlistPriority) => void;
  onRemove: () => void;
}

function WatchlistMoreMenu({
  symbol,
  priority,
  onPriorityChange,
  onRemove,
}: WatchlistMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.right - 200 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More watchlist actions for ${symbol}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center size-7 rounded border border-border-subtle bg-surface-variant text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
      >
        <MoreVertical aria-hidden="true" className="size-4" />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100, minWidth: 200 }}
              className="rounded-md border border-border-subtle bg-surface py-1 shadow-lg"
            >
              <MenuLabel>Priority</MenuLabel>
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = opt.value === priority;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onPriorityChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-1.5 font-body-compact text-body-compact transition-colors",
                      selected
                        ? "bg-primary-container/20 text-text-primary"
                        : "text-text-secondary hover:bg-surface-bright/70 hover:text-text-primary",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <PriorityBadge priority={opt.value} />
                    </span>
                    {selected ? (
                      <span aria-hidden="true" className="font-label-caps text-label-caps text-text-secondary">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <div className="my-1 h-px bg-border-subtle" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onRemove();
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 font-body-compact text-body-compact text-text-secondary hover:bg-surface-bright/70 hover:text-destructive transition-colors"
              >
                Remove from watchlist
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-1.5 pb-1 font-label-caps text-label-caps text-text-secondary uppercase">
      {children}
    </div>
  );
}
