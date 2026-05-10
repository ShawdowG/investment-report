"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/stitch";
import type { ResearchDispatch } from "@/lib/domain/research-dispatch";

interface DispatchViewProps {
  dispatch: ResearchDispatch;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function DispatchView({ dispatch, onBack, onEdit, onDelete }: DispatchViewProps) {
  return (
    <article className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Delete this dispatch?")) onDelete();
            }}
            className="text-text-secondary hover:text-destructive"
          >
            <Trash2 className="size-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
      <header className="space-y-2">
        <h1 className="font-h1 text-h1 text-text-primary">{dispatch.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {dispatch.ticker ? <Tag className="font-data-mono">{dispatch.ticker}</Tag> : null}
          <span className="font-label-caps text-label-caps text-text-secondary uppercase">
            Created {fmtDateTime(dispatch.createdAt)}
          </span>
          {dispatch.updatedAt ? (
            <span className="font-label-caps text-label-caps text-text-secondary uppercase">
              · Edited {fmtDateTime(dispatch.updatedAt)}
            </span>
          ) : null}
        </div>
      </header>
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding">
        {dispatch.body ? (
          <pre className="whitespace-pre-wrap break-words font-body-main text-body-main text-text-primary leading-relaxed">
            {dispatch.body}
          </pre>
        ) : (
          <p className="font-body-compact text-body-compact text-text-secondary">
            (No body)
          </p>
        )}
      </div>
    </article>
  );
}
