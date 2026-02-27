import { Badge } from "@/components/ui/badge";

const SLOT_LABELS: Record<string, string> = {
  eu: "EU/Nordic Morning",
  "us-open": "US Open +15m",
  "pre-close": "US Pre-close",
};

interface HeaderBarProps {
  title?: string;
  date: string;
  slot: string;
}

export function HeaderBar({ title, date, slot }: HeaderBarProps) {
  const slotLabel = SLOT_LABELS[slot] ?? slot;
  const displayTitle = title ?? slotLabel;

  return (
    <div className="border-b border-border bg-card px-4 py-5">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {displayTitle}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {date} &middot; {slotLabel}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {slotLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
