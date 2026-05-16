"use client";

import { useMemo, useState } from "react";
import { RangeDeltaHeader } from "@/components/charts/range-delta-header";
import { RangePills } from "@/components/charts/range-pills";
import {
  SentimentAreaChart,
  type SentimentAreaReferenceLine,
} from "@/components/charts/sentiment-area-chart";
import { RANGES, sliceForRange } from "@/lib/quotes/chart-ranges";
import type { QuoteBar } from "@/lib/quotes/types";

interface PriceChartProps {
  daily: QuoteBar[];
  currency?: string;
  /**
   * Optional horizontal reference lines (SPEC-023 trade-plan zones).
   * Plumbed straight through to the underlying SentimentAreaChart.
   */
  referenceLines?: SentimentAreaReferenceLine[];
}

function fmtMoney(n: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PriceChart({
  daily,
  currency = "USD",
  referenceLines,
}: PriceChartProps) {
  // Default to 1Y on first render — same as Google Finance.
  const [rangeIdx, setRangeIdx] = useState(4);
  const range = RANGES[rangeIdx];
  const data = useMemo(() => sliceForRange(daily, range), [daily, range]);

  if (data.length < 2) {
    return (
      <div className="space-y-3">
        <RangePills
          ranges={RANGES}
          selectedIdx={rangeIdx}
          onSelect={setRangeIdx}
        />
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          Not enough data for this range.
        </div>
      </div>
    );
  }

  const formatY = (n: number) => fmtMoney(n, currency);

  return (
    <div className="space-y-3">
      <RangeDeltaHeader
        start={data[0].close}
        end={data[data.length - 1].close}
        rangeLabel={range.label}
        formatAbs={formatY}
        right={
          <RangePills
            ranges={RANGES}
            selectedIdx={rangeIdx}
            onSelect={setRangeIdx}
            className="justify-end"
          />
        }
      />
      <SentimentAreaChart
        data={data}
        yKey="close"
        formatY={formatY}
        referenceLines={referenceLines}
      />
    </div>
  );
}
