"use client";

/**
 * SPEC-027 W11.E — Settings card for research file attachments.
 *
 * Surfaces three pieces of information:
 *  1. Browser storage quota (via `navigator.storage.estimate()` when
 *     supported) — gives the user a sense of how much headroom IndexedDB has
 *     on this device. We don't enforce it ourselves; the per-thesis 200 MB
 *     and per-file 25 MB caps in the store dominate first.
 *  2. Per-thesis breakdown — count + size, sorted by size desc, so the user
 *     can see which thesis is hoarding the most disk.
 *  3. A destructive "Wipe all files" button gated by ConfirmDialog, mapped
 *     to `deleteAllFiles()` in the store.
 *
 * Everything refreshes after a wipe; the panel re-fetches on mount and on
 * thesis-store changes are picked up the next time the user lands here.
 */

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionHeader } from "@/components/ui/stitch";
import { getTheses } from "@/lib/storage/thesis-store";
import {
  deleteAllFiles,
  listFiles,
  totalSizeForThesis,
} from "@/lib/storage/research-files-store";

interface ThesisRow {
  symbol: string;
  count: number;
  size: number;
}

interface QuotaInfo {
  usage: number;
  quota: number;
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ResearchFilesSettings() {
  const [rows, setRows] = useState<ThesisRow[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Walk every known thesis symbol and aggregate counts + sizes. We rely
      // on the thesis-store for the canonical symbol list — a file orphaned
      // from a deleted thesis would just not show up here, but the
      // "Wipe all files" button still nukes it from IndexedDB directly.
      const theses = Object.keys(getTheses());
      const collected: ThesisRow[] = [];
      let runningTotal = 0;
      for (const symbol of theses) {
        const [files, size] = await Promise.all([
          listFiles(symbol),
          totalSizeForThesis(symbol),
        ]);
        if (files.length > 0) {
          collected.push({ symbol, count: files.length, size });
        }
        runningTotal += size;
      }
      collected.sort((a, b) => b.size - a.size);
      setRows(collected);
      setTotalBytes(runningTotal);

      // navigator.storage.estimate() is unsupported on some browsers (e.g.
      // older Safari, some webviews). Treat any failure as "not available".
      if (
        typeof navigator !== "undefined" &&
        navigator.storage &&
        typeof navigator.storage.estimate === "function"
      ) {
        try {
          const est = await navigator.storage.estimate();
          if (
            typeof est.usage === "number" &&
            typeof est.quota === "number" &&
            est.quota > 0
          ) {
            setQuota({ usage: est.usage, quota: est.quota });
          } else {
            setQuota(null);
          }
        } catch {
          setQuota(null);
        }
      } else {
        setQuota(null);
      }
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[research-files-settings] refresh failed", err);
      }
      setError(err instanceof Error ? err.message : "Failed to load file usage");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleWipe() {
    try {
      await deleteAllFiles();
      setStatus("All research files wiped from this browser.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to wipe files");
    } finally {
      setConfirmWipe(false);
    }
  }

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Research files"
        caption="Binary attachments (PDFs, screenshots, transcripts) stored in IndexedDB, scoped to each thesis."
      />

      {!hydrated ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          Loading file usage…
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="font-body-compact text-body-compact text-regime-risk-off"
        >
          {error}
        </p>
      ) : null}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <dt className="font-label-caps text-label-caps uppercase text-text-secondary">
            Used by attachments
          </dt>
          <dd className="font-data-mono text-body-compact text-text-primary">
            {formatSize(totalBytes)}
          </dd>
        </div>
        {quota ? (
          <div className="space-y-0.5">
            <dt className="font-label-caps text-label-caps uppercase text-text-secondary">
              Browser storage
            </dt>
            <dd className="font-data-mono text-body-compact text-text-primary">
              {formatSize(quota.usage)} / {formatSize(quota.quota)} used
            </dd>
          </div>
        ) : null}
      </dl>

      {hydrated && rows.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No theses have attachments yet. Drop files into any thesis page to
          start tracking evidence here.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full font-body-compact text-body-compact text-text-primary">
            <thead>
              <tr className="text-left font-label-caps text-label-caps uppercase text-text-secondary">
                <th className="py-1 pr-3">Thesis</th>
                <th className="py-1 pr-3">Files</th>
                <th className="py-1">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row) => (
                <tr key={row.symbol}>
                  <td className="py-1 pr-3 font-data-mono">{row.symbol}</td>
                  <td className="py-1 pr-3 font-data-mono">{row.count}</td>
                  <td className="py-1 font-data-mono">{formatSize(row.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {status ? (
        <p
          role="status"
          className="font-body-compact text-body-compact text-text-secondary"
        >
          {status}
        </p>
      ) : null}

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmWipe(true)}
          disabled={rows.length === 0}
        >
          <Trash2 className="size-4 mr-1" aria-hidden="true" />
          Wipe all files
        </Button>
      </div>

      <ConfirmDialog
        open={confirmWipe}
        title="Wipe all research files?"
        description="This permanently deletes every attachment (PDFs, screenshots, notes) across every thesis from this browser. Theses themselves are untouched. This cannot be undone."
        confirmLabel="Wipe all"
        destructive
        onConfirm={() => {
          void handleWipe();
        }}
        onCancel={() => setConfirmWipe(false)}
      />
    </Card>
  );
}
