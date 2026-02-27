"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReportItem } from "@/types/reports";
import Link from "next/link";

const SLOT_LABELS: Record<string, string> = {
  eu: "EU Morning",
  "us-open": "US Open",
  "pre-close": "Pre-close",
};

const REGIME_COLORS: Record<string, string> = {
  "risk-on": "bg-green-100 text-green-800 border-green-200",
  "risk-off": "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

function regimeClass(regime: string): string {
  const key = regime.toLowerCase().replace(/\s+/g, "-");
  return REGIME_COLORS[key] ?? REGIME_COLORS["neutral"];
}

interface ReportsFilterProps {
  items: ReportItem[];
}

export function ReportsFilter({ items }: ReportsFilterProps) {
  const [activeSlot, setActiveSlot] = useState<string>("all");

  const filtered =
    activeSlot === "all" ? items : items.filter((i) => i.slot === activeSlot);

  const FILTER_SLOTS = [
    { value: "all", label: "All" },
    { value: "eu", label: "EU" },
    { value: "us-open", label: "US Open" },
    { value: "pre-close", label: "Pre-close" },
  ];

  return (
    <div className="space-y-4">
      {/* Slot filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_SLOTS.map(({ value, label }) => (
          <Button
            key={value}
            variant={activeSlot === value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveSlot(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Report list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports found.</p>
        ) : (
          filtered.map((item) => (
            <Link
              key={item.slug}
              href={`/reports/${item.slug}`}
              className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {item.date} &middot;{" "}
                    <span className="text-muted-foreground">
                      {SLOT_LABELS[item.slot] ?? item.slot}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {item.regime && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs", regimeClass(item.regime))}
                    >
                      {item.regime}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} report{filtered.length !== 1 ? "s" : ""}
        {activeSlot !== "all" ? ` · ${SLOT_LABELS[activeSlot] ?? activeSlot}` : ""}
      </p>
    </div>
  );
}
