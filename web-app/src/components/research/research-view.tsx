"use client";

import { useEffect, useState } from "react";
import { DispatchForm } from "./dispatch-form";
import { DispatchList } from "./dispatch-list";
import { DispatchView } from "./dispatch-view";
import type { ResearchDispatch } from "@/lib/domain/research-dispatch";
import type { DispatchInput } from "@/lib/storage/contracts";
import {
  createDispatch,
  deleteDispatch,
  getDispatches,
  updateDispatch,
} from "@/lib/storage/research-dispatches-store";

type Mode =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "view"; id: string }
  | { kind: "edit"; id: string };

export function ResearchView() {
  const [items, setItems] = useState<ResearchDispatch[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  useEffect(() => {
    setItems(getDispatches());
    setReady(true);
  }, []);

  function refresh() {
    setItems(getDispatches());
  }

  function handleNew() {
    setMode({ kind: "new" });
  }

  function handleSelect(id: string) {
    setMode({ kind: "view", id });
  }

  function handleBackToList() {
    setMode({ kind: "list" });
  }

  function handleSaveNew(input: DispatchInput) {
    const created = createDispatch(input);
    refresh();
    setMode({ kind: "view", id: created.id });
  }

  function handleSaveEdit(id: string, input: DispatchInput) {
    updateDispatch(id, input);
    refresh();
    setMode({ kind: "view", id });
  }

  function handleDelete(id: string) {
    deleteDispatch(id);
    refresh();
    setMode({ kind: "list" });
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading dispatches…
      </div>
    );
  }

  if (mode.kind === "new") {
    return (
      <DispatchForm
        submitLabel="Publish dispatch"
        onSave={handleSaveNew}
        onCancel={handleBackToList}
      />
    );
  }

  if (mode.kind === "view") {
    const dispatch = items.find((d) => d.id === mode.id);
    if (!dispatch) {
      // Stale id (deleted or never existed) — fall back to list.
      handleBackToList();
      return null;
    }
    return (
      <DispatchView
        dispatch={dispatch}
        onBack={handleBackToList}
        onEdit={() => setMode({ kind: "edit", id: mode.id })}
        onDelete={() => handleDelete(mode.id)}
      />
    );
  }

  if (mode.kind === "edit") {
    const dispatch = items.find((d) => d.id === mode.id);
    if (!dispatch) {
      handleBackToList();
      return null;
    }
    return (
      <DispatchForm
        initial={{
          title: dispatch.title,
          body: dispatch.body,
          ticker: dispatch.ticker,
        }}
        submitLabel="Save changes"
        onSave={(input) => handleSaveEdit(mode.id, input)}
        onCancel={() => setMode({ kind: "view", id: mode.id })}
      />
    );
  }

  return <DispatchList items={items} onSelect={handleSelect} onNew={handleNew} />;
}
