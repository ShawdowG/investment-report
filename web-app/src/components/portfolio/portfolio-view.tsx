"use client";

import { useEffect, useMemo, useState } from "react";
import { AddPositionForm } from "./add-position-form";
import { PortfolioTable } from "./portfolio-table";
import { PortfolioEquityChart } from "./portfolio-equity-chart";
import { Tag } from "@/components/ui/stitch";
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import {
  addPosition,
  getPortfolio,
  removePosition,
} from "@/lib/storage/portfolio-store";
import {
  getPortfolioPnL,
  type PortfolioPnL,
} from "@/lib/quotes/portfolio-pnl";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import type { CompactDailyMap } from "@/lib/quotes/compact-daily";
import { buildEquityCurve } from "@/lib/quotes/portfolio-equity";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/utils/format";

interface PortfolioViewProps {
  snapshots: QuoteSnapshotMap;
  compactDaily: CompactDailyMap;
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

function pnlColorClass(n: number): string {
  if (n > 0) return "text-regime-risk-on";
  if (n < 0) return "text-regime-risk-off";
  return "text-text-secondary";
}

export function PortfolioView({ snapshots, compactDaily }: PortfolioViewProps) {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [ready, setReady] = useState(false);
  // Equity chart starts expanded on /portfolio — users came here for detail.
  const [chartCollapsed, setChartCollapsed] = useState(false);

  useEffect(() => {
    setPositions(getPortfolio());
    setReady(true);
  }, []);

  const pnl = useMemo<PortfolioPnL>(
    () => (ready ? getPortfolioPnL(positions, snapshots) : EMPTY_PNL),
    [ready, positions, snapshots],
  );

  const curve = useMemo(
    () => (ready ? buildEquityCurve(positions, compactDaily) : null),
    [ready, positions, compactDaily],
  );

  function handleAdd(input: { symbol: string; quantity: number; avgPrice: number }) {
    setPositions(addPosition(input));
  }

  function handleRemove(symbol: string) {
    setPositions(removePosition(symbol));
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading portfolio…
      </div>
    );
  }

  const hasPositions = positions.length > 0;
  const hasPriced = pnl.rows.length > 0;
  const dayPnLLabel =
    pnl.totalDayPnLPct !== null
      ? `${fmtMoneySigned(pnl.totalDayPnL)} (${fmtPct(pnl.totalDayPnLPct)})`
      : fmtMoneySigned(pnl.totalDayPnL);

  return (
    <div className="space-y-4">
      <AddPositionForm onAdd={handleAdd} />

      {hasPositions && hasPriced ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Current value" value={fmtMoney(pnl.totalCurrentValue)} />
            <Stat label="Cost basis" value={fmtMoney(pnl.totalCostBasis)} muted />
            <Stat
              label="Total P&L"
              value={`${fmtMoneySigned(pnl.totalPnL)} (${fmtPct(pnl.totalPnLPct)})`}
              colorClass={pnlColorClass(pnl.totalPnL)}
            />
            <Stat
              label="Day P&L"
              value={dayPnLLabel}
              colorClass={pnlColorClass(pnl.totalDayPnL)}
            />
          </div>
        </div>
      ) : null}

      <PortfolioTable
        positions={positions}
        onRemove={handleRemove}
        pnlRows={hasPositions ? pnl.rows : undefined}
      />

      {hasPositions && pnl.missing.length > 0 ? (
        <div className="space-y-1">
          <p className="font-body-compact text-body-compact text-text-secondary">
            {pnl.missing.length} position{pnl.missing.length === 1 ? "" : "s"} without quote data
          </p>
          <div className="flex flex-wrap gap-1">
            {pnl.missing.map((s) => (
              <Tag key={s} className="font-data-mono">
                {s}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}

      {hasPositions && curve && curve.points.length > 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding">
          <PortfolioEquityChart
            curve={curve}
            collapsed={chartCollapsed}
            onToggleCollapsed={() => setChartCollapsed((v) => !v)}
          />
        </div>
      ) : null}

      <p className="text-xs text-text-secondary">
        Stored locally under{" "}
        <code className="rounded bg-surface-variant px-1 py-0.5 text-[10px]">portfolio_positions</code>.
        Real P&amp;L uses last-close prices from the daily quote feed.
      </p>
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
      <div className="font-label-caps text-label-caps text-text-secondary uppercase">
        {label}
      </div>
      <div
        className={`font-data-mono text-data-mono ${
          colorClass ?? (muted ? "text-text-secondary" : "text-text-primary")
        }`}
      >
        {value}
      </div>
    </div>
  );
}
