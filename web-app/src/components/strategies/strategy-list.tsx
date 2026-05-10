"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/stitch";
import type { Strategy } from "@/lib/domain/strategy";

interface StrategyListProps {
  items: Strategy[];
  onSelect: (id: string) => void;
  onNew: () => void;
}

const TYPE_LABEL: Record<Strategy["type"], string> = {
  "buy-hold": "Buy & hold",
  "ma-crossover": "MA crossover",
  rsi: "RSI",
  "price-threshold": "Price threshold",
};

export function StrategyList({ items, onSelect, onNew }: StrategyListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onNew}>
          <Plus className="size-4 mr-1" aria-hidden="true" />
          New strategy
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          No strategies yet. Click <span className="font-semibold">New strategy</span> above to define one.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className="w-full text-left rounded-lg border border-border-subtle bg-surface px-card-padding py-3 hover:bg-surface-variant/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="font-h2 text-h2 text-text-primary truncate">{s.name}</h3>
                  <Tag className="shrink-0">{TYPE_LABEL[s.type]}</Tag>
                </div>
                <div className="font-label-caps text-label-caps text-text-secondary uppercase">
                  {s.symbols.length} symbol{s.symbols.length === 1 ? "" : "s"} ·{" "}
                  ${s.initialCapital.toLocaleString()} initial
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
