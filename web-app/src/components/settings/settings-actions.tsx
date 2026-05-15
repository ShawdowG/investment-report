"use client";

import { useRef, useState } from "react";
import { Database, Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionHeader } from "@/components/ui/stitch";
import { clearAllUserData, loadDemoData } from "@/lib/storage/demo-seed";
import {
  applyImport,
  exportAllData,
  parseImportText,
  type ExportPayload,
} from "@/lib/storage/export-import";

type StatusKind = "info" | "warn";

export function SettingsActions() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<StatusKind>("info");

  const [pendingImport, setPendingImport] = useState<ExportPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function setBanner(kind: StatusKind, message: string) {
    setStatusKind(kind);
    setStatus(message);
  }

  function handleLoadDemo() {
    loadDemoData();
    setBanner(
      "info",
      "Demo data loaded. Refresh /watchlist, /portfolio, /research, /ticker/NVDA to see the populated state.",
    );
  }

  function handleClear() {
    const confirmed = window.confirm(
      "Clear watchlist, portfolio, ticker notes, and research dispatches? This cannot be undone.",
    );
    if (!confirmed) return;
    clearAllUserData();
    setBanner("warn", "All local user data cleared.");
  }

  function handleExport() {
    try {
      exportAllData();
      setBanner("info", "Export downloaded.");
    } catch (err) {
      setBanner(
        "warn",
        `Export failed: ${err instanceof Error ? err.message : "unknown error"}.`,
      );
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file twice still fires onChange.
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseImportText(text);
      if (!result.ok) {
        setBanner("warn", `Import rejected: ${result.reason}`);
        return;
      }
      setPendingImport(result.payload);
    } catch (err) {
      setBanner(
        "warn",
        `Import failed: ${err instanceof Error ? err.message : "could not read file"}.`,
      );
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    applyImport(pendingImport);
    setPendingImport(null);
    setBanner(
      "info",
      "Import applied. Refresh /watchlist, /portfolio, /research, /strategies to see the restored state.",
    );
  }

  return (
    <>
      <Card className="p-card-padding gap-4">
        <SectionHeader
          title="Data"
          caption="Seed the four local-storage stores with example content, or wipe them."
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handleLoadDemo}>
            <Database className="size-4 mr-1" aria-hidden="true" />
            Load demo data
          </Button>
          <Button type="button" variant="outline" onClick={handleClear}>
            <Trash2 className="size-4 mr-1" aria-hidden="true" />
            Clear all data
          </Button>
        </div>
        {status ? (
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
        ) : null}
        <ul className="list-disc list-inside font-body-compact text-body-compact text-text-secondary space-y-1 marker:text-text-secondary/60">
          <li>Watchlist: 8 symbols across all status / priority levels with tags.</li>
          <li>Portfolio: 5 positions (NVDA / MSFT / AAPL / BTC-USD / TSLA).</li>
          <li>Research: 3 dispatches, one linked to NVDA.</li>
          <li>Notes: 4 ticker notes spread across NVDA / MSFT / AAPL.</li>
        </ul>
      </Card>

      <Card className="p-card-padding gap-4">
        <SectionHeader
          title="Export / import"
          caption="Snapshot every local-storage store to a single JSON file, or restore one. Useful as a manual backup before clearing or swapping browsers."
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handleExport}>
            <Download className="size-4 mr-1" aria-hidden="true" />
            Export all data
          </Button>
          <Button type="button" variant="outline" onClick={handleImportClick}>
            <Upload className="size-4 mr-1" aria-hidden="true" />
            Import data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        <p className="font-body-compact text-body-compact text-text-secondary">
          Export covers watchlist, portfolio, ticker notes, research dispatches,
          strategies, and dashboard preferences. Import validates the schema
          marker then overwrites each store; malformed entries are dropped on
          next read.
        </p>
      </Card>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Overwrite local data?"
        description="This will overwrite all your local data (watchlist, portfolio, notes, dispatches, strategies, dashboard preferences) with the contents of the import file. Continue?"
        confirmLabel="Overwrite"
        destructive
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </>
  );
}
