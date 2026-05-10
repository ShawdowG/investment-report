"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { DispatchInput } from "@/lib/storage/contracts";

interface DispatchFormProps {
  initial?: DispatchInput;
  submitLabel?: string;
  onSave: (input: DispatchInput) => void;
  onCancel?: () => void;
}

export function DispatchForm({
  initial,
  submitLabel = "Save",
  onSave,
  onCancel,
}: DispatchFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    onSave({
      title: trimmedTitle,
      body,
      ticker: ticker.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
        <Field label="Title" htmlFor="dispatch-title">
          <input
            id="dispatch-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Weekly market take, NVDA earnings post-mortem…"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 font-body-main text-body-main text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Ticker (optional)" htmlFor="dispatch-ticker">
          <input
            id="dispatch-ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="NVDA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
      </div>
      <Field label="Body" htmlFor="dispatch-body">
        <textarea
          id="dispatch-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your research, market view, or post-mortem here…"
          rows={12}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
        />
      </Field>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
      </div>
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
      <label htmlFor={htmlFor} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
