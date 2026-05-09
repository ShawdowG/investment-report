"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface AddSymbolFormProps {
  onAdd: (symbol: string) => void;
}

export function AddSymbolForm({ onAdd }: AddSymbolFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a ticker symbol.");
      return;
    }
    onAdd(trimmed);
    setValue("");
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label
        htmlFor="watchlist-add-symbol"
        className="block text-xs font-medium text-muted-foreground"
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
    </form>
  );
}
