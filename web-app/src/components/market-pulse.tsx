import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const REGIME_COLORS: Record<string, string> = {
  "risk-on": "bg-green-100 text-green-800 border-green-200",
  "risk-off": "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200",
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
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">Market Pulse</CardTitle>
          <Badge
            variant="outline"
            className={cn("text-xs font-medium", regimeVariant(regime))}
          >
            {regime}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{summary}</p>
        {pulse.length > 0 && (
          <ul className="space-y-1">
            {pulse.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-muted-foreground">•</span>
                <span>{item.replace(/^[-•]\s*/, "")}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
