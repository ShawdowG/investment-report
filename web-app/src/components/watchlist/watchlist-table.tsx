"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BadgeSelect,
  PriorityBadge,
  StatusBadge,
  Tag,
} from "@/components/ui/stitch";
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
import type { Light } from "@/lib/domain/quarterly-review";
import {
  getAllThesisLights,
  LIGHT_ARIA,
  LIGHT_DOT_CLASS,
} from "@/lib/research/thesis-light";

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

type SortKey = "symbol" | "lastPx" | "dayPct";
type SortDir = "asc" | "desc";
interface SortState {
  key: SortKey;
  dir: SortDir;
}

export function WatchlistTable({
  items,
  onRemove,
  onUpdate,
  snapshots = {},
}: WatchlistTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "symbol", dir: "asc" });
  // SPEC-023 W8.H — resolve thesis lights once on mount (single localStorage
  // read for the whole table, not N reads per row).
  const [thesisLights, setThesisLights] = useState<Record<string, Light>>({});
  useEffect(() => {
    setThesisLights(getAllThesisLights());
  }, []);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const sortedItems = useMemo(() => {
    const arr = [...items];
    if (sort.key === "symbol") {
      arr.sort((a, b) => a.symbol.localeCompare(b.symbol));
      if (sort.dir === "desc") arr.reverse();
      return arr;
    }
    const factor = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const va =
        sort.key === "lastPx"
          ? snapshots[a.symbol]?.lastClose ?? null
          : snapshots[a.symbol]?.dayDelta?.pct ?? null;
      const vb =
        sort.key === "lastPx"
          ? snapshots[b.symbol]?.lastClose ?? null
          : snapshots[b.symbol]?.dayDelta?.pct ?? null;
      // Missing data sorts last regardless of direction.
      if (va === null && vb === null) return a.symbol.localeCompare(b.symbol);
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va === vb) return a.symbol.localeCompare(b.symbol);
      return (va - vb) * factor;
    });
    return arr;
  }, [items, sort, snapshots]);

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
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right p-0">
              <SortableHeader
                label="Last Px"
                sortKey="lastPx"
                sort={sort}
                onToggle={toggleSort}
              />
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right p-0">
              <SortableHeader
                label="Day Δ"
                sortKey="dayPct"
                sort={sort}
                onToggle={toggleSort}
              />
            </TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item) => {
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
                  <span className="inline-flex items-center gap-2">
                    {thesisLights[item.symbol] ? (
                      <Link
                        href={`/research/thesis/${encodeURIComponent(item.symbol)}`}
                        aria-label={LIGHT_ARIA[thesisLights[item.symbol]]}
                        className="inline-block size-1.5 rounded-full hover:opacity-80 transition-opacity"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "inline-block size-1.5 rounded-full",
                            LIGHT_DOT_CLASS[thesisLights[item.symbol]],
                          )}
                        />
                      </Link>
                    ) : null}
                    <span>{item.symbol}</span>
                  </span>
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

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onToggle: (key: SortKey) => void;
}

function SortableHeader({ label, sortKey, sort, onToggle }: SortableHeaderProps) {
  const active = sort.key === sortKey;
  const ariaSort = active
    ? sort.dir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      aria-sort={ariaSort}
      aria-label={`Sort by ${label}${
        active ? `, currently ${ariaSort}` : ""
      }`}
      className={cn(
        "inline-flex w-full items-center justify-end gap-1 px-2 py-2.5 font-label-caps text-label-caps uppercase transition-colors",
        "hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        active ? "text-text-primary" : "text-text-secondary",
      )}
    >
      <span>{label}</span>
      {active ? (
        sort.dir === "asc" ? (
          <ArrowUp className="size-3" aria-hidden="true" />
        ) : (
          <ArrowDown className="size-3" aria-hidden="true" />
        )
      ) : (
        <span aria-hidden="true" className="size-3" />
      )}
    </button>
  );
}
