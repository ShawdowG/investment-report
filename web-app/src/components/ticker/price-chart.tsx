"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuoteBar } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

const RISK_ON = "#10b981";
const RISK_OFF = "#ef4444";

interface RangeOption {
  label: string;
  bars: number;
}

const RANGES: RangeOption[] = [
  { label: "1M", bars: 22 },
  { label: "3M", bars: 66 },
  { label: "6M", bars: 132 },
  { label: "YTD", bars: -1 },
  { label: "1Y", bars: 252 },
];

interface PriceChartProps {
  daily: QuoteBar[];
  currency?: string;
}

function ytdSlice(daily: QuoteBar[]): QuoteBar[] {
  if (daily.length === 0) return [];
  const year = daily[daily.length - 1].date.slice(0, 4);
  const startIdx = daily.findIndex((b) => b.date.startsWith(year));
  return startIdx === -1 ? daily : daily.slice(startIdx);
}

function fmtMoney(n: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: Array<{ payload?: { date: string; close: number } }>;
}

function PriceTooltip({ active, payload, currency }: TooltipRenderProps & { currency: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="font-data-mono text-data-mono text-text-primary">
        {fmtMoney(point.close, currency)}
      </div>
      <div className="font-label-caps text-label-caps text-text-secondary">{point.date}</div>
    </div>
  );
}

export function PriceChart({ daily, currency = "USD" }: PriceChartProps) {
  const [rangeIdx, setRangeIdx] = useState(4);
  const range = RANGES[rangeIdx];
  const slice =
    range.bars === -1 ? ytdSlice(daily) : daily.slice(-range.bars);

  if (slice.length < 2) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Not enough data for this range.
      </div>
    );
  }

  const isUp = slice[slice.length - 1].close >= slice[0].close;
  const color = isUp ? RISK_ON : RISK_OFF;

  const data = slice.map((b) => ({ date: b.date, close: b.close }));

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRangeIdx(i)}
            className={cn(
              "px-2.5 py-1 rounded font-label-caps text-label-caps uppercase transition-colors",
              i === rangeIdx
                ? "bg-primary-container text-on-primary-container"
                : "text-text-secondary hover:bg-surface-variant",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-border-subtle bg-surface p-2">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(value: string) => value.slice(5)}
              minTickGap={40}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => fmtMoney(value, currency)}
              width={70}
            />
            <Tooltip
              content={<PriceTooltip currency={currency} />}
              cursor={{ stroke: "rgba(255,255,255,0.15)" }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
