"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import { getPortfolio } from "@/lib/storage/portfolio-store";
import {
  getPortfolioPnL,
  type PortfolioPnL,
} from "@/lib/quotes/portfolio-pnl";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import type { CompactDailyMap } from "@/lib/quotes/compact-daily";
import { buildEquityCurve } from "@/lib/quotes/portfolio-equity";
import { PortfolioEquityChart } from "./portfolio-equity-chart";

interface PortfolioImpactCardProps {
  snapshots: QuoteSnapshotMap;
  compactDaily?: CompactDailyMap;
  equityChartCollapsed?: boolean;
  onToggleEquityChart?: () => void;
}

function fmtMoney(n: number, currency = "USD"): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const symbol = currency === "USD" ? "$" : "";
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol}${abs}`;
}

function fmtMoneyPlain(n: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function pnlColorClass(n: number): string {
  if (n > 0) return "text-regime-risk-on";
  if (n < 0) return "text-regime-risk-off";
  return "text-text-secondary";
}

const EMPTY_PNL: PortfolioPnL = {
  rows: [],
  missing: [],
  totalCurrentValue: 0,
  totalCostBasis: 0,
  totalPnL: 0,
  totalPnLPct: 0,
  totalDayPnL: 0,
  totalDayPnLPct: null,
};

export function PortfolioImpactCard({
  snapshots,
  compactDaily,
  equityChartCollapsed = true,
  onToggleEquityChart,
}: PortfolioImpactCardProps) {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPositions(getPortfolio());
    setReady(true);
  }, []);

  const pnl: PortfolioPnL = ready
    ? getPortfolioPnL(positions, snapshots)
    : EMPTY_PNL;

  const curve =
    ready && compactDaily
      ? buildEquityCurve(positions, compactDaily)
      : null;

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Portfolio P&L"
        caption="Real-price valuation using last-close from the daily quote feed"
      />
      <Body ready={ready} positions={positions} pnl={pnl} />
      {ready && positions.length > 0 && curve && curve.points.length > 0 && onToggleEquityChart ? (
        <div className="pt-2 border-t border-border-subtle">
          <PortfolioEquityChart
            curve={curve}
            collapsed={equityChartCollapsed}
            onToggleCollapsed={onToggleEquityChart}
          />
        </div>
      ) : null}
    </Card>
  );
}

function Body({
  ready,
  positions,
  pnl,
}: {
  ready: boolean;
  positions: PortfolioPosition[];
  pnl: PortfolioPnL;
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
        to see real P&L here.
      </p>
    );
  }

  if (pnl.rows.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          None of your positions have quote data yet.
        </p>
        {pnl.missing.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pnl.missing.map((s) => (
              <Tag key={s} className="font-data-mono">
                {s}
              </Tag>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const dayPnLLabel =
    pnl.totalDayPnLPct !== null
      ? `${fmtMoney(pnl.totalDayPnL)} (${fmtPct(pnl.totalDayPnLPct)})`
      : fmtMoney(pnl.totalDayPnL);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-border-subtle">
        <Stat
          label="Current value"
          value={fmtMoneyPlain(pnl.totalCurrentValue)}
        />
        <Stat label="Cost basis" value={fmtMoneyPlain(pnl.totalCostBasis)} muted />
        <Stat
          label="Total P&L"
          value={`${fmtMoney(pnl.totalPnL)} (${fmtPct(pnl.totalPnLPct)})`}
          colorClass={pnlColorClass(pnl.totalPnL)}
        />
        <Stat
          label="Day P&L"
          value={dayPnLLabel}
          colorClass={pnlColorClass(pnl.totalDayPnL)}
        />
      </div>
      <div className="rounded-lg border border-border-subtle overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                Symbol
              </TableHead>
              <TableHead className="hidden md:table-cell text-right font-label-caps text-label-caps text-text-secondary uppercase">
                Qty
              </TableHead>
              <TableHead className="hidden md:table-cell text-right font-label-caps text-label-caps text-text-secondary uppercase">
                Last
              </TableHead>
              <TableHead className="text-right font-label-caps text-label-caps text-text-secondary uppercase">
                Value
              </TableHead>
              <TableHead className="text-right font-label-caps text-label-caps text-text-secondary uppercase">
                Total P&L
              </TableHead>
              <TableHead className="text-right font-label-caps text-label-caps text-text-secondary uppercase">
                Day P&L
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pnl.rows.map((row) => (
              <TableRow key={row.symbol}>
                <TableCell className="font-data-mono text-data-mono">
                  {row.symbol}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right font-data-mono text-data-mono text-text-secondary">
                  {row.quantity}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right font-data-mono text-data-mono text-text-secondary">
                  {fmtMoneyPlain(row.lastClose, row.currency)}
                </TableCell>
                <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                  {fmtMoneyPlain(row.currentValue, row.currency)}
                </TableCell>
                <TableCell className={`text-right font-data-mono text-data-mono ${pnlColorClass(row.totalPnL)}`}>
                  <div>{fmtMoney(row.totalPnL, row.currency)}</div>
                  <div className="text-[11px]">{fmtPct(row.totalPnLPct)}</div>
                </TableCell>
                <TableCell className={`text-right font-data-mono text-data-mono ${pnlColorClass(row.dayPnL ?? 0)}`}>
                  {row.dayPnL !== null ? (
                    <>
                      <div>{fmtMoney(row.dayPnL, row.currency)}</div>
                      {row.dayPnLPct !== null ? (
                        <div className="text-[11px]">{fmtPct(row.dayPnLPct)}</div>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pnl.missing.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {pnl.missing.length} position{pnl.missing.length === 1 ? "" : "s"} not in quote universe: {pnl.missing.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  colorClass,
  muted,
}: {
  label: string;
  value: string;
  colorClass?: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="font-label-caps text-label-caps text-text-secondary uppercase">{label}</div>
      <div
        className={`font-data-mono text-data-mono ${colorClass ?? (muted ? "text-text-secondary" : "text-text-primary")}`}
      >
        {value}
      </div>
    </div>
  );
}
