"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface AddPositionFormProps {
  onAdd: (input: { symbol: string; quantity: number; avgPrice: number }) => void;
}

export function AddPositionForm({ onAdd }: AddPositionFormProps) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = symbol.trim();
    const qty = Number(quantity);
    const price = Number(avgPrice);
    if (!trimmed) {
      setError("Enter a ticker symbol.");
      return;
    }
    if (!(qty > 0)) {
      setError("Quantity must be greater than 0.");
      return;
    }
    if (!(price > 0)) {
      setError("Average price must be greater than 0.");
      return;
    }
    onAdd({ symbol: trimmed, quantity: qty, avgPrice: price });
    setSymbol("");
    setQuantity("");
    setAvgPrice("");
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-2 items-end">
        <Field label="Symbol" htmlFor="pos-symbol">
          <input
            id="pos-symbol"
            type="text"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              if (error) setError(null);
            }}
            placeholder="NVDA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Quantity" htmlFor="pos-qty">
          <input
            id="pos-qty"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              if (error) setError(null);
            }}
            placeholder="100"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Avg price" htmlFor="pos-price">
          <input
            id="pos-price"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={avgPrice}
            onChange={(e) => {
              setAvgPrice(e.target.value);
              if (error) setError(null);
            }}
            placeholder="850.00"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Button type="submit" size="sm" className="sm:self-end">
          Add position
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
