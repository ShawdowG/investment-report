"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/backtest/engine";

interface BacktestChartProps {
  curve: EquityPoint[];
  initial: number;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: Array<{ payload?: { date: string; equity: number } }>;
}

function fmtDollar(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function EquityTooltip({ active, payload }: TooltipRenderProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="font-data-mono text-data-mono text-text-primary">
        {fmtDollar(point.equity)}
      </div>
      <div className="font-label-caps text-label-caps text-text-secondary">{point.date}</div>
    </div>
  );
}

export function BacktestChart({ curve, initial }: BacktestChartProps) {
  if (curve.length < 2) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Not enough data for an equity curve.
      </div>
    );
  }
  const final = curve[curve.length - 1].equity;
  const isUp = final >= initial;
  const color = isUp ? "#10b981" : "#ef4444";

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-2">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={(value: string) => value.slice(0, 7)}
            minTickGap={50}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={(value: number) => fmtDollar(value)}
            width={70}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<EquityTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
          <Line
            type="monotone"
            dataKey="equity"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
