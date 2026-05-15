"use client";

import Link from "next/link";
import { Tag } from "@/components/ui/stitch";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { fmtMoney, fmtPct } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface TickersGridProps {
  snapshots: QuoteSnapshotMap;
}

function deltaToneClass(pct: number | null | undefined): string {
  if (pct == null) return "text-text-secondary";
  if (pct > 0) return "text-regime-risk-on";
  if (pct < 0) return "text-regime-risk-off";
  return "text-regime-risk-neutral";
}

export function TickersGrid({ snapshots }: TickersGridProps) {
  const symbols = Object.keys(snapshots).sort();

  if (symbols.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        No tickers indexed yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {symbols.map((symbol) => {
        const snap = snapshots[symbol];
        const pct = snap.dayDelta?.pct ?? null;
        return (
          <Link
            key={symbol}
            href={`/ticker/${encodeURIComponent(symbol)}`}
            className="group flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-variant p-3 transition-colors"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-data-mono text-data-mono text-text-primary">
                {symbol}
              </span>
              <span
                className={cn(
                  "font-data-mono text-xs",
                  deltaToneClass(pct),
                )}
              >
                {pct == null ? "—" : fmtPct(pct)}
              </span>
            </div>
            {snap.name ? (
              <span
                className="font-body-compact text-xs text-text-secondary truncate"
                title={snap.name}
              >
                {snap.name}
              </span>
            ) : null}
            <div className="flex items-center justify-between gap-2 mt-auto pt-1">
              <span className="font-data-mono text-data-mono text-text-primary">
                {fmtMoney(snap.lastClose, snap.currency)}
              </span>
              {snap.sector ? (
                <Tag className="truncate max-w-[60%]" title={snap.sector}>
                  {snap.sector}
                </Tag>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
