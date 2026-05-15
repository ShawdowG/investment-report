"use client";

import type { WatchlistStatus } from "@/lib/domain/watchlist";
import { cn } from "@/lib/utils";

export type StatusFilter = WatchlistStatus | "all";

const STATUS_ITEMS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "own", label: "Own" },
  { value: "watching", label: "Watching" },
  { value: "research", label: "Research" },
  { value: "avoid", label: "Avoid" },
];

interface WatchlistFiltersProps {
  status: StatusFilter;
  onStatusChange: (next: StatusFilter) => void;
  availableTags: string[];
  activeTags: Set<string>;
  onToggleTag: (tag: string) => void;
  availableSectors: string[];
  activeSectors: Set<string>;
  onToggleSector: (sector: string) => void;
  onClear: () => void;
  filteredCount: number;
  totalCount: number;
}

export function WatchlistFilters({
  status,
  onStatusChange,
  availableTags,
  activeTags,
  onToggleTag,
  availableSectors,
  activeSectors,
  onToggleSector,
  onClear,
  filteredCount,
  totalCount,
}: WatchlistFiltersProps) {
  const hasFilter =
    status !== "all" || activeTags.size > 0 || activeSectors.size > 0;

  if (totalCount === 0) return null;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3 space-y-3">
      <FilterRow label="Status">
        {STATUS_ITEMS.map((item) => (
          <Chip
            key={item.value}
            active={status === item.value}
            onClick={() => onStatusChange(item.value)}
          >
            {item.label}
          </Chip>
        ))}
      </FilterRow>
      {availableTags.length > 0 && (
        <FilterRow label="Tags">
          {availableTags.map((tag) => (
            <Chip
              key={tag}
              active={activeTags.has(tag)}
              onClick={() => onToggleTag(tag)}
            >
              {tag}
            </Chip>
          ))}
        </FilterRow>
      )}
      {availableSectors.length > 0 && (
        <FilterRow label="Sector">
          {availableSectors.map((sector) => (
            <Chip
              key={sector}
              active={activeSectors.has(sector)}
              onClick={() => onToggleSector(sector)}
            >
              {sector}
            </Chip>
          ))}
        </FilterRow>
      )}
      <div className="flex items-center justify-between pt-1 text-xs text-text-secondary">
        <span>
          {hasFilter
            ? `${filteredCount} of ${totalCount} shown`
            : `${totalCount} symbol${totalCount === 1 ? "" : "s"}`}
        </span>
        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="rounded text-text-secondary hover:text-text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-label-caps text-label-caps text-text-secondary uppercase w-16 pt-1 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        active
          ? "bg-primary-container text-on-primary-container border-primary-container"
          : "bg-surface-variant text-text-secondary border-border-subtle hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}
