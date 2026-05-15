"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Strategy, StrategyType } from "@/lib/domain/strategy";
import type { StrategyInputContract } from "@/lib/storage/contracts";
import { SymbolPicker } from "./symbol-picker";

interface StrategyFormProps {
  available: string[];
  initial?: Strategy;
  submitLabel?: string;
  onSave: (input: StrategyInputContract) => void;
  onCancel?: () => void;
}

const TYPE_OPTIONS: { value: StrategyType; label: string; description: string }[] = [
  { value: "buy-hold", label: "Buy & hold", description: "Buy on first bar, hold to end. Baseline." },
  { value: "ma-crossover", label: "MA crossover", description: "Buy when short MA crosses above long MA." },
  { value: "rsi", label: "RSI threshold", description: "Buy when RSI < buy, sell when RSI > sell." },
  { value: "price-threshold", label: "Price threshold", description: "Buy at price ≤ X, sell at price ≥ Y. Single symbol only." },
];

export function StrategyForm({
  available,
  initial,
  submitLabel = "Save strategy",
  onSave,
  onCancel,
}: StrategyFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<StrategyType>(initial?.type ?? "buy-hold");
  const [symbols, setSymbols] = useState<string[]>(initial?.symbols ?? []);
  const [initialCapital, setInitialCapital] = useState(
    String(initial?.initialCapital ?? 100000),
  );
  const [sizing, setSizing] = useState<"equal-weight" | "fixed-dollar">(
    initial?.positionSizing.type ?? "equal-weight",
  );
  const [fixedAmount, setFixedAmount] = useState(
    String(initial?.positionSizing.fixedAmount ?? 10000),
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");

  // Type-specific
  const [shortPeriod, setShortPeriod] = useState(
    String(initial && initial.type === "ma-crossover" ? initial.shortPeriod : 50),
  );
  const [longPeriod, setLongPeriod] = useState(
    String(initial && initial.type === "ma-crossover" ? initial.longPeriod : 200),
  );
  const [rsiPeriod, setRsiPeriod] = useState(
    String(initial && initial.type === "rsi" ? initial.period : 14),
  );
  const [rsiBuy, setRsiBuy] = useState(
    String(initial && initial.type === "rsi" ? initial.buyThreshold : 30),
  );
  const [rsiSell, setRsiSell] = useState(
    String(initial && initial.type === "rsi" ? initial.sellThreshold : 70),
  );
  const [buyPrice, setBuyPrice] = useState(
    String(initial && initial.type === "price-threshold" ? initial.buyPrice : ""),
  );
  const [sellPrice, setSellPrice] = useState(
    String(initial && initial.type === "price-threshold" ? initial.sellPrice : ""),
  );

  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return setError("Name is required.");
    if (symbols.length === 0) return setError("Select at least one symbol.");
    const cap = Number(initialCapital);
    if (!(cap > 0)) return setError("Initial capital must be greater than 0.");
    if (sizing === "fixed-dollar" && !(Number(fixedAmount) > 0)) {
      return setError("Fixed amount must be greater than 0.");
    }
    if (type === "price-threshold" && symbols.length !== 1) {
      return setError("Price threshold strategy supports exactly one symbol.");
    }

    const positionSizing =
      sizing === "fixed-dollar"
        ? { type: "fixed-dollar" as const, fixedAmount: Number(fixedAmount) }
        : { type: "equal-weight" as const };

    const baseInput = {
      name: trimmedName,
      symbols,
      initialCapital: cap,
      positionSizing,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    let input: StrategyInputContract;
    switch (type) {
      case "buy-hold":
        input = { ...baseInput, type };
        break;
      case "ma-crossover":
        if (!(Number(shortPeriod) > 0) || !(Number(longPeriod) > 0))
          return setError("Periods must be positive.");
        if (Number(shortPeriod) >= Number(longPeriod))
          return setError("Short period must be less than long period.");
        input = {
          ...baseInput,
          type,
          shortPeriod: Number(shortPeriod),
          longPeriod: Number(longPeriod),
        };
        break;
      case "rsi":
        if (!(Number(rsiPeriod) > 0))
          return setError("RSI period must be positive.");
        input = {
          ...baseInput,
          type,
          period: Number(rsiPeriod),
          buyThreshold: Number(rsiBuy),
          sellThreshold: Number(rsiSell),
        };
        break;
      case "price-threshold":
        if (!(Number(buyPrice) > 0) || !(Number(sellPrice) > 0))
          return setError("Buy and sell prices must be positive.");
        input = {
          ...baseInput,
          type,
          buyPrice: Number(buyPrice),
          sellPrice: Number(sellPrice),
        };
        break;
    }

    onSave(input);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Strategy name" htmlFor="strategy-name">
        <input
          id="strategy-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="MA50/200 cross on mega-caps"
          className="w-full rounded-md border border-border-subtle bg-surface px-3 py-1.5 font-body-main text-body-main text-text-primary shadow-xs outline-none focus-visible:border-primary/60"
        />
      </Field>

      <Field label="Strategy type">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={
                "text-left rounded-lg border p-3 transition-colors " +
                (type === opt.value
                  ? "border-primary bg-primary-container/20"
                  : "border-border-subtle bg-surface hover:bg-surface-variant")
              }
            >
              <div className="font-body-compact text-body-compact font-semibold text-text-primary">
                {opt.label}
              </div>
              <div className="font-label-caps text-label-caps text-text-secondary mt-1">
                {opt.description}
              </div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Symbols">
        <SymbolPicker available={available} selected={symbols} onChange={setSymbols} />
      </Field>

      {type === "ma-crossover" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Short MA period" htmlFor="ma-short">
            <NumberInput id="ma-short" value={shortPeriod} onChange={setShortPeriod} />
          </Field>
          <Field label="Long MA period" htmlFor="ma-long">
            <NumberInput id="ma-long" value={longPeriod} onChange={setLongPeriod} />
          </Field>
        </div>
      ) : null}

      {type === "rsi" ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label="RSI period" htmlFor="rsi-p">
            <NumberInput id="rsi-p" value={rsiPeriod} onChange={setRsiPeriod} />
          </Field>
          <Field label="Buy threshold" htmlFor="rsi-buy">
            <NumberInput id="rsi-buy" value={rsiBuy} onChange={setRsiBuy} />
          </Field>
          <Field label="Sell threshold" htmlFor="rsi-sell">
            <NumberInput id="rsi-sell" value={rsiSell} onChange={setRsiSell} />
          </Field>
        </div>
      ) : null}

      {type === "price-threshold" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Buy ≤" htmlFor="pt-buy">
            <NumberInput id="pt-buy" value={buyPrice} onChange={setBuyPrice} />
          </Field>
          <Field label="Sell ≥" htmlFor="pt-sell">
            <NumberInput id="pt-sell" value={sellPrice} onChange={setSellPrice} />
          </Field>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border-subtle">
        <Field label="Initial capital ($)" htmlFor="cap">
          <NumberInput id="cap" value={initialCapital} onChange={setInitialCapital} />
        </Field>
        <Field label="Sizing">
          <select
            value={sizing}
            onChange={(e) => setSizing(e.target.value as "equal-weight" | "fixed-dollar")}
            className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-sm text-text-primary"
          >
            <option value="equal-weight">Equal weight</option>
            <option value="fixed-dollar">Fixed $ per ticker</option>
          </select>
        </Field>
        {sizing === "fixed-dollar" ? (
          <Field label="$ per ticker" htmlFor="fixed">
            <NumberInput id="fixed" value={fixedAmount} onChange={setFixedAmount} />
          </Field>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date (optional)" htmlFor="start">
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-1.5 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-primary/60"
          />
        </Field>
        <Field label="End date (optional)" htmlFor="end">
          <input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-1.5 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-primary/60"
          />
        </Field>
      </div>

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
  htmlFor?: string;
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

function NumberInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border-subtle bg-surface px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-primary/60"
    />
  );
}
