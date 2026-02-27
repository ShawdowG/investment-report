import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface DiscussionPanelProps {
  alpha?: string[];
  beta?: string[];
  agreement?: string;
  disagreement?: string;
  resolution?: string;
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 shrink-0 text-muted-foreground">–</span>
          <span>{item.replace(/^[-•–]\s*/, "")}</span>
        </li>
      ))}
    </ul>
  );
}

export function DiscussionPanel({
  alpha = [],
  beta = [],
  agreement,
  disagreement,
  resolution,
}: DiscussionPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alpha vs Beta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Alpha — Strategic
            </p>
            <BulletList items={alpha} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Beta — Tactical
            </p>
            <BulletList items={beta} />
          </div>
        </div>

        {(agreement || disagreement || resolution) && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              {agreement && (
                <p>
                  <span className="font-medium">Agreement: </span>
                  <span className="text-muted-foreground">{agreement}</span>
                </p>
              )}
              {disagreement && (
                <p>
                  <span className="font-medium">Disagreement: </span>
                  <span className="text-muted-foreground">{disagreement}</span>
                </p>
              )}
              {resolution && (
                <p>
                  <span className="font-medium">Resolution: </span>
                  <span className="text-muted-foreground">{resolution}</span>
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
