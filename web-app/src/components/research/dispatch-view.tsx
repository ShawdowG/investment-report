"use client";

import { useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tag } from "@/components/ui/stitch";
import type { ResearchDispatch } from "@/lib/domain/research-dispatch";
import { fmtDateTime } from "@/lib/utils/format";
import { MarkdownBody } from "./markdown-body";

interface DispatchViewProps {
  dispatch: ResearchDispatch;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DispatchView({ dispatch, onBack, onEdit, onDelete }: DispatchViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
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
            onClick={() => setConfirmDelete(true)}
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
          <MarkdownBody source={dispatch.body} />
        ) : (
          <p className="font-body-compact text-body-compact text-text-secondary">
            (No body)
          </p>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this dispatch?"
        description={`Delete “${dispatch.title}” from this browser? This cannot be undone.`}
        confirmLabel="Delete dispatch"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
  );
}
