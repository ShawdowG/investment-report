"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
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

const STORAGE_ERROR_MESSAGE =
  "Failed to save dispatch — your browser storage may be full";

export function ResearchView() {
  const searchParams = useSearchParams();
  const initialId = searchParams?.get("id") ?? null;

  const [items, setItems] = useState<ResearchDispatch[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>(() =>
    initialId ? { kind: "view", id: initialId } : { kind: "list" },
  );
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "warn">("info");

  useEffect(() => {
    setItems(getDispatches());
    setReady(true);
  }, []);

  function refresh() {
    setItems(getDispatches());
  }

  function clearStatus() {
    if (status) {
      setStatus(null);
    }
  }

  function reportFailure(err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[research] dispatch op failed", err);
    }
    setStatusKind("warn");
    setStatus(STORAGE_ERROR_MESSAGE);
  }

  function handleNew() {
    clearStatus();
    setMode({ kind: "new" });
  }

  function handleSelect(id: string) {
    clearStatus();
    setMode({ kind: "view", id });
  }

  function handleBackToList() {
    clearStatus();
    setMode({ kind: "list" });
  }

  function handleSaveNew(input: DispatchInput) {
    try {
      const created = createDispatch(input);
      refresh();
      clearStatus();
      setMode({ kind: "view", id: created.id });
    } catch (err) {
      reportFailure(err);
    }
  }

  function handleSaveEdit(id: string, input: DispatchInput) {
    try {
      updateDispatch(id, input);
      refresh();
      clearStatus();
      setMode({ kind: "view", id });
    } catch (err) {
      reportFailure(err);
    }
  }

  function handleDelete(id: string) {
    try {
      deleteDispatch(id);
      refresh();
      clearStatus();
      setMode({ kind: "list" });
    } catch (err) {
      reportFailure(err);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading dispatches…
      </div>
    );
  }

  const statusBanner = status ? (
    <p
      role="status"
      className={
        statusKind === "warn"
          ? "font-body-compact text-body-compact text-regime-risk-off"
          : "font-body-compact text-body-compact text-text-secondary"
      }
    >
      {status}
    </p>
  ) : null;

  let body: ReactNode;
  if (mode.kind === "new") {
    body = (
      <DispatchForm
        submitLabel="Publish dispatch"
        onSave={handleSaveNew}
        onCancel={handleBackToList}
      />
    );
  } else if (mode.kind === "view") {
    const dispatch = items.find((d) => d.id === mode.id);
    if (!dispatch) {
      // Stale id (deleted or never existed) — fall back to list.
      handleBackToList();
      return null;
    }
    body = (
      <DispatchView
        dispatch={dispatch}
        onBack={handleBackToList}
        onEdit={() => setMode({ kind: "edit", id: mode.id })}
        onDelete={() => handleDelete(mode.id)}
      />
    );
  } else if (mode.kind === "edit") {
    const dispatch = items.find((d) => d.id === mode.id);
    if (!dispatch) {
      handleBackToList();
      return null;
    }
    body = (
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
  } else {
    body = <DispatchList items={items} onSelect={handleSelect} onNew={handleNew} />;
  }

  return (
    <div className="space-y-3">
      {statusBanner}
      {body}
    </div>
  );
}
