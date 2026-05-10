import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MoverRow, SectionHeader } from "@/components/ui/stitch";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";

interface TopMoversCardProps {
  snapshots: QuoteSnapshotMap;
  /** Excluded symbols (typically indices and macro). */
  exclude?: string[];
  /** Number of winners + losers to show. Default 4 each. */
  limit?: number;
  className?: string;
}

const DEFAULT_EXCLUDE = ["^GSPC", "^NDX", "GC=F", "BTC-USD"];

export function TopMoversCard({
  snapshots,
  exclude = DEFAULT_EXCLUDE,
  limit = 4,
  className,
}: TopMoversCardProps) {
  const ranked = Object.values(snapshots)
    .filter((s) => !exclude.includes(s.symbol) && s.dayDelta !== null)
    .sort((a, b) => Math.abs(b.dayDelta!.pct) - Math.abs(a.dayDelta!.pct))
    .slice(0, limit * 2);

  return (
    <Card className={`p-card-padding gap-4 ${className ?? ""}`}>
      <SectionHeader
        title="Top Movers"
        caption="Largest absolute day moves outside indices"
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
