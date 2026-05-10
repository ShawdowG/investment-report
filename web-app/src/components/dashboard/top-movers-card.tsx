import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MoverRow, SectionHeader } from "@/components/ui/stitch";
import type { MoverEntry } from "@/types/reports";

interface TopMoversCardProps {
  movers: MoverEntry[];
  /** Cap the number of rows rendered. Default 4 to match Stitch dashboard. */
  limit?: number;
  className?: string;
}

export function TopMoversCard({ movers, limit = 4, className }: TopMoversCardProps) {
  const ranked = movers
    .filter((m): m is MoverEntry & { pct: number } => typeof m.pct === "number")
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, limit);

  return (
    <Card className={`p-card-padding gap-4 ${className ?? ""}`}>
      <SectionHeader
        title="Top Movers"
        action={<TrendingUp className="size-5 text-text-secondary" aria-hidden="true" />}
      />
      {ranked.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No mover data in today&apos;s report yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {ranked.map((m) => (
            <MoverRow
              key={m.ticker}
              ticker={m.ticker}
              name={m.name}
              price={m.price}
              pct={m.pct}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
