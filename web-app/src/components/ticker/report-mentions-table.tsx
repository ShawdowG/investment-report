import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportItem } from "@/types/reports";

const SLOT_LABELS: Record<string, string> = {
  eu: "EU",
  "us-open": "US Open",
  "pre-close": "Pre-close",
};

interface ReportMentionsTableProps {
  symbol: string;
  items: ReportItem[];
  limit?: number;
}

export function ReportMentionsTable({ symbol, items, limit = 10 }: ReportMentionsTableProps) {
  const sorted = [...items].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.slot ?? "").localeCompare(a.slot ?? "");
  });
  const visible = sorted.slice(0, limit);
  const hasMore = sorted.length > visible.length;

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding">
        <p className="font-body-compact text-body-compact text-text-secondary">
          No report mentions yet for {symbol}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Date
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Slot
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Regime
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Title
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((item) => (
            <TableRow key={item.slug}>
              <TableCell className="font-data-mono text-data-mono text-text-secondary">
                {item.date}
              </TableCell>
              <TableCell className="font-body-compact text-body-compact text-text-secondary">
                {SLOT_LABELS[item.slot] ?? item.slot}
              </TableCell>
              <TableCell className="font-body-compact text-body-compact text-text-primary">
                {item.regime || "—"}
              </TableCell>
              <TableCell>
                <Link
                  href={`/reports/${item.slug}`}
                  className="inline-flex items-center gap-1 font-body-compact text-body-compact text-primary hover:text-primary-fixed-dim transition-colors"
                >
                  <span className="truncate max-w-[14rem]">{item.title || item.summary || item.slug}</span>
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore ? (
        <div className="border-t border-border-subtle px-card-padding py-2 text-right">
          <span className="font-body-compact text-body-compact text-text-secondary">
            Showing {visible.length} of {sorted.length} mentions
          </span>
        </div>
      ) : null}
    </div>
  );
}
