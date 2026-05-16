"use client";

import { useEffect, useState } from "react";
import { PriceChart } from "@/components/ticker/price-chart";
import type { SentimentAreaReferenceLine } from "@/components/charts/sentiment-area-chart";
import { fmtMoney } from "@/lib/utils/format";
import type { QuoteBar } from "@/lib/quotes/types";
import type { Thesis, TradeLevel } from "@/lib/domain/thesis";
import { getThesis } from "@/lib/storage/thesis-store";
import { getDashboardSettings } from "@/lib/storage/dashboard-settings-store";

interface TickerChartWithLevelsProps {
  symbol: string;
  daily: QuoteBar[];
  currency?: string;
  /** Most recent close — used to flag in-range levels with `emphasis`. */
  currentPrice?: number;
}

function formatLevelLabel(level: TradeLevel, currency: string): string {
  const price = fmtMoney(level.price, currency);
  if (level.kind === "add") {
    const tranche = level.level ? ` L${level.level}` : "";
    return `Add${tranche} — ${price}`;
  }
  if (level.kind === "trim") {
    const tranche = level.level ? ` L${level.level}` : "";
    return `Trim${tranche} — ${price}`;
  }
  return `Sell — ${price}`;
}

// SPEC-026 W10.A — levels crossed within the last 7 days get the thicker
// stroke even when price has since recovered.
const RECENT_CROSSED_WINDOW_MS = 7 * 86_400_000;

function deriveReferenceLines(
  thesis: Thesis,
  currentPrice: number | undefined,
  proximityPct: number,
  currency: string,
): SentimentAreaReferenceLine[] {
  const now = Date.now();
  return thesis.tradeLevels
    .filter((lvl) => Number.isFinite(lvl.price) && lvl.price > 0)
    .map((lvl) => {
      const emphasis =
        typeof currentPrice === "number" && Number.isFinite(currentPrice)
          ? Math.abs((currentPrice - lvl.price) / lvl.price) * 100 <= proximityPct
          : false;
      let recentlyCrossed = false;
      if (lvl.lastCrossedAt) {
        const ts = new Date(lvl.lastCrossedAt).getTime();
        if (Number.isFinite(ts) && now - ts <= RECENT_CROSSED_WINDOW_MS) {
          recentlyCrossed = true;
        }
      }
      return {
        y: lvl.price,
        kind: lvl.kind,
        label: formatLevelLabel(lvl, currency),
        emphasis,
        recentlyCrossed,
      } satisfies SentimentAreaReferenceLine;
    });
}

/**
 * Client wrapper around PriceChart that reads the current thesis from
 * localStorage on mount and projects its `tradeLevels` as horizontal
 * reference lines on the chart. SSR returns the bare chart so the static
 * HTML hydrates without flashing.
 */
export function TickerChartWithLevels({
  symbol,
  daily,
  currency = "USD",
  currentPrice,
}: TickerChartWithLevelsProps) {
  const [referenceLines, setReferenceLines] = useState<SentimentAreaReferenceLine[] | undefined>(
    undefined,
  );

  useEffect(() => {
    const thesis = getThesis(symbol);
    if (!thesis || thesis.tradeLevels.length === 0) {
      setReferenceLines(undefined);
      return;
    }
    const settings = getDashboardSettings();
    setReferenceLines(
      deriveReferenceLines(thesis, currentPrice, settings.thesisProximityPct, currency),
    );
  }, [symbol, currentPrice, currency]);

  return (
    <PriceChart daily={daily} currency={currency} referenceLines={referenceLines} />
  );
}
