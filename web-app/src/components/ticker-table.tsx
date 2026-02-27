"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Mover } from "@/types/reports";

type SortKey = "ticker" | "pct" | "absPct";

interface TickerTableProps {
  movers: Mover[];
}

export function TickerTable({ movers }: TickerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("absPct");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...movers];
    if (sortKey === "ticker") arr.sort((a, b) => a.ticker.localeCompare(b.ticker));
    else if (sortKey === "pct") arr.sort((a, b) => b.changePct - a.changePct);
    else arr.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    return arr;
  }, [movers, sortKey]);

  function SortHeader({
    label,
    value,
    className,
  }: {
    label: string;
    value: SortKey;
    className?: string;
  }) {
    return (
      <TableHead
        className={cn("cursor-pointer select-none", className)}
        onClick={() => setSortKey(value)}
      >
        <span className="flex items-center gap-1">
          {label}
          {sortKey === value && <span className="text-xs text-foreground">▾</span>}
        </span>
      </TableHead>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">GAMMA — Data Pack</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setIsCollapsed((c) => !c)}
          >
            {isCollapsed ? "Show" : "Collapse"}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Ticker" value="ticker" />
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Δ$</TableHead>
                <SortHeader label="Δ%" value="pct" className="text-right" />
                <SortHeader label="|Δ%|" value="absPct" className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m) => (
                <TableRow key={m.ticker}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {m.ticker}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {m.price.toFixed(2)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-xs",
                      m.changeAbs > 0
                        ? "text-[var(--color-positive)]"
                        : m.changeAbs < 0
                        ? "text-[var(--color-negative)]"
                        : "text-muted-foreground"
                    )}
                  >
                    {m.changeAbs > 0 ? "+" : ""}
                    {m.changeAbs.toFixed(2)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-xs",
                      m.changePct > 0
                        ? "text-[var(--color-positive)]"
                        : m.changePct < 0
                        ? "text-[var(--color-negative)]"
                        : "text-muted-foreground"
                    )}
                  >
                    {m.changePct > 0 ? "+" : ""}
                    {m.changePct.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {Math.abs(m.changePct).toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
