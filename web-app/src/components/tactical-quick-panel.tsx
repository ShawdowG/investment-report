import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TacticalQuickPanelProps {
  beta?: string[];
  resolution?: string;
  regime?: string;
}

function clean(s = "") {
  return s.replace(/^[-•–]\s*/, "").trim();
}

function regimeTone(regime: string): "go" | "caution" | "neutral" {
  const r = regime.toLowerCase();
  if (/risk.?off|bearish|defensive/.test(r)) return "caution";
  if (/risk.?on|bullish|rally/.test(r)) return "go";
  return "neutral";
}

const TONE_STYLES = {
  go: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  caution: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function TacticalQuickPanel({
  beta = [],
  resolution = "",
  regime = "",
}: TacticalQuickPanelProps) {
  const posture = clean(beta[0]) || "No posture available";
  const trigger = clean(beta[1]) || "No trigger specified";
  const invalidation = clean(resolution) || clean(beta[2]) || "No invalidation criteria";
  const tone = regimeTone(regime);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">⚡ Tactical Quick Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Risk Posture
            </p>
            <Badge variant="secondary" className={TONE_STYLES[tone]}>
              {regime || "Unknown"}
            </Badge>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {posture}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trigger
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {trigger}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invalidation
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {invalidation}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
