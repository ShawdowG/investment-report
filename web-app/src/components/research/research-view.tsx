"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DispatchForm } from "./dispatch-form";
import { DispatchList } from "./dispatch-list";
import { DispatchView } from "./dispatch-view";
import { NewThesisDialog } from "./new-thesis-dialog";
import { ThesesOverview } from "./theses-overview";
import type { ResearchDispatch } from "@/lib/domain/research-dispatch";
import type { DispatchInput } from "@/lib/storage/contracts";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import {
  createDispatch,
  deleteDispatch,
  getDispatches,
  updateDispatch,
} from "@/lib/storage/research-dispatches-store";
import { getTheses } from "@/lib/storage/thesis-store";

type Mode =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "view"; id: string }
  | { kind: "edit"; id: string };

type Tab = "theses" | "dispatches";

const STORAGE_ERROR_MESSAGE =
  "Failed to save dispatch — your browser storage may be full";

interface ResearchViewProps {
  snapshots?: QuoteSnapshotMap;
}

export function ResearchView({ snapshots = {} }: ResearchViewProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams?.get("id") ?? null;
  const [newThesisOpen, setNewThesisOpen] = useState(false);

  function openNewThesisDialog() {
    setNewThesisOpen(true);
  }

  function handleNewThesisSelect(symbol: string) {
    setNewThesisOpen(false);
    router.push(`/research/thesis/${encodeURIComponent(symbol)}`);
  }

  const [items, setItems] = useState<ResearchDispatch[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>(() =>
    initialId ? { kind: "view", id: initialId } : { kind: "list" },
  );
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "warn">("info");
  // Default tab decision happens once on mount: if the user has any theses we
  // open on "Theses" since that's their primary workflow surface; otherwise
  // we stay on "Dispatches" so existing users don't see an empty placeholder.
  // A deep-link with `?id=...` always wins so the dispatch view stays usable.
  const [tab, setTab] = useState<Tab>("dispatches");

  useEffect(() => {
    setItems(getDispatches());
    if (!initialId) {
      const thesesCount = Object.keys(getTheses()).length;
      setTab(thesesCount > 0 ? "theses" : "dispatches");
    }
    setReady(true);
  }, [initialId]);

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
  } else if (tab === "theses") {
    body = <ThesesOverview onNewThesis={openNewThesisDialog} />;
  } else {
    body = <DispatchList items={items} onSelect={handleSelect} onNew={handleNew} />;
  }

  // Tab switcher + thesis CTA only make sense on the "list" mode; once the
  // user opens a dispatch view/edit/new screen the dispatches surface owns the
  // viewport entirely.
  const showListChrome = mode.kind === "list";

  return (
    <div className="space-y-3">
      {statusBanner}
      {showListChrome ? (
        <div className="flex items-center justify-between gap-3">
          <div role="tablist" aria-label="Research view" className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface p-0.5">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "theses"}
              onClick={() => setTab("theses")}
              className={cn(
                "rounded-sm px-3 py-1 font-body-compact text-body-compact transition-colors",
                tab === "theses"
                  ? "bg-surface-variant text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              Theses
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "dispatches"}
              onClick={() => setTab("dispatches")}
              className={cn(
                "rounded-sm px-3 py-1 font-body-compact text-body-compact transition-colors",
                tab === "dispatches"
                  ? "bg-surface-variant text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              Dispatches
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openNewThesisDialog}
          >
            <BookOpen className="size-4 mr-1" aria-hidden="true" />
            New thesis
          </Button>
        </div>
      ) : null}
      {body}
      <NewThesisDialog
        open={newThesisOpen}
        snapshots={snapshots}
        onSelect={handleNewThesisSelect}
        onCancel={() => setNewThesisOpen(false)}
      />
    </div>
  );
}
