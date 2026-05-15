"use client";

import { ArrowLeft, Pencil, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionHeader, Tag } from "@/components/ui/stitch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { runBacktest, type BacktestResult } from "@/lib/backtest/engine";
import type { Strategy } from "@/lib/domain/strategy";
import type { QuoteBar } from "@/lib/quotes/types";
import { BacktestChart } from "./backtest-chart";

interface StrategyViewProps {
  strategy: Strategy;
  seriesBySymbol: Record<string, QuoteBar[]>;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TYPE_LABEL: Record<Strategy["type"], string> = {
  "buy-hold": "Buy & hold",
  "ma-crossover": "MA crossover",
  rsi: "RSI threshold",
  "price-threshold": "Price threshold",
};

function fmtDollar(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function describeStrategy(s: Strategy): string {
  switch (s.type) {
    case "buy-hold":
      return "Buy on first bar, hold to end.";
    case "ma-crossover":
      return `Buy when ${s.shortPeriod}-day MA crosses above ${s.longPeriod}-day MA, sell on cross-down.`;
    case "rsi":
      return `Buy when RSI(${s.period}) < ${s.buyThreshold}, sell when > ${s.sellThreshold}.`;
    case "price-threshold":
      return `Buy at price ≤ $${s.buyPrice}, sell at price ≥ $${s.sellPrice}.`;
  }
}

export function StrategyView({
  strategy,
  seriesBySymbol,
  onBack,
  onEdit,
  onDelete,
}: StrategyViewProps) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setRunning(true);
    // Defer to next tick so the spinner has a chance to render before the
    // synchronous backtest blocks the main thread.
    const handle = setTimeout(() => {
      setResult(runBacktest(strategy, seriesBySymbol));
      setRunning(false);
    }, 0);
    return () => clearTimeout(handle);
  }, [strategy, seriesBySymbol]);

  return (
    <article className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1" aria-hidden="true" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4 mr-1" aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="text-text-secondary hover:text-destructive"
          >
            <Trash2 className="size-4 mr-1" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete strategy?"
        description={`Remove "${strategy.name}" from your saved strategies. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <header className="space-y-2">
        <h1 className="font-h1 text-h1 text-text-primary">{strategy.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>{TYPE_LABEL[strategy.type]}</Tag>
          {strategy.symbols.map((s) => (
            <Tag key={s} className="font-data-mono">
              {s}
            </Tag>
          ))}
          <span className="font-label-caps text-label-caps text-text-secondary uppercase">
            ${strategy.initialCapital.toLocaleString()} ·{" "}
            {strategy.positionSizing.type === "equal-weight"
              ? "Equal weight"
              : `$${strategy.positionSizing.fixedAmount?.toLocaleString()} fixed`}
          </span>
        </div>
        <p className="font-body-compact text-body-compact text-text-secondary">
          {describeStrategy(strategy)}
        </p>
      </header>

      {running ? (
        <Card className="p-card-padding">
          <p className="text-sm text-text-secondary">
            <Play className="inline size-4 mr-1" /> Running backtest…
          </p>
        </Card>
      ) : result ? (
        <Results result={result} initial={strategy.initialCapital} />
      ) : null}
    </article>
  );
}

function Results({
  result,
  initial,
}: {
  result: BacktestResult;
  initial: number;
}) {
  const { stats, trades, equityCurve, errors } = result;
  return (
    <div className="space-y-4">
      {errors.length > 0 ? (
        <div
          role="alert"
          className="rounded p-3 bg-regime-risk-off/10 border border-regime-risk-off/30 text-regime-risk-off space-y-1"
        >
          <div className="font-label-caps text-label-caps uppercase">
            Backtest issues
          </div>
          {errors.map((e, i) => (
            <p key={i} className="font-body-compact text-body-compact">
              {e}
            </p>
          ))}
        </div>
      ) : null}

      <Card className="p-card-padding gap-4">
        <SectionHeader title="Backtest results" caption="Run completed against full available history." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-border-subtle">
          <Stat label="Final equity" value={`$${stats.finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <Stat
            label="Total return"
            value={`${fmtDollar(stats.totalReturn)} (${fmtPct(stats.totalReturnPct)})`}
            colorClass={stats.totalReturn > 0 ? "text-regime-risk-on" : stats.totalReturn < 0 ? "text-regime-risk-off" : ""}
          />
          <Stat
            label="Max drawdown"
            value={`${fmtDollar(-stats.maxDrawdown)} (${fmtPct(-stats.maxDrawdownPct)})`}
            colorClass="text-regime-risk-off"
          />
          <Stat
            label="Trades · Win rate"
            value={
              stats.winRate === null
                ? `${stats.numTrades} · —`
                : `${stats.numTrades} · ${stats.winRate.toFixed(0)}%`
            }
          />
        </div>
        <BacktestChart curve={equityCurve} initial={initial} />
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader title="Trades" caption={`${trades.length} executed`} />
        {trades.length === 0 ? (
          <p className="font-body-compact text-body-compact text-text-secondary">
            No trades fired during the backtest window.
          </p>
        ) : (
          <div className="rounded-lg border border-border-subtle overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                    Date
                  </TableHead>
                  <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                    Symbol
                  </TableHead>
                  <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                    Side
                  </TableHead>
                  <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                    Shares
                  </TableHead>
                  <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                    Price
                  </TableHead>
                  <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                    Value
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.slice(0, 50).map((t, i) => (
                  <TableRow key={`${t.date}-${t.symbol}-${i}`}>
                    <TableCell className="font-data-mono text-data-mono text-text-secondary">
                      {t.date}
                    </TableCell>
                    <TableCell className="font-data-mono text-data-mono text-text-primary">
                      {t.symbol}
                    </TableCell>
                    <TableCell
                      className={
                        "font-data-mono text-data-mono uppercase " +
                        (t.side === "buy" ? "text-regime-risk-on" : "text-regime-risk-off")
                      }
                    >
                      {t.side}
                    </TableCell>
                    <TableCell className="text-right font-data-mono text-data-mono">
                      {t.shares}
                    </TableCell>
                    <TableCell className="text-right font-data-mono text-data-mono">
                      ${t.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-data-mono text-data-mono">
                      ${t.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {trades.length > 50 ? (
              <div className="border-t border-border-subtle px-card-padding py-2 text-right font-label-caps text-label-caps text-text-secondary uppercase">
                Showing 50 of {trades.length}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="font-label-caps text-label-caps text-text-secondary uppercase">{label}</div>
      <div className={`font-data-mono text-data-mono ${colorClass ?? "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
