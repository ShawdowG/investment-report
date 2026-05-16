"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface AddPositionFormProps {
  onAdd: (input: { symbol: string; quantity: number; avgPrice: number }) => void;
}

type FieldKey = "symbol" | "quantity" | "avgPrice";

interface FormError {
  field: FieldKey;
  message: string;
}

// Stable IDs keep aria-describedby targets predictable for screen readers and
// our component test (only the error matching the current field renders).
const ERROR_IDS: Record<FieldKey, string> = {
  symbol: "pos-symbol-error",
  quantity: "pos-qty-error",
  avgPrice: "pos-price-error",
};

export function AddPositionForm({ onAdd }: AddPositionFormProps) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [error, setError] = useState<FormError | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = symbol.trim();
    const qty = Number(quantity);
    const price = Number(avgPrice);
    // Explicit numeric validation in the submit handler replaces the prior
    // `min="0"` attribute workaround — browsers stop at the HTML level, but we
    // need a consistent in-handler check that surfaces an aria-described error.
    if (!trimmed) {
      setError({ field: "symbol", message: "Enter a ticker symbol." });
      return;
    }
    if (!Number.isFinite(qty) || !(qty > 0)) {
      setError({ field: "quantity", message: "Quantity must be greater than 0." });
      return;
    }
    if (!Number.isFinite(price) || !(price > 0)) {
      setError({ field: "avgPrice", message: "Average price must be greater than 0." });
      return;
    }
    onAdd({ symbol: trimmed, quantity: qty, avgPrice: price });
    setSymbol("");
    setQuantity("");
    setAvgPrice("");
    setError(null);
  }

  function clearError() {
    if (error) setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-2 items-end">
        <Field label="Symbol" htmlFor="pos-symbol">
          <input
            id="pos-symbol"
            type="text"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              clearError();
            }}
            placeholder="NVDA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-required="true"
            aria-invalid={error?.field === "symbol" || undefined}
            aria-describedby={
              error?.field === "symbol" ? ERROR_IDS.symbol : undefined
            }
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Quantity" htmlFor="pos-qty">
          <input
            id="pos-qty"
            type="number"
            inputMode="decimal"
            step="any"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              clearError();
            }}
            placeholder="100"
            aria-required="true"
            aria-invalid={error?.field === "quantity" || undefined}
            aria-describedby={
              error?.field === "quantity" ? ERROR_IDS.quantity : undefined
            }
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Avg price" htmlFor="pos-price">
          <input
            id="pos-price"
            type="number"
            inputMode="decimal"
            step="any"
            value={avgPrice}
            onChange={(e) => {
              setAvgPrice(e.target.value);
              clearError();
            }}
            placeholder="850.00"
            aria-required="true"
            aria-invalid={error?.field === "avgPrice" || undefined}
            aria-describedby={
              error?.field === "avgPrice" ? ERROR_IDS.avgPrice : undefined
            }
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Button type="submit" size="sm" className="sm:self-end">
          Add position
        </Button>
      </div>
      {error ? (
        <p
          id={ERROR_IDS[error.field]}
          role="alert"
          className="text-xs text-regime-risk-off"
        >
          {error.message}
        </p>
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
