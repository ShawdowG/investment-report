import { Card } from "@/components/ui/card";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { cn } from "@/lib/utils";

interface IndexPulseRowProps {
  snapshots: QuoteSnapshotMap;
  symbols: string[];
}

const FRIENDLY: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^NDX": "Nasdaq 100",
  "BTC-USD": "Bitcoin",
  "GC=F": "Gold",
};

function fmtPrice(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function IndexPulseRow({ snapshots, symbols }: IndexPulseRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-stack-gap">
      {symbols.map((symbol) => {
        const snap = snapshots[symbol];
        const pct = snap?.dayDelta?.pct ?? null;
        const colorClass =
          pct === null
            ? "text-text-secondary"
            : pct > 0
              ? "text-regime-risk-on"
              : pct < 0
                ? "text-regime-risk-off"
                : "text-text-secondary";
        return (
          <Card key={symbol} className="p-card-padding gap-1">
            <div className="font-label-caps text-label-caps text-text-secondary uppercase">
              {FRIENDLY[symbol] ?? symbol}
            </div>
            <div className="font-data-mono text-data-mono text-text-primary text-lg">
              {snap ? fmtPrice(snap.lastClose) : "—"}
            </div>
            <div className={cn("font-data-mono text-data-mono", colorClass)}>
              {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
