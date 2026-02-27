import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInline } from "@/components/md-renderer";

interface TakeawayPanelProps {
  checklist: string[];
}

export function TakeawayPanel({ checklist }: TakeawayPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">📌 Action Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        {checklist.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checklist items.</p>
        ) : (
          <ul className="space-y-2">
            {checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-1 shrink-0 text-muted-foreground">☑</span>
                <span>{formatInline(item.replace(/^[-•]\s*/, ""))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
