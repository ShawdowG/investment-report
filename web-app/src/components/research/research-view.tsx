"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
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
  const routeId = searchParams?.get("id") ?? null;
  const routeView = searchParams?.get("view");
  const requestedTab: Tab =
    routeId || routeView === "dispatches" ? "dispatches" : "theses";
  const [newThesisOpen, setNewThesisOpen] = useState(false);
  const [items, setItems] = useState<ResearchDispatch[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>(() =>
    routeId ? { kind: "view", id: routeId } : { kind: "list" },
  );
  const [tab, setTab] = useState<Tab>(requestedTab);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "warn">("info");

  useEffect(() => {
    setItems(getDispatches());
    setReady(true);
  }, []);

  useEffect(() => {
    setTab(requestedTab);
    if (routeId) setMode({ kind: "view", id: routeId });
  }, [requestedTab, routeId]);

  function refresh() {
    setItems(getDispatches());
  }

  function clearStatus() {
    setStatus(null);
  }

  function reportFailure(err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[research] dispatch op failed", err);
    }
    setStatusKind("warn");
    setStatus(STORAGE_ERROR_MESSAGE);
  }

  function selectTab(next: Tab) {
    setTab(next);
    setMode({ kind: "list" });
    clearStatus();
    router.replace(`/research?view=${next}`, { scroll: false });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: Tab) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next: Tab =
      event.key === "Home"
        ? "theses"
        : event.key === "End"
          ? "dispatches"
          : current === "theses"
            ? "dispatches"
            : "theses";
    selectTab(next);
    window.requestAnimationFrame(() =>
      document.getElementById(`research-tab-${next}`)?.focus(),
    );
  }

  function openNewThesisDialog() {
    setNewThesisOpen(true);
  }

  function handleNewThesisSelect(symbol: string) {
    setNewThesisOpen(false);
    router.push(`/research/thesis/${encodeURIComponent(symbol)}`);
  }

  function handleNewDispatch() {
    clearStatus();
    setTab("dispatches");
    setMode({ kind: "new" });
    router.replace("/research?view=dispatches", { scroll: false });
  }

  function handleSelect(id: string) {
    clearStatus();
    setTab("dispatches");
    setMode({ kind: "view", id });
    router.replace(`/research?view=dispatches&id=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function handleBackToList() {
    clearStatus();
    setTab("dispatches");
    setMode({ kind: "list" });
    router.replace("/research?view=dispatches", { scroll: false });
  }

  function handleSaveNew(input: DispatchInput) {
    try {
      const created = createDispatch(input);
      refresh();
      clearStatus();
      setMode({ kind: "view", id: created.id });
      router.replace(
        `/research?view=dispatches&id=${encodeURIComponent(created.id)}`,
        { scroll: false },
      );
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
      router.replace(`/research?view=dispatches&id=${encodeURIComponent(id)}`, {
        scroll: false,
      });
    } catch (err) {
      reportFailure(err);
    }
  }

  function handleDelete(id: string) {
    try {
      deleteDispatch(id);
      refresh();
      setStatusKind("info");
      setStatus("Dispatch deleted from this browser.");
      setMode({ kind: "list" });
      router.replace("/research?view=dispatches", { scroll: false });
    } catch (err) {
      reportFailure(err);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading research…
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
        submitLabel="Save dispatch"
        onSave={handleSaveNew}
        onCancel={handleBackToList}
      />
    );
  } else if (mode.kind === "view") {
    const dispatch = items.find((item) => item.id === mode.id);
    body = dispatch ? (
      <DispatchView
        dispatch={dispatch}
        onBack={handleBackToList}
        onEdit={() => setMode({ kind: "edit", id: mode.id })}
        onDelete={() => handleDelete(mode.id)}
      />
    ) : (
      <MissingDispatch onBack={handleBackToList} />
    );
  } else if (mode.kind === "edit") {
    const dispatch = items.find((item) => item.id === mode.id);
    body = dispatch ? (
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
    ) : (
      <MissingDispatch onBack={handleBackToList} />
    );
  } else if (tab === "theses") {
    body = <ThesesOverview onNewThesis={openNewThesisDialog} />;
  } else {
    body = (
      <DispatchList
        items={items}
        onSelect={handleSelect}
        onNew={handleNewDispatch}
      />
    );
  }

  const showListChrome = mode.kind === "list";

  return (
    <div className="space-y-3">
      {statusBanner}
      {showListChrome ? (
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div
            role="tablist"
            aria-label="Research view"
            className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface p-0.5"
          >
            {(["theses", "dispatches"] as const).map((value) => (
              <button
                key={value}
                id={`research-tab-${value}`}
                type="button"
                role="tab"
                aria-selected={tab === value}
                aria-controls={`research-panel-${value}`}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => selectTab(value)}
                onKeyDown={(event) => handleTabKeyDown(event, value)}
                className={cn(
                  "min-h-11 flex-1 rounded-sm px-3 py-2 font-body-compact text-body-compact transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
                  tab === value
                    ? "bg-primary-container text-on-primary-container"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {value === "theses" ? "Theses" : "Dispatches"}
              </button>
            ))}
          </div>
          <Button
            type="button"
            onClick={tab === "theses" ? openNewThesisDialog : handleNewDispatch}
          >
            {tab === "theses" ? (
              <BookOpen className="size-4" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {tab === "theses" ? "New thesis" : "New dispatch"}
          </Button>
        </div>
      ) : null}
      {showListChrome ? (
        <div
          id={`research-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`research-tab-${tab}`}
          tabIndex={0}
        >
          {body}
        </div>
      ) : (
        body
      )}
      <NewThesisDialog
        open={newThesisOpen}
        snapshots={snapshots}
        onSelect={handleNewThesisSelect}
        onCancel={() => setNewThesisOpen(false)}
      />
    </div>
  );
}

function MissingDispatch({ onBack }: { onBack: () => void }) {
  return (
    <div role="status" className="rounded-lg border border-border-subtle bg-surface p-card-padding">
      <h2 className="font-h2 text-h2 text-text-primary">Dispatch not found</h2>
      <p className="mt-1 font-body-compact text-body-compact text-text-secondary">
        This dispatch may have been removed from local storage.
      </p>
      <Button className="mt-4" variant="outline" onClick={onBack}>
        Back to dispatches
      </Button>
    </div>
  );
}
