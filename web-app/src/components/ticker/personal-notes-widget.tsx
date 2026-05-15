"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
import {
  addNote,
  deleteNote,
  getNotes,
} from "@/lib/storage/ticker-notes-store";
import type { TickerNote } from "@/lib/domain/ticker-note";

interface PersonalNotesWidgetProps {
  symbol: string;
}

function fmtTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

export function PersonalNotesWidget({ symbol }: PersonalNotesWidgetProps) {
  const [notes, setNotes] = useState<TickerNote[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setNotes(getNotes(symbol));
    setReady(true);
  }, [symbol]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write something before saving.");
      return;
    }
    setNotes(addNote(symbol, trimmed));
    setBody("");
    setError(null);
  }

  function handleDelete(id: string) {
    setNotes(deleteNote(symbol, id));
  }

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader title="Personal Notes" />
      <div className="rounded-lg bg-surface-container-low border border-border-subtle/50 p-4 min-h-[180px]">
        {!ready ? (
          <p className="font-body-compact text-body-compact text-text-secondary">
            Loading notes…
          </p>
        ) : notes.length === 0 ? (
          <p className="font-body-compact text-body-compact text-text-secondary">
            No notes yet for {symbol}.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-primary mt-2 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-body-compact text-body-compact text-text-primary whitespace-pre-wrap break-words">
                    {note.body}
                  </p>
                  <p className="font-data-mono text-[11px] text-text-secondary">
                    {fmtTimestamp(note.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  aria-label="Delete note"
                  className="text-text-secondary hover:text-destructive transition-colors p-1 rounded shrink-0"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="ticker-note-body" className="sr-only">
          Add a note about {symbol}
        </label>
        <textarea
          id="ticker-note-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (error) setError(null);
          }}
          placeholder={`Add a note about ${symbol}…`}
          rows={3}
          className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Add note
          </Button>
        </div>
      </form>
    </Card>
  );
}
