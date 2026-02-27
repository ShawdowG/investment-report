import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatInline } from "@/components/md-renderer";

const REGIME_COLORS: Record<string, string> = {
  "risk-on":  "bg-green-900/40 text-green-300 border-green-700",
  "risk-off": "bg-red-900/40 text-red-300 border-red-700",
  neutral:    "bg-zinc-700/40 text-zinc-300 border-zinc-600",
  mixed:      "bg-yellow-900/40 text-yellow-300 border-yellow-700",
};

function regimeVariant(regime: string): string {
  const key = regime.toLowerCase().replace(/\s+/g, "-");
  return REGIME_COLORS[key] ?? REGIME_COLORS["neutral"];
}

interface MarketPulseProps {
  regime: string;
  summary: string;
  pulse?: string[];
}

export function MarketPulse({ regime, summary, pulse = [] }: MarketPulseProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg">📈 Market Pulse</CardTitle>
          <Badge
            variant="outline"
            className={cn("text-xs font-medium", regimeVariant(regime))}
          >
            {regime}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        {pulse.length > 0 && (
          <ul className="space-y-2">
            {pulse.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-1 shrink-0 text-muted-foreground">•</span>
                <span>{formatInline(item.replace(/^[-•]\s*/, ""))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
