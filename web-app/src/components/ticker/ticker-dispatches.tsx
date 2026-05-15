"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
import type { ResearchDispatch } from "@/lib/domain/research-dispatch";
import { getDispatches } from "@/lib/storage/research-dispatches-store";
import { fmtDate } from "@/lib/utils/format";

interface TickerDispatchesProps {
  symbol: string;
}

export function TickerDispatches({ symbol }: TickerDispatchesProps) {
  const [items, setItems] = useState<ResearchDispatch[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(getDispatches().filter((d) => d.ticker === symbol));
    setReady(true);
  }, [symbol]);

  const caption = ready
    ? items.length === 0
      ? `No dispatches mentioning ${symbol} yet — write one in /research`
      : `${items.length} writeup${items.length === 1 ? "" : "s"} mentioning ${symbol}`
    : undefined;

  return (
    <section aria-label={`Research dispatches mentioning ${symbol}`}>
      <Card className="p-card-padding gap-3">
        <SectionHeader title="Your dispatches" caption={caption} />
        {ready && items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {items.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/research?id=${encodeURIComponent(d.id)}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-surface-variant/30 px-3 py-2 hover:bg-surface-variant/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-body-compact text-body-compact text-text-primary truncate">
                      {d.title}
                    </div>
                    <div className="font-label-caps text-label-caps text-text-secondary uppercase">
                      {fmtDate(d.updatedAt ?? d.createdAt)}
                    </div>
                  </div>
                  <ArrowRight
                    className="size-4 text-text-secondary shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  );
}
