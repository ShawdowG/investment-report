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
  type ImportPayload,
} from "@/lib/storage/export-import";

type StatusKind = "info" | "warn";

export function SettingsActions() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<StatusKind>("info");

  const [pendingImport, setPendingImport] = useState<ImportPayload | null>(null);
  const [pendingDemo, setPendingDemo] = useState(false);
  const [pendingClear, setPendingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function setBanner(kind: StatusKind, message: string) {
    setStatusKind(kind);
    setStatus(message);
  }

  function handleLoadDemo() {
    setPendingDemo(true);
  }

  function confirmLoadDemo() {
    loadDemoData();
    setPendingDemo(false);
    setBanner(
      "info",
      "Demo watchlist, portfolio, ticker notes, and research dispatches loaded. Theses, reviews, strategies, preferences, and research files were not changed.",
    );
  }

  function handleClear() {
    setPendingClear(true);
  }

  function confirmClear() {
    clearAllUserData();
    setPendingClear(false);
    setBanner(
      "warn",
      "Watchlist, portfolio, ticker notes, and research dispatches cleared. Theses, reviews, strategies, preferences, and research files were retained.",
    );
  }

  async function handleExport() {
    try {
      await exportAllData();
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

  async function confirmImport() {
    if (!pendingImport) return;
    try {
      await applyImport(pendingImport);
      setPendingImport(null);
      setBanner(
        "info",
        "Import applied. Refresh /watchlist, /portfolio, /research, /strategies to see the restored state.",
      );
    } catch (err) {
      setBanner(
        "warn",
        `Import failed without clearing the prior backup: ${err instanceof Error ? err.message : "unknown error"}.`,
      );
    }
  }

  return (
    <>
      <Card className="p-card-padding gap-4">
        <SectionHeader
          title="Backup & restore"
          caption="Download a complete versioned backup or preview a backup before it replaces local data."
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handleExport}>
            <Download className="size-4" aria-hidden="true" />
            Download full backup
          </Button>
          <Button type="button" variant="outline" onClick={handleImportClick}>
            <Upload className="size-4" aria-hidden="true" />
            Restore backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
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
        <p className="font-body-compact text-body-compact text-text-secondary">
          Export covers watchlist, portfolio, ticker notes, research dispatches,
          strategies, dashboard preferences, theses, quarterly reviews, and
          attachment bytes. Version 1 backups remain importable and do not clear
          newer datasets they do not contain.
        </p>
      </Card>

      <Card className="p-card-padding gap-4">
        <SectionHeader
          title="Demo data"
          caption="Replace four starter datasets with disposable examples. Research theses and files stay unchanged."
        />
        <Button type="button" variant="outline" className="self-start" onClick={handleLoadDemo}>
          <Database className="size-4" aria-hidden="true" />
          Load demo data
        </Button>
        <ul className="list-disc space-y-1 pl-5 font-body-compact text-body-compact text-text-secondary marker:text-text-secondary/60">
          <li>Replaces watchlist, portfolio, ticker notes, and research dispatches.</li>
          <li>Retains theses, quarterly reviews, strategies, preferences, and research files.</li>
        </ul>
      </Card>

      <Card className="gap-4 border-destructive/30 p-card-padding">
        <SectionHeader
          title="Danger zone"
          caption="Clear only the four legacy local datasets listed below. This action cannot be undone."
        />
        <Button type="button" variant="destructive" className="self-start" onClick={handleClear}>
          <Trash2 className="size-4" aria-hidden="true" />
          Clear watchlist, portfolio, notes & dispatches
        </Button>
        <p className="font-body-compact text-body-compact text-text-secondary">
          Theses, quarterly reviews, strategies, dashboard preferences, and research files are retained.
        </p>
      </Card>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Overwrite local data?"
        description="This restores every dataset present in the backup. Version 2 backups also replace research attachments. Continue?"
        confirmLabel="Overwrite"
        destructive
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />

      <ConfirmDialog
        open={pendingDemo}
        title="Replace four datasets with demo data?"
        description="This replaces your watchlist, portfolio, ticker notes, and research dispatches. It retains theses, quarterly reviews, strategies, preferences, and research files."
        confirmLabel="Load demo data"
        destructive
        onConfirm={confirmLoadDemo}
        onCancel={() => setPendingDemo(false)}
      />

      <ConfirmDialog
        open={pendingClear}
        title="Clear four local datasets?"
        description="This removes watchlist, portfolio, ticker notes, and research dispatches. It retains theses, quarterly reviews, strategies, preferences, and research files. It cannot be undone."
        confirmLabel="Clear four datasets"
        destructive
        onConfirm={confirmClear}
        onCancel={() => setPendingClear(false)}
      />
    </>
  );
}
