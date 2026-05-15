"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge, Tag } from "@/components/ui/stitch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  WatchlistItem,
  WatchlistPriority,
  WatchlistStatus,
} from "@/lib/domain/watchlist";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { cn } from "@/lib/utils";
import type { WatchlistUpdatePatch } from "./watchlist-view";

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (symbol: string) => void;
  onUpdate: (symbol: string, patch: WatchlistUpdatePatch) => void;
  snapshots?: QuoteSnapshotMap;
}

const STATUS_OPTIONS: WatchlistStatus[] = ["own", "watching", "research", "avoid"];
const STATUS_LABEL: Record<WatchlistStatus, string> = {
  own: "Own",
  watching: "Watching",
  research: "Research",
  avoid: "Avoid",
};

const PRIORITY_OPTIONS: WatchlistPriority[] = ["high", "med", "low"];
const PRIORITY_LABEL: Record<WatchlistPriority, string> = {
  high: "High",
  med: "Med",
  low: "Low",
};

function fmtMoney(n: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseTagInput(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().slice(0, 20))
    .filter((t) => t.length > 0);
}

interface BadgeSelectProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onSelect: (next: T) => void;
  ariaLabel: string;
  children: React.ReactNode;
}

function BadgeSelect<T extends string>({
  value,
  options,
  onSelect,
  ariaLabel,
  children,
}: BadgeSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
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
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 cursor-pointer rounded"
      >
        {children}
        <ChevronDown aria-hidden="true" className="size-3 text-text-secondary" />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100 }}
              className="min-w-[8rem] rounded-md border border-border-subtle bg-surface py-1 shadow-lg"
            >
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full text-left px-3 py-1.5 font-body-compact text-body-compact transition-colors",
                      selected
                        ? "bg-primary-container/20 text-text-primary font-semibold"
                        : "text-text-secondary hover:bg-surface-bright/70 hover:text-text-primary",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

interface StatusEditCellProps {
  symbol: string;
  value: WatchlistStatus;
  onUpdate: (symbol: string, patch: WatchlistUpdatePatch) => void;
}

function StatusEditCell({ symbol, value, onUpdate }: StatusEditCellProps) {
  return (
    <BadgeSelect<WatchlistStatus>
      value={value}
      options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
      onSelect={(next) => onUpdate(symbol, { status: next })}
      ariaLabel={`Status for ${symbol}`}
    >
      <StatusBadge status={value} />
    </BadgeSelect>
  );
}

interface PriorityEditCellProps {
  symbol: string;
  value: WatchlistPriority;
  onUpdate: (symbol: string, patch: WatchlistUpdatePatch) => void;
}

function PriorityEditCell({ symbol, value, onUpdate }: PriorityEditCellProps) {
  return (
    <BadgeSelect<WatchlistPriority>
      value={value}
      options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
      onSelect={(next) => onUpdate(symbol, { priority: next })}
      ariaLabel={`Priority for ${symbol}`}
    >
      <PriorityBadge priority={value} />
    </BadgeSelect>
  );
}

interface TagsEditCellProps {
  symbol: string;
  value: string[];
  onUpdate: (symbol: string, patch: WatchlistUpdatePatch) => void;
}

function TagsEditCell({ symbol, value, onUpdate }: TagsEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = parseTagInput(draft);
    const same =
      next.length === value.length && next.every((t, i) => t === value[i]);
    if (!same) onUpdate(symbol, { tags: next });
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder="comma,separated,tags"
        aria-label={`Tags for ${symbol}`}
        className="w-full rounded border border-border-subtle bg-surface-elevated px-2 py-0.5 text-xs text-text-primary outline-none focus:border-text-primary"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value.join(", "));
        setEditing(true);
      }}
      aria-label={`Edit tags for ${symbol}`}
      className="flex w-full flex-wrap gap-1 rounded text-left hover:opacity-80"
    >
      {value.length === 0 ? (
        <span className="text-xs text-text-secondary italic">add tags</span>
      ) : (
        value.map((tag) => <Tag key={tag}>{tag}</Tag>)
      )}
    </button>
  );
}

export function WatchlistTable({
  items,
  onRemove,
  onUpdate,
  snapshots = {},
}: WatchlistTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        No symbols yet — add one above.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Symbol
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Status
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Priority
            </TableHead>
            <TableHead className="hidden md:table-cell font-label-caps text-label-caps text-text-secondary uppercase">
              Tags
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Last Px
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Day Δ
            </TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const snap = snapshots[item.symbol];
            const dayPct = snap?.dayDelta?.pct ?? null;
            const dayClass =
              dayPct === null
                ? "text-text-secondary"
                : dayPct > 0
                  ? "text-regime-risk-on"
                  : dayPct < 0
                    ? "text-regime-risk-off"
                    : "text-text-secondary";
            return (
              <TableRow key={item.symbol}>
                <TableCell className="font-data-mono text-data-mono text-text-primary">
                  {item.symbol}
                </TableCell>
                <TableCell>
                  <StatusEditCell
                    symbol={item.symbol}
                    value={item.status ?? "watching"}
                    onUpdate={onUpdate}
                  />
                </TableCell>
                <TableCell>
                  <PriorityEditCell
                    symbol={item.symbol}
                    value={item.priority ?? "med"}
                    onUpdate={onUpdate}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <TagsEditCell
                    symbol={item.symbol}
                    value={item.tags ?? []}
                    onUpdate={onUpdate}
                  />
                </TableCell>
                <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                  {snap ? fmtMoney(snap.lastClose, snap.currency) : "—"}
                </TableCell>
                <TableCell className={cn("text-right font-data-mono text-data-mono", dayClass)}>
                  {dayPct === null ? (
                    "—"
                  ) : (
                    <span className="inline-flex items-center gap-1 justify-end">
                      {dayPct > 0 ? (
                        <ArrowUp className="size-3" aria-hidden="true" />
                      ) : dayPct < 0 ? (
                        <ArrowDown className="size-3" aria-hidden="true" />
                      ) : null}
                      {`${dayPct > 0 ? "+" : ""}${dayPct.toFixed(2)}%`}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.symbol}`}
                    onClick={() => onRemove(item.symbol)}
                  >
                    <X />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
