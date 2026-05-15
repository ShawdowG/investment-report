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
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import { fmtMoney } from "@/lib/utils/format";

interface PortfolioTableProps {
  positions: PortfolioPosition[];
  onRemove: (symbol: string) => void;
}

export function PortfolioTable({ positions, onRemove }: PortfolioTableProps) {
  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        No positions yet — add one above.
      </div>
    );
  }
  const totalCost = positions.reduce((sum, p) => sum + p.quantity * p.avgPrice, 0);
  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Symbol
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Qty
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Avg price
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Total cost
            </TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => (
            <TableRow key={p.symbol}>
              <TableCell className="font-data-mono text-data-mono text-text-primary">
                {p.symbol}
              </TableCell>
              <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                {p.quantity}
              </TableCell>
              <TableCell className="text-right font-data-mono text-data-mono text-text-secondary">
                {fmtMoney(p.avgPrice)}
              </TableCell>
              <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                {fmtMoney(p.quantity * p.avgPrice)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${p.symbol}`}
                  onClick={() => onRemove(p.symbol)}
                >
                  <X />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t border-border-subtle px-card-padding py-2 flex justify-between font-body-compact text-body-compact">
        <span className="text-text-secondary">
          {positions.length} position{positions.length === 1 ? "" : "s"}
        </span>
        <span className="text-text-primary font-data-mono">Total cost {fmtMoney(totalCost)}</span>
      </div>
    </div>
  );
}
