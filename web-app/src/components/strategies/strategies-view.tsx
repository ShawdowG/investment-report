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

  useEffect(() => {
    setItems(getStrategies());
    setReady(true);
  }, []);

  function refresh() {
    setItems(getStrategies());
  }

  function handleSaveNew(input: StrategyInputContract) {
    const created = createStrategy(input);
    refresh();
    setMode({ kind: "view", id: created.id });
  }

  function handleSaveEdit(id: string, input: StrategyInputContract) {
    updateStrategy(id, input);
    refresh();
    setMode({ kind: "view", id });
  }

  function handleDelete(id: string) {
    deleteStrategy(id);
    refresh();
    setMode({ kind: "list" });
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
      <StrategyForm
        available={available}
        submitLabel="Save strategy"
        onSave={handleSaveNew}
        onCancel={() => setMode({ kind: "list" })}
      />
    );
  }

  if (mode.kind === "view") {
    const strategy = items.find((s) => s.id === mode.id);
    if (!strategy) {
      setMode({ kind: "list" });
      return null;
    }
    return (
      <StrategyView
        strategy={strategy}
        seriesBySymbol={seriesBySymbol}
        onBack={() => setMode({ kind: "list" })}
        onEdit={() => setMode({ kind: "edit", id: mode.id })}
        onDelete={() => handleDelete(mode.id)}
      />
    );
  }

  if (mode.kind === "edit") {
    const strategy = items.find((s) => s.id === mode.id);
    if (!strategy) {
      setMode({ kind: "list" });
      return null;
    }
    return (
      <StrategyForm
        available={available}
        initial={strategy}
        submitLabel="Save changes"
        onSave={(input) => handleSaveEdit(mode.id, input)}
        onCancel={() => setMode({ kind: "view", id: mode.id })}
      />
    );
  }

  return (
    <StrategyList
      items={items}
      onSelect={(id) => setMode({ kind: "view", id })}
      onNew={() => setMode({ kind: "new" })}
    />
  );
}
