"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTickers, type ParseResult } from "@/lib/parsing/parse-tickers";

interface ImportSectionProps {
  onSave: (symbols: string[]) => { added: number; total: number };
}

const PLACEHOLDER = `Paste symbols separated by commas, spaces, or newlines.
Example:
AAPL, MSFT
NVDA TSLA
NASDAQ:AMD`;

export function ImportSection({ onSave }: ImportSectionProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handlePreview() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Paste at least one token before previewing.");
      setPreview(null);
      return;
    }
    setError(null);
    setSavedMessage(null);
    setPreview(parseTickers(text));
  }

  function handleSave() {
    if (!preview || preview.accepted.length === 0) return;
    const { added, total } = onSave(preview.accepted);
    const skipped = total - added;
    setSavedMessage(
      skipped > 0
        ? `Added ${added} symbol${added === 1 ? "" : "s"} (${skipped} skipped as duplicate${skipped === 1 ? "" : "s"}).`
        : `Added ${added} symbol${added === 1 ? "" : "s"}.`,
    );
    setText("");
    setPreview(null);
  }

  function handleReset() {
    setText("");
    setPreview(null);
    setError(null);
    setSavedMessage(null);
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-variant"
        aria-expanded={open}
        aria-controls="watchlist-import-body"
      >
        <span>Import multiple symbols</span>
        {open ? (
          <ChevronUp className="size-4 text-text-secondary" />
        ) : (
          <ChevronDown className="size-4 text-text-secondary" />
        )}
      </button>
      {open ? (
        <div id="watchlist-import-body" className="space-y-3 border-t border-border-subtle px-4 py-4">
          <label
            htmlFor="watchlist-import-textarea"
            className="block text-xs font-medium text-text-secondary"
          >
            Paste tokens
          </label>
          <textarea
            id="watchlist-import-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
              if (savedMessage) setSavedMessage(null);
            }}
            placeholder={PLACEHOLDER}
            rows={6}
            spellCheck={false}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "watchlist-import-error" : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          {error ? (
            <p id="watchlist-import-error" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handlePreview}>
              Preview
            </Button>
            {preview ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={preview.accepted.length === 0}
                >
                  Save to watchlist
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleReset}>
                  Reset
                </Button>
              </>
            ) : null}
          </div>
          {preview ? <ImportPreview result={preview} /> : null}
          {savedMessage ? (
            <p className="text-xs text-text-secondary" role="status">
              {savedMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ImportPreview({ result }: { result: ParseResult }) {
  if (result.accepted.length === 0 && result.unknown.length === 0) {
    return (
      <p className="text-xs text-text-secondary">No tokens recognised.</p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium text-text-secondary">
          Accepted ({result.accepted.length})
        </p>
        {result.accepted.length === 0 ? (
          <p className="text-xs text-text-secondary">No recognizable symbols found.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {result.accepted.map((symbol) => (
              <span
                key={symbol}
                className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-0.5 font-mono text-xs"
              >
                {symbol}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-text-secondary">
          Unknown ({result.unknown.length})
        </p>
        {result.unknown.length === 0 ? (
          <p className="text-xs text-text-secondary">All tokens recognised.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {result.unknown.map((token, i) => (
              <span
                key={`${token}-${i}`}
                className="inline-flex items-center rounded-md border border-destructive/40 bg-destructive/5 px-2 py-0.5 font-mono text-xs text-destructive"
              >
                {token}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
