import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/stitch";
import { getNewsForTicker } from "@/lib/news";

interface LatestIntelligenceCardProps {
  symbol: string;
}

export function LatestIntelligenceCard({ symbol }: LatestIntelligenceCardProps) {
  const items = getNewsForTicker(symbol);
  if (items.length === 0) return null;

  const top = items[0];

  return (
    <Card variant="accentLeft" className="p-card-padding gap-3">
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1">
          <Tag className="font-label-caps text-label-caps uppercase">Latest Intelligence</Tag>
          <h2 className="font-h2 text-h2 text-text-primary">{top.headline}</h2>
        </div>
        {top.publishedAt ? (
          <Tag className="font-label-caps text-label-caps uppercase shrink-0">
            {top.publishedAt}
          </Tag>
        ) : null}
      </div>
      <p className="font-body-compact text-body-compact text-text-secondary">
        Source: {top.source}
        {items.length > 1 ? ` · +${items.length - 1} more` : ""}
      </p>
    </Card>
  );
}
