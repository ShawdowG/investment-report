"use client";

import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface SymbolPickerProps {
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function SymbolPicker({ available, selected, onChange }: SymbolPickerProps) {
  const [draft, setDraft] = useState("");

  function add(symbol: string) {
    const upper = symbol.trim().toUpperCase();
    if (!upper) return;
    if (selected.includes(upper)) return;
    onChange([...selected, upper]);
  }

  function remove(symbol: string) {
    onChange(selected.filter((s) => s !== symbol));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add(draft);
    setDraft("");
  }

  const suggestions = draft
    ? available
        .filter(
          (s) =>
            s.toUpperCase().includes(draft.toUpperCase()) && !selected.includes(s),
        )
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.length === 0 ? (
          <span className="font-body-compact text-body-compact text-text-secondary">
            No symbols selected.
          </span>
        ) : (
          selected.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => remove(s)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-variant border border-border-subtle font-data-mono text-data-mono text-text-primary hover:bg-surface-bright transition-colors"
              aria-label={`Remove ${s}`}
            >
              {s}
              <X className="size-3" aria-hidden="true" />
            </button>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add symbol (NVDA)"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="submit" size="sm" variant="outline">
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </form>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                add(s);
                setDraft("");
              }}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-data-mono text-text-secondary border border-border-subtle bg-surface hover:bg-surface-variant transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
