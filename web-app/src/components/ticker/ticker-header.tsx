"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/stitch";
import { getWatchlist } from "@/lib/storage/watchlist-store";

interface TickerHeaderProps {
  symbol: string;
  /** Optional friendly name (e.g. "NVIDIA Corporation") */
  name?: string;
  /** Optional sector / tag chips */
  tags?: string[];
}

export function TickerHeader({ symbol, name, tags }: TickerHeaderProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsWatching(getWatchlist().some((item) => item.symbol === symbol));
    setReady(true);
  }, [symbol]);

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-border-subtle/50">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="font-h1 text-h1 text-text-primary tracking-tight">{symbol}</h1>
          {name ? (
            <span className="font-h2 text-h2 text-text-secondary font-normal">{name}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {ready && isWatching ? <StatusBadge status="watching" /> : null}
          {(tags ?? []).map((tag) => (
            <span
              key={tag}
              className="font-badge text-badge px-2 py-1 rounded bg-surface-variant text-text-secondary border border-border-subtle"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
