"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
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
import type { WatchlistItem } from "@/lib/domain/watchlist";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { cn } from "@/lib/utils";

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (symbol: string) => void;
  snapshots?: QuoteSnapshotMap;
}

function fmtMoney(n: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function WatchlistTable({ items, onRemove, snapshots = {} }: WatchlistTableProps) {
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
                  <StatusBadge status={item.status ?? "watching"} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={item.priority ?? "med"} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(item.tags ?? []).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
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
