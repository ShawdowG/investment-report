import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RegimeDot, Tag } from "@/components/ui/stitch";

interface LatestReportCardProps {
  title: string;
  summary: string;
  regime: string;
  mainDriver?: string;
  posture?: string;
  slug?: string;
  className?: string;
}

function regimeKey(regime: string): "risk-on" | "risk-off" | "neutral" {
  const k = regime.toLowerCase();
  if (k.includes("risk-on")) return "risk-on";
  if (k.includes("risk-off")) return "risk-off";
  return "neutral";
}

export function LatestReportCard({
  title,
  summary,
  regime,
  mainDriver,
  posture,
  slug,
  className,
}: LatestReportCardProps) {
  return (
    <Card className={`p-card-padding gap-6 ${className ?? ""}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <Tag className="mb-3 font-label-caps text-label-caps uppercase">LATEST REPORT</Tag>
          <h3 className="font-h2 text-h2 text-text-primary">{title}</h3>
        </div>
        {slug ? (
          <Link
            href={`/reports/${slug}`}
            className="shrink-0 inline-flex items-center gap-1 font-body-compact text-body-compact text-primary hover:text-primary-fixed-dim transition-colors"
          >
            Read full
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {summary ? (
        <p className="font-body-main text-body-main text-text-secondary leading-relaxed">
          {summary}
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border-subtle">
        <div className="space-y-1">
          <p className="font-label-caps text-label-caps text-text-secondary uppercase">Market regime</p>
          <RegimeDot regime={regimeKey(regime)} label={regime || "Neutral"} />
        </div>
        <div className="space-y-1">
          <p className="font-label-caps text-label-caps text-text-secondary uppercase">Main driver</p>
          <p className="font-body-compact text-body-compact text-text-primary">
            {mainDriver || "—"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-label-caps text-label-caps text-text-secondary uppercase">Our posture</p>
          <p className="font-body-compact text-body-compact text-text-primary">
            {posture || "—"}
          </p>
        </div>
      </div>
    </Card>
  );
}
