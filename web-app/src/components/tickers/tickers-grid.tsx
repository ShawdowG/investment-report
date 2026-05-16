"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Chip, Tag } from "@/components/ui/stitch";
import type { QuoteSnapshot, QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { fmtMoney, fmtPct } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface TickersGridProps {
  snapshots: QuoteSnapshotMap;
}

type SortKey = "alpha" | "delta-desc" | "delta-asc" | "sector";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "alpha", label: "Alphabetical" },
  { key: "delta-desc", label: "Day Δ ▼" },
  { key: "delta-asc", label: "Day Δ ▲" },
  { key: "sector", label: "Sector" },
];

function deltaToneClass(pct: number | null | undefined): string {
  if (pct == null) return "text-text-secondary";
  if (pct > 0) return "text-regime-risk-on";
  if (pct < 0) return "text-regime-risk-off";
  return "text-regime-risk-neutral";
}

function sortSnapshots(list: QuoteSnapshot[], sort: SortKey): QuoteSnapshot[] {
  const copy = [...list];
  switch (sort) {
    case "delta-desc":
      copy.sort((a, b) => {
        const pa = a.dayDelta?.pct ?? -Infinity;
        const pb = b.dayDelta?.pct ?? -Infinity;
        if (pb !== pa) return pb - pa;
        return a.symbol.localeCompare(b.symbol);
      });
      return copy;
    case "delta-asc":
      copy.sort((a, b) => {
        const pa = a.dayDelta?.pct ?? Infinity;
        const pb = b.dayDelta?.pct ?? Infinity;
        if (pa !== pb) return pa - pb;
        return a.symbol.localeCompare(b.symbol);
      });
      return copy;
    case "sector":
      copy.sort((a, b) => {
        const sa = a.sector ?? "";
        const sb = b.sector ?? "";
        if (sa !== sb) {
          if (!sa) return 1;
          if (!sb) return -1;
          return sa.localeCompare(sb);
        }
        return a.symbol.localeCompare(b.symbol);
      });
      return copy;
    case "alpha":
    default:
      copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
      return copy;
  }
}

export function TickersGrid({ snapshots }: TickersGridProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("alpha");

  const all = useMemo(() => Object.values(snapshots), [snapshots]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter((snap) => {
          if (snap.symbol.toLowerCase().includes(q)) return true;
          if (snap.name && snap.name.toLowerCase().includes(q)) return true;
          return false;
        })
      : all;
    return sortSnapshots(filtered, sort);
  }, [all, query, sort]);

  if (all.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        No tickers indexed yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex items-center bg-surface-variant rounded-full px-4 py-2 w-full sm:w-72 border border-border-subtle focus-within:border-primary/60 transition-colors"
          role="search"
        >
          <Search
            className="size-4 text-text-secondary mr-2 shrink-0"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by symbol or name…"
            autoComplete="off"
            spellCheck={false}
            className="bg-transparent border-0 font-body-compact text-body-compact text-text-primary p-0 w-full placeholder:text-text-secondary focus:outline-none focus:ring-0"
            aria-label="Filter tickers"
          />
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Sort tickers"
        >
          {SORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              active={opt.key === sort}
              onClick={() => setSort(opt.key)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          No tickers match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {visible.map((snap) => {
            const pct = snap.dayDelta?.pct ?? null;
            return (
              <Link
                key={snap.symbol}
                href={`/ticker/${encodeURIComponent(snap.symbol)}`}
                className="group flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-variant p-3 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-data-mono text-data-mono text-text-primary">
                    {snap.symbol}
                  </span>
                  <span
                    className={cn(
                      "font-data-mono text-xs",
                      deltaToneClass(pct),
                    )}
                  >
                    {pct == null ? "—" : fmtPct(pct)}
                  </span>
                </div>
                {snap.name ? (
                  <span
                    className="font-body-compact text-xs text-text-secondary truncate"
                    title={snap.name}
                  >
                    {snap.name}
                  </span>
                ) : null}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  <span className="font-data-mono text-data-mono text-text-primary">
                    {fmtMoney(snap.lastClose, snap.currency)}
                  </span>
                  {snap.sector ? (
                    <Tag className="truncate max-w-[60%]" title={snap.sector}>
                      {snap.sector}
                    </Tag>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
