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

// Allowed ticker characters: A-Z, 0-9, dot, hyphen, caret, equals.
// Covers symbols like BRK.B, BTC-USD, ^GSPC, ES=F.
const TICKER_ALLOWED = /^[A-Z0-9.\-^=]*$/;

function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
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
  const [tickerError, setTickerError] = useState<string | null>(null);

  function handleTickerBlur() {
    const normalized = normalizeTicker(ticker);
    if (normalized !== ticker) {
      setTicker(normalized);
    }
    if (!normalized) {
      setTickerError(null);
      return;
    }
    if (!TICKER_ALLOWED.test(normalized)) {
      setTickerError("Ticker may only contain letters, digits, and . - ^ =");
    } else {
      setTickerError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    const normalizedTicker = normalizeTicker(ticker);
    if (normalizedTicker && !TICKER_ALLOWED.test(normalizedTicker)) {
      setTickerError("Ticker may only contain letters, digits, and . - ^ =");
      return;
    }
    onSave({
      title: trimmedTitle,
      body,
      ticker: normalizedTicker || undefined,
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
            onChange={(e) => {
              setTicker(e.target.value);
              if (tickerError) setTickerError(null);
            }}
            onBlur={handleTickerBlur}
            placeholder="NVDA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={tickerError ? true : undefined}
            aria-describedby={tickerError ? "dispatch-ticker-error" : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          {tickerError ? (
            <p
              id="dispatch-ticker-error"
              className="font-body-compact text-body-compact text-regime-risk-off"
            >
              {tickerError}
            </p>
          ) : null}
        </Field>
      </div>
      <Field label="Body (markdown supported)" htmlFor="dispatch-body">
        <textarea
          id="dispatch-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your research, market view, or post-mortem here…&#10;&#10;Markdown: # heading, **bold**, *italic*, - bullet, `code`"
          rows={14}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
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
      <label htmlFor={htmlFor} className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}
