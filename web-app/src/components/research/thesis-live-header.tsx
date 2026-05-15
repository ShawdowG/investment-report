"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { QuoteSnapshot } from "@/lib/quotes/snapshots";
import type { CompactBar } from "@/lib/quotes/compact-daily";
import { fmtMoney, fmtPct } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface ThesisLiveHeaderProps {
  symbol: string;
  snapshot?: QuoteSnapshot;
  compactDaily?: CompactBar[];
}

/** Compute the min/max close from the last ~1y of bars. */
function compute52w(bars: CompactBar[]): { high: number; low: number } | null {
  if (bars.length === 0) return null;
  const slice = bars.slice(-252);
  let high = -Infinity;
  let low = Infinity;
  for (const b of slice) {
    if (b.close > high) high = b.close;
    if (b.close < low) low = b.close;
  }
  if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
  return { high, low };
}

const RISK_ON = "#10b981";
const RISK_OFF = "#ef4444";

/**
 * Sticky top-of-page strip showing the live context for a thesis page:
 * symbol + name, current price, day Δ%, last-22-bar sparkline (~1 month),
 * and the 52w range. Visible while the user scrolls the form below.
 */
export function ThesisLiveHeader({
  symbol,
  snapshot,
  compactDaily,
}: ThesisLiveHeaderProps) {
  // Defer the ResponsiveContainer until after hydration — otherwise it logs a
  // recharts width(-1)/height(-1) warning during SSR/SSG.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dayPct = snapshot?.dayDelta?.pct ?? null;
  const deltaClass =
    dayPct === null
      ? "text-text-secondary"
      : dayPct > 0
        ? "text-regime-risk-on"
        : dayPct < 0
          ? "text-regime-risk-off"
          : "text-text-secondary";
  const sparkBars = (compactDaily ?? []).slice(-22);
  const sparkColor = sparkBars.length >= 2
    ? sparkBars[sparkBars.length - 1].close >= sparkBars[0].close
      ? RISK_ON
      : RISK_OFF
    : RISK_ON;
  const range = compute52w(compactDaily ?? []);
  const currency = snapshot?.currency ?? "USD";

  return (
    <div className="sticky top-0 z-30 py-2 px-3 -mx-3 bg-surface-elevated/95 backdrop-blur border-b border-border-subtle">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-data-mono text-h2 text-text-primary">{symbol}</span>
          {snapshot?.name ? (
            <span className="font-body-compact text-body-compact text-text-secondary truncate max-w-[14rem]">
              {snapshot.name}
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-3">
          {snapshot ? (
            <>
              <span className="font-data-mono text-h2 text-text-primary">
                {fmtMoney(snapshot.lastClose, currency)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-data-mono text-body-compact",
                  deltaClass,
                )}
              >
                {dayPct === null ? (
                  "—"
                ) : (
                  <>
                    {dayPct > 0 ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : dayPct < 0 ? (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    ) : null}
                    {fmtPct(dayPct)}
                  </>
                )}
              </span>
            </>
          ) : (
            <span className="font-body-compact text-body-compact text-text-secondary">
              No quote
            </span>
          )}
        </div>
        <div className="hidden md:block flex-1 max-w-[10rem]">
          {mounted && sparkBars.length >= 2 ? (
            <div className="h-10" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sparkBars}
                  margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
                >
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={sparkColor}
                    strokeWidth={1.5}
                    fill={sparkColor}
                    fillOpacity={0.18}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
        <div className="font-data-mono text-body-compact text-text-secondary">
          {range ? (
            <span>
              52w {fmtMoney(range.low, currency)} – {fmtMoney(range.high, currency)}
            </span>
          ) : (
            <span>52w —</span>
          )}
        </div>
      </div>
    </div>
  );
}
