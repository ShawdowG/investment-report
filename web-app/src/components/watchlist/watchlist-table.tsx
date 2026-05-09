"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WatchlistItem } from "@/lib/domain/watchlist";

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (symbol: string) => void;
}

export function WatchlistTable({ items, onRemove }: WatchlistTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-sm text-muted-foreground">
        No symbols yet — add one above.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.symbol}>
              <TableCell className="font-mono font-medium">{item.symbol}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
