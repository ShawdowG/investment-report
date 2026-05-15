"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader, Tag } from "@/components/ui/stitch";
import type { ResearchDispatch } from "@/lib/domain/research-dispatch";
import { fmtDate } from "@/lib/utils/format";

interface DispatchListProps {
  items: ResearchDispatch[];
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function DispatchList({ items, onSelect, onNew }: DispatchListProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Research dispatches"
        caption="Your published market views, post-mortems, and ticker theses."
        action={
          <Button type="button" size="sm" onClick={onNew}>
            <Plus className="size-4 mr-1" />
            New dispatch
          </Button>
        }
      />
      {items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          No dispatches yet. Click <span className="font-semibold">New dispatch</span> above to write your first.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                className="w-full text-left rounded-lg border border-border-subtle bg-surface px-card-padding py-3 hover:bg-surface-variant/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="font-h2 text-h2 text-text-primary truncate">{d.title}</h3>
                  {d.ticker ? <Tag className="font-data-mono shrink-0">{d.ticker}</Tag> : null}
                </div>
                <div className="flex items-center gap-2 font-label-caps text-label-caps text-text-secondary uppercase">
                  <span>{fmtDate(d.createdAt)}</span>
                  {d.updatedAt ? <span>· edited {fmtDate(d.updatedAt)}</span> : null}
                </div>
                {d.body ? (
                  <p className="mt-2 font-body-compact text-body-compact text-text-secondary line-clamp-2">
                    {d.body}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
