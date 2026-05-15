"use client";

import type { RangeOption } from "@/lib/quotes/chart-ranges";
import { cn } from "@/lib/utils";

interface RangePillsProps {
  ranges: RangeOption[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  className?: string;
}

export function RangePills({
  ranges,
  selectedIdx,
  onSelect,
  className,
}: RangePillsProps) {
  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
      {ranges.map((r, i) => (
        <button
          key={r.label}
          type="button"
          onClick={() => onSelect(i)}
          aria-pressed={i === selectedIdx}
          className={cn(
            "px-2.5 py-1 rounded font-label-caps text-label-caps uppercase transition-colors",
            i === selectedIdx
              ? "bg-primary-container text-on-primary-container"
              : "text-text-secondary hover:bg-surface-variant",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
