"use client";

import { SentimentAreaChart } from "@/components/charts/sentiment-area-chart";
import type { EquityPoint } from "@/lib/backtest/engine";
import { fmtMoneyCompact } from "@/lib/utils/format";

interface BacktestChartProps {
  curve: EquityPoint[];
  initial: number;
}

export function BacktestChart({ curve, initial: _initial }: BacktestChartProps) {
  return (
    <SentimentAreaChart
      data={curve}
      yKey="equity"
      formatY={fmtMoneyCompact}
      height={300}
      formatXTick={(d) => d.slice(0, 7)}
      xTickGap={50}
      renderTooltip={(point) => (
        <div className="rounded-md border border-border-subtle bg-surface px-3 py-2 shadow-lg">
          <div className="font-data-mono text-data-mono text-text-primary">
            {fmtMoneyCompact(point.equity)}
          </div>
          <div className="font-label-caps text-label-caps text-text-secondary">
            {point.date}
          </div>
        </div>
      )}
    />
  );
}
