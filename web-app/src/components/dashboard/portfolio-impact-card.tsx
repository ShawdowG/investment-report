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
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import { getPortfolio } from "@/lib/storage/portfolio-store";
import {
  getPortfolioImpact,
  type PortfolioImpact,
} from "@/lib/reports/portfolio-impact";
import type { ReportItem } from "@/types/reports";

interface PortfolioImpactCardProps {
  latest: ReportItem | null;
}

const fmtMoney = (n: number): string => {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
};

export function PortfolioImpactCard({ latest }: PortfolioImpactCardProps) {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPositions(getPortfolio());
    setReady(true);
  }, []);

  const impact: PortfolioImpact = ready
    ? getPortfolioImpact(latest, positions)
    : { rows: [], missing: [], totalDollarDelta: 0 };

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Portfolio Impact"
        caption="Estimated dollar effect of today's report on owned positions"
      />
      <Body ready={ready} positions={positions} impact={impact} />
    </Card>
  );
}

function Body({
  ready,
  positions,
  impact,
}: {
  ready: boolean;
  positions: PortfolioPosition[];
  impact: PortfolioImpact;
}) {
  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading portfolio…</p>;
  }

  if (positions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No positions yet. Add holdings on{" "}
        <Link href="/portfolio" className="text-primary hover:underline">
          /portfolio
        </Link>{" "}
        to see dollar impact here.
      </p>
    );
  }

  if (impact.rows.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          None of your positions appear in today&apos;s report movers.
        </p>
        {impact.missing.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {impact.missing.map((s) => (
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
    <div className="space-y-3">
      <div className="rounded-lg border border-border-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                Symbol
              </TableHead>
              <TableHead className="hidden md:table-cell font-label-caps text-label-caps text-text-secondary uppercase text-right">
                Qty
              </TableHead>
              <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                Move
              </TableHead>
              <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                Δ$
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {impact.rows.map((row) => {
              const sentiment =
                row.pct > 0 ? "bullish" : row.pct < 0 ? "bearish" : "neutral";
              const pctText = `${row.pct > 0 ? "+" : ""}${row.pct.toFixed(2)}%`;
              return (
                <TableRow key={row.symbol}>
                  <TableCell className="font-data-mono text-data-mono">
                    {row.symbol}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right font-data-mono text-data-mono text-text-secondary">
                    {row.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <Sentiment sentiment={sentiment} label={pctText} />
                  </TableCell>
                  <TableCell
                    className={`text-right font-data-mono text-data-mono ${
                      row.dollarDelta > 0
                        ? "text-regime-risk-on"
                        : row.dollarDelta < 0
                          ? "text-regime-risk-off"
                          : "text-text-secondary"
                    }`}
                  >
                    {fmtMoney(row.dollarDelta)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between font-body-compact text-body-compact">
        <span className="text-text-secondary">
          {impact.missing.length > 0
            ? `${impact.missing.length} position${impact.missing.length === 1 ? "" : "s"} not in report`
            : ""}
        </span>
        <span
          className={`font-data-mono ${
            impact.totalDollarDelta > 0
              ? "text-regime-risk-on"
              : impact.totalDollarDelta < 0
                ? "text-regime-risk-off"
                : "text-text-primary"
          }`}
        >
          Total {fmtMoney(impact.totalDollarDelta)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Δ$ estimated as quantity × avg price × pct. Refines when live quote integration lands.
      </p>
    </div>
  );
}
