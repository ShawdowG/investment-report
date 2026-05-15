"use client";

import { useState, type ChangeEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MarkdownBody } from "@/components/research/markdown-body";
import { fmtDateTime } from "@/lib/utils/format";
import type { ResearchNote } from "@/lib/domain/thesis";
import { cn } from "@/lib/utils";

interface ThesisNotesProps {
  notes: ResearchNote[];
  onChange: (next: ResearchNote[]) => void;
}

/**
 * Multi-note section for a thesis. Each note has a title + markdown body and
 * toggles between edit and view (rendered through MarkdownBody). New notes get
 * a crypto.randomUUID() id and ISO `createdAt`; edits bump `updatedAt`. Delete
 * is confirmation-gated.
 */
export function ThesisNotes({ notes, onChange }: ThesisNotesProps) {
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function isEditing(id: string): boolean {
    return editingIds.has(id);
  }

  function setEditing(id: string, value: boolean) {
    setEditingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function addNote() {
    const now = new Date().toISOString();
    const note: ResearchNote = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `note-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: "",
      body: "",
      createdAt: now,
    };
    onChange([note, ...notes]);
    setEditing(note.id, true);
  }

  function updateNote(id: string, patch: Partial<ResearchNote>) {
    const now = new Date().toISOString();
    onChange(
      notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)),
    );
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    onChange(notes.filter((n) => n.id !== pendingDeleteId));
    setEditing(pendingDeleteId, false);
    setPendingDeleteId(null);
  }

  const pendingNote = pendingDeleteId
    ? notes.find((n) => n.id === pendingDeleteId)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-body-compact text-body-compact text-text-secondary">
          {notes.length === 0
            ? "No notes yet — paste a ChatGPT response, log an observation, or transcribe a call."
            : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNote}
        >
          + Add note
        </Button>
      </div>

      {notes.map((note) => {
        const editing = isEditing(note.id);
        const stamp = note.updatedAt && note.updatedAt !== note.createdAt
          ? `Updated ${fmtDateTime(note.updatedAt)}`
          : `Created ${fmtDateTime(note.createdAt)}`;
        return (
          <div
            key={note.id}
            className="rounded-md border border-border-subtle bg-surface p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              {editing ? (
                <input
                  aria-label="Note title"
                  type="text"
                  value={note.title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateNote(note.id, { title: e.target.value })
                  }
                  placeholder="Untitled note"
                  className="flex-1 rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              ) : (
                <h3 className="flex-1 font-h2 text-h2 text-text-primary">
                  {note.title || "Untitled note"}
                </h3>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(note.id, !editing)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  {editing ? "View" : "Edit"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDeleteId(note.id)}
                  className="text-text-secondary hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Delete note</span>
                </Button>
              </div>
            </div>
            <div className="font-label-caps text-label-caps uppercase text-text-secondary">
              {stamp}
            </div>
            {editing ? (
              <textarea
                aria-label="Note body (markdown)"
                value={note.body}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  updateNote(note.id, { body: e.target.value })
                }
                rows={8}
                placeholder="Markdown supported — bullets, headers, links."
                className={cn(
                  "w-full rounded-md border border-border-subtle bg-surface-elevated px-2 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed",
                )}
              />
            ) : note.body ? (
              <MarkdownBody source={note.body} />
            ) : (
              <p className="font-body-compact text-body-compact text-text-secondary italic">
                Empty — click Edit to add content.
              </p>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this note?"
        description={
          pendingNote
            ? `Remove "${pendingNote.title || "Untitled note"}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
