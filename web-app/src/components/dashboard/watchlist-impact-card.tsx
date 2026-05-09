"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader, Sentiment, Tag } from "@/components/ui/stitch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWatchlist } from "@/lib/storage/watchlist-store";
import {
  getWatchlistImpact,
  type ImpactRow,
  type WatchlistImpact,
} from "@/lib/reports/watchlist-impact";
import type { ReportItem } from "@/types/reports";

interface WatchlistImpactCardProps {
  latest: ReportItem | null;
}

export function WatchlistImpactCard({ latest }: WatchlistImpactCardProps) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSymbols(getWatchlist().map((item) => item.symbol));
    setReady(true);
  }, []);

  const impact: WatchlistImpact = ready
    ? getWatchlistImpact(latest, symbols)
    : { high: [], medium: [], missing: [] };

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Watchlist Impact"
        caption="How today's report affects symbols you follow"
      />
      <WatchlistImpactBody ready={ready} symbols={symbols} impact={impact} />
    </Card>
  );
}

interface BodyProps {
  ready: boolean;
  symbols: string[];
  impact: WatchlistImpact;
}

function WatchlistImpactBody({ ready, symbols, impact }: BodyProps) {
  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Loading watchlist…</p>
    );
  }

  if (symbols.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add symbols in{" "}
        <Link href="/watchlist" className="text-primary hover:underline">
          /watchlist
        </Link>{" "}
        to see how this report affects them.
      </p>
    );
  }

  const { high, medium, missing } = impact;

  if (high.length === 0 && medium.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          None of your watched symbols appear in today&apos;s report.
        </p>
        {missing.length > 0 ? <MissingList missing={missing} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {high.length > 0 ? (
        <ImpactBucket title="High attention" rows={high} />
      ) : null}
      {medium.length > 0 ? (
        <ImpactBucket title="Medium attention" rows={medium} />
      ) : null}
      {missing.length > 0 ? <MissingList missing={missing} /> : null}
    </div>
  );
}

function ImpactBucket({ title, rows }: { title: string; rows: ImpactRow[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-label-caps text-label-caps text-text-secondary uppercase">
        {title} ({rows.length})
      </h3>
      <div className="rounded-lg border border-border-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="hidden md:table-cell">Name</TableHead>
              <TableHead className="text-right">Move</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const sentiment =
                row.pct > 0 ? "bullish" : row.pct < 0 ? "bearish" : "neutral";
              const formatted = `${row.pct > 0 ? "+" : ""}${row.pct.toFixed(2)}%`;
              return (
                <TableRow key={row.symbol}>
                  <TableCell className="font-data-mono text-data-mono">
                    {row.symbol}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {row.name ?? ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Sentiment sentiment={sentiment} label={formatted} />
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

function MissingList({ missing }: { missing: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="font-label-caps text-label-caps text-text-secondary uppercase">
        Not in this report ({missing.length})
      </p>
      <div className="flex flex-wrap gap-1">
        {missing.map((symbol) => (
          <Tag key={symbol} className="font-data-mono">
            {symbol}
          </Tag>
        ))}
      </div>
    </div>
  );
}
