import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TakeawayPanelProps {
  summary: string;
  posture?: string;
  generatedAt?: string;
  snapshotDate?: string;
}

export function TakeawayPanel({
  summary,
  posture,
  generatedAt,
  snapshotDate,
}: TakeawayPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Today&apos;s Takeaway</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">{summary}</p>
        {posture && (
          <>
            <Separator />
            <p className="text-sm">
              <span className="font-medium text-muted-foreground">Posture: </span>
              {posture.replace(/^[-•]\s*/, "")}
            </p>
          </>
        )}
        {(generatedAt || snapshotDate) && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Snapshot generated{" "}
              {generatedAt
                ? new Date(generatedAt).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }) + " UTC"
                : snapshotDate}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
