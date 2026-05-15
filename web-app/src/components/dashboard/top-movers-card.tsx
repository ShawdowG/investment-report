import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MoverRow, SectionHeader } from "@/components/ui/stitch";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";

interface TopMoversCardProps {
  snapshots: QuoteSnapshotMap;
  /** Total number of rows to show, sorted by |day Δ%| desc. */
  limit?: number;
  /** Symbols to drop from the pool (typically the index/macro set). */
  exclude?: string[];
  /** If provided, only these symbols are considered. */
  includeOnly?: string[];
  /** Caption hint about which pool we're drawing from. */
  sourceLabel?: "universe" | "watchlist";
  className?: string;
}

export function TopMoversCard({
  snapshots,
  limit = 8,
  exclude = [],
  includeOnly,
  sourceLabel = "universe",
  className,
}: TopMoversCardProps) {
  const excludeSet = new Set(exclude);
  const includeSet = includeOnly ? new Set(includeOnly) : null;

  const ranked = Object.values(snapshots)
    .filter((s) => {
      if (s.dayDelta === null) return false;
      if (excludeSet.has(s.symbol)) return false;
      if (includeSet && !includeSet.has(s.symbol)) return false;
      return true;
    })
    .sort((a, b) => Math.abs(b.dayDelta!.pct) - Math.abs(a.dayDelta!.pct))
    .slice(0, limit);

  const caption =
    sourceLabel === "watchlist"
      ? `Largest absolute day moves in your watchlist`
      : `Largest absolute day moves outside indices`;

  return (
    <Card className={`p-card-padding gap-4 ${className ?? ""}`}>
      <SectionHeader
        title="Top Movers"
        caption={caption}
        action={<TrendingUp className="size-5 text-text-secondary" aria-hidden="true" />}
      />
      {ranked.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No mover data yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {ranked.map((s) => (
            <Link
              key={s.symbol}
              href={`/ticker/${encodeURIComponent(s.symbol)}`}
              className="block hover:opacity-95 transition-opacity"
            >
              <MoverRow
                ticker={s.symbol}
                name={s.name}
                price={s.lastClose}
                pct={s.dayDelta!.pct}
              />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
