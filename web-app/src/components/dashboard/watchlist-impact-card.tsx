"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader, Tag } from "@/components/ui/stitch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWatchlist } from "@/lib/storage/watchlist-store";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { cn } from "@/lib/utils";

interface WatchlistImpactCardProps {
  snapshots: QuoteSnapshotMap;
  /** Threshold for "high attention" classification, default 3%. */
  highThresholdPct?: number;
}

interface ImpactRow {
  symbol: string;
  name?: string;
  pct: number;
  level: "high" | "medium";
}

function fmtMoney(n: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildImpact(
  symbols: string[],
  snapshots: QuoteSnapshotMap,
  highThreshold: number,
): { high: ImpactRow[]; medium: ImpactRow[]; missing: string[] } {
  const high: ImpactRow[] = [];
  const medium: ImpactRow[] = [];
  const missing: string[] = [];
  for (const symbol of symbols) {
    const snap = snapshots[symbol];
    if (!snap || snap.dayDelta === null) {
      missing.push(symbol);
      continue;
    }
    const row: ImpactRow = {
      symbol,
      name: snap.name,
      pct: snap.dayDelta.pct,
      level: Math.abs(snap.dayDelta.pct) >= highThreshold ? "high" : "medium",
    };
    if (row.level === "high") high.push(row);
    else medium.push(row);
  }
  high.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  medium.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return { high, medium, missing };
}

export function WatchlistImpactCard({
  snapshots,
  highThresholdPct = 3,
}: WatchlistImpactCardProps) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSymbols(getWatchlist().map((i) => i.symbol));
    setReady(true);
  }, []);

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Watchlist Impact"
        caption={`Day deltas for symbols you follow (high ≥ ±${highThresholdPct}%)`}
      />
      <Body
        ready={ready}
        symbols={symbols}
        snapshots={snapshots}
        highThresholdPct={highThresholdPct}
      />
    </Card>
  );
}

function Body({
  ready,
  symbols,
  snapshots,
  highThresholdPct,
}: {
  ready: boolean;
  symbols: string[];
  snapshots: QuoteSnapshotMap;
  highThresholdPct: number;
}) {
  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading watchlist…</p>;
  }
  if (symbols.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add symbols on{" "}
        <Link href="/watchlist" className="text-primary hover:underline">
          /watchlist
        </Link>{" "}
        to see day deltas here.
      </p>
    );
  }

  const { high, medium, missing } = buildImpact(symbols, snapshots, highThresholdPct);

  if (high.length === 0 && medium.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No quote data for any of your watched symbols.
        </p>
        {missing.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {missing.map((s) => (
              <Tag key={s} className="font-data-mono">
                {s}
              </Tag>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {high.length > 0 ? <Bucket title={`High attention (${high.length})`} rows={high} snapshots={snapshots} /> : null}
      {medium.length > 0 ? <Bucket title={`Medium attention (${medium.length})`} rows={medium} snapshots={snapshots} /> : null}
      {missing.length > 0 ? (
        <div className="space-y-1.5">
          <p className="font-label-caps text-label-caps text-text-secondary uppercase">
            No quote data ({missing.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {missing.map((s) => (
              <Tag key={s} className="font-data-mono">
                {s}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Bucket({
  title,
  rows,
  snapshots,
}: {
  title: string;
  rows: ImpactRow[];
  snapshots: QuoteSnapshotMap;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-label-caps text-label-caps text-text-secondary uppercase">{title}</h3>
      <div className="rounded-lg border border-border-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                Symbol
              </TableHead>
              <TableHead className="hidden md:table-cell font-label-caps text-label-caps text-text-secondary uppercase">
                Name
              </TableHead>
              <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                Last
              </TableHead>
              <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                Day Δ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const snap = snapshots[row.symbol];
              const colorClass =
                row.pct > 0
                  ? "text-regime-risk-on"
                  : row.pct < 0
                    ? "text-regime-risk-off"
                    : "text-text-secondary";
              return (
                <TableRow key={row.symbol}>
                  <TableCell>
                    <Link
                      href={`/ticker/${encodeURIComponent(row.symbol)}`}
                      className="font-data-mono text-data-mono text-text-primary hover:text-primary transition-colors"
                    >
                      {row.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                    {row.name ?? ""}
                  </TableCell>
                  <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                    {snap ? fmtMoney(snap.lastClose, snap.currency) : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right font-data-mono text-data-mono", colorClass)}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      {row.pct > 0 ? <ArrowUp className="size-3" /> : row.pct < 0 ? <ArrowDown className="size-3" /> : null}
                      {`${row.pct > 0 ? "+" : ""}${row.pct.toFixed(2)}%`}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
