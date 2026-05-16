"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type {
  WatchlistPriority,
  WatchlistStatus,
} from "@/lib/domain/watchlist";

export interface AddSymbolFormSubmit {
  symbol: string;
  status?: WatchlistStatus;
  priority?: WatchlistPriority;
  tags?: string[];
}

interface AddSymbolFormProps {
  onAdd: (input: AddSymbolFormSubmit) => void;
}

const STATUS_OPTIONS: { value: WatchlistStatus; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "own", label: "Own" },
  { value: "research", label: "Research" },
  { value: "avoid", label: "Avoid" },
];

const PRIORITY_OPTIONS: { value: WatchlistPriority; label: string }[] = [
  { value: "med", label: "Med" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
];

export function AddSymbolForm({ onAdd }: AddSymbolFormProps) {
  const [value, setValue] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [status, setStatus] = useState<WatchlistStatus>("watching");
  const [priority, setPriority] = useState<WatchlistPriority>("med");
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a ticker symbol.");
      return;
    }
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onAdd({
      symbol: trimmed,
      status: showDetails ? status : undefined,
      priority: showDetails ? priority : undefined,
      tags: showDetails && tags.length > 0 ? tags : undefined,
    });
    setValue("");
    setTagsRaw("");
    setStatus("watching");
    setPriority("med");
    setShowDetails(false);
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label
          htmlFor="watchlist-add-symbol"
          className="block text-xs font-medium text-text-secondary"
        >
          Add symbol
        </label>
        <div className="flex gap-2">
          <input
            id="watchlist-add-symbol"
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. NVDA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "watchlist-add-error" : undefined}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </div>
        {error ? (
          <p id="watchlist-add-error" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        aria-expanded={showDetails}
        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {showDetails ? "Hide details" : "Add details (status, priority, tags)"}
      </button>

      {showDetails ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border-subtle bg-surface-variant/30 p-3">
          <Field label="Status" htmlFor="wl-status">
            <select
              id="wl-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as WatchlistStatus)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority" htmlFor="wl-priority">
            <select
              id="wl-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as WatchlistPriority)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags (comma-separated)" htmlFor="wl-tags">
            <input
              id="wl-tags"
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="AI, Semi"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </Field>
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}
