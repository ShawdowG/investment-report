"use client";

import { useEffect, useState } from "react";
import { StrategyForm } from "./strategy-form";
import { StrategyList } from "./strategy-list";
import { StrategyView } from "./strategy-view";
import type { Strategy } from "@/lib/domain/strategy";
import type { StrategyInputContract } from "@/lib/storage/contracts";
import {
  createStrategy,
  deleteStrategy,
  getStrategies,
  updateStrategy,
} from "@/lib/storage/strategies-store";
import type { QuoteBar } from "@/lib/quotes/types";

interface StrategiesViewProps {
  available: string[];
  seriesBySymbol: Record<string, QuoteBar[]>;
}

type Mode =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "view"; id: string }
  | { kind: "edit"; id: string };

export function StrategiesView({ available, seriesBySymbol }: StrategiesViewProps) {
  const [items, setItems] = useState<Strategy[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(getStrategies());
    setReady(true);
  }, []);

  function refresh() {
    setItems(getStrategies());
  }

  function handleSaveNew(input: StrategyInputContract) {
    try {
      const created = createStrategy(input);
      refresh();
      setError(null);
      setMode({ kind: "view", id: created.id });
      return true;
    } catch {
      setError("Strategy could not be saved. Your draft is still available on this device.");
      return false;
    }
  }

  function handleSaveEdit(id: string, input: StrategyInputContract) {
    try {
      updateStrategy(id, input);
      refresh();
      setError(null);
      setMode({ kind: "view", id });
      return true;
    } catch {
      setError("Strategy changes could not be saved. Your draft is still available on this device.");
      return false;
    }
  }

  function handleDelete(id: string) {
    try {
      deleteStrategy(id);
      refresh();
      setError(null);
      setMode({ kind: "list" });
    } catch {
      setError("Strategy could not be deleted. It remains in local storage.");
    }
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading strategies…
      </div>
    );
  }

  if (mode.kind === "new") {
    return (
      <div className="space-y-3">
      {error ? <p role="alert" className="text-sm text-regime-risk-off">{error}</p> : null}
      <StrategyForm
        available={available}
        submitLabel="Save strategy"
        onSave={handleSaveNew}
        onCancel={() => setMode({ kind: "list" })}
      />
      </div>
    );
  }

  if (mode.kind === "view") {
    const strategy = items.find((s) => s.id === mode.id);
    if (!strategy) {
      setMode({ kind: "list" });
      return null;
    }
    return (
      <div className="space-y-3">
      {error ? <p role="alert" className="text-sm text-regime-risk-off">{error}</p> : null}
      <StrategyView
        strategy={strategy}
        seriesBySymbol={seriesBySymbol}
        onBack={() => setMode({ kind: "list" })}
        onEdit={() => setMode({ kind: "edit", id: mode.id })}
        onDelete={() => handleDelete(mode.id)}
      />
      </div>
    );
  }

  if (mode.kind === "edit") {
    const strategy = items.find((s) => s.id === mode.id);
    if (!strategy) {
      setMode({ kind: "list" });
      return null;
    }
    return (
      <div className="space-y-3">
      {error ? <p role="alert" className="text-sm text-regime-risk-off">{error}</p> : null}
      <StrategyForm
        available={available}
        initial={strategy}
        submitLabel="Save changes"
        onSave={(input) => handleSaveEdit(mode.id, input)}
        onCancel={() => setMode({ kind: "view", id: mode.id })}
      />
      </div>
    );
  }

  return (
    <div className="space-y-3">
    {error ? <p role="alert" className="text-sm text-regime-risk-off">{error}</p> : null}
    <StrategyList
      items={items}
      onSelect={(id) => setMode({ kind: "view", id })}
      onNew={() => setMode({ kind: "new" })}
    />
    </div>
  );
}
