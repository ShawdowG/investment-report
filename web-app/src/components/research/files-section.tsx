"use client";

/**
 * SPEC-027 W11.B / W11.D — Per-thesis files section.
 *
 * Owns the file list state for a thesis (re-fetches via `listFiles()` after
 * every mutation) and renders the upload dropzone, the list, and the footer
 * usage bar. Each row supports rename-in-place, inline preview via
 * `<FilePreview>` (W11.C), open, download, delete, caption editing
 * (click-to-edit input), and a `BadgeSelect` for the per-file thesis-section
 * anchor (W11.D). A small "Newest / By section" sort dropdown groups files
 * by their section when the user wants the evidence-by-section view.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Download,
  FileText,
  FileImage,
  FileType2,
  File as FileIcon,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  BadgeSelect,
  SectionHeader,
  Tag,
  type BadgeSelectOption,
} from "@/components/ui/stitch";
import {
  deleteFile,
  getFile,
  listFiles,
  renameFile,
  totalSizeForThesis,
  updateMeta,
} from "@/lib/storage/research-files-store";
import type {
  ResearchFileKind,
  ResearchFileMeta,
  ResearchFileSectionAnchor,
} from "@/lib/domain/research-file";
import { fmtDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { FileDropzone } from "./file-dropzone";
import { FilePreview } from "./file-preview";

interface FilesSectionProps {
  thesisSymbol: string;
}

const MAX_THESIS_BYTES = 200 * 1024 * 1024; // mirror store cap; informational only

const SECTION_ANCHOR_OPTIONS: BadgeSelectOption<ResearchFileSectionAnchor | "">[] = [
  { value: "", label: "No section" },
  { value: "fundamentals", label: "Fundamentals" },
  { value: "marketPosition", label: "Market position" },
  { value: "valuation", label: "Valuation" },
  { value: "scenarios", label: "Scenarios" },
  { value: "tradePlan", label: "Trade plan" },
  { value: "general", label: "General" },
];

const SECTION_ANCHOR_LABEL: Record<ResearchFileSectionAnchor, string> = {
  fundamentals: "Fundamentals",
  marketPosition: "Market position",
  valuation: "Valuation",
  scenarios: "Scenarios",
  tradePlan: "Trade plan",
  general: "General",
};

const SECTION_ORDER: ResearchFileSectionAnchor[] = [
  "fundamentals",
  "marketPosition",
  "valuation",
  "scenarios",
  "tradePlan",
  "general",
];

type SortMode = "newest" | "bySection";

const SORT_OPTIONS: BadgeSelectOption<SortMode>[] = [
  { value: "newest", label: "Newest" },
  { value: "bySection", label: "By section" },
];

const SORT_LABEL: Record<SortMode, string> = {
  newest: "Newest",
  bySection: "By section",
};

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForKind(kind: ResearchFileKind) {
  switch (kind) {
    case "pdf":
      return FileText;
    case "image":
      return FileImage;
    case "text":
    case "markdown":
      return FileType2;
    default:
      return FileIcon;
  }
}

function progressBarColor(used: number, max: number): string {
  if (max <= 0) return "bg-regime-risk-on";
  const pct = used / max;
  if (pct < 0.6) return "bg-regime-risk-on";
  if (pct < 0.85) return "bg-regime-neutral";
  return "bg-regime-risk-off";
}

export function FilesSection({ thesisSymbol }: FilesSectionProps) {
  const [files, setFiles] = useState<ResearchFileMeta[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [openPreviewId, setOpenPreviewId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("newest");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [rows, total] = await Promise.all([
        listFiles(thesisSymbol),
        totalSizeForThesis(thesisSymbol),
      ]);
      setFiles(rows);
      setTotalSize(total);
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[files-section] refresh failed", err);
      }
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setHydrated(true);
    }
  }, [thesisSymbol]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleUploaded() {
    await refresh();
  }

  async function handleDelete(id: string) {
    try {
      await deleteFile(id);
      if (openPreviewId === id) setOpenPreviewId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      await renameFile(id, name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename file");
    }
  }

  async function handleUpdateMeta(
    id: string,
    patch: { caption?: string; sectionAnchor?: ResearchFileSectionAnchor },
  ) {
    try {
      await updateMeta(id, patch);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update file");
    }
  }

  /**
   * Open the file's blob in a new tab. Materialised on demand because we
   * don't keep blob URLs around for every row — that would leak memory and
   * the user usually only opens one file at a time.
   */
  async function handleOpen(meta: ResearchFileMeta) {
    try {
      const got = await getFile(meta.id);
      if (!got) return;
      const url = URL.createObjectURL(got.blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // Best-effort revoke a minute later — leaving it open longer than the
      // tab needs is wasteful, but revoking too soon breaks the open tab.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open file");
    }
  }

  async function handleDownload(meta: ResearchFileMeta) {
    try {
      const got = await getFile(meta.id);
      if (!got) return;
      const url = URL.createObjectURL(got.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download file");
    }
  }

  const pct = Math.min(100, (totalSize / MAX_THESIS_BYTES) * 100);
  const pendingDelete = pendingDeleteId
    ? files.find((f) => f.id === pendingDeleteId) ?? null
    : null;

  const sortedFiles = sortFiles(files, sort);

  function renderRow(meta: ResearchFileMeta) {
    return (
      <FileRow
        key={meta.id}
        meta={meta}
        previewOpen={openPreviewId === meta.id}
        onTogglePreview={() =>
          setOpenPreviewId((current) =>
            current === meta.id ? null : meta.id,
          )
        }
        onRename={(name) => handleRename(meta.id, name)}
        onOpen={() => handleOpen(meta)}
        onDownload={() => handleDownload(meta)}
        onRequestDelete={() => setPendingDeleteId(meta.id)}
        onUpdateCaption={(caption) => handleUpdateMeta(meta.id, { caption })}
        onUpdateSection={(sectionAnchor) =>
          handleUpdateMeta(meta.id, { sectionAnchor })
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Files"
        caption="Attach PDFs, screenshots, transcripts, or notes that back up this thesis. Stored locally in IndexedDB."
        action={
          files.length > 0 ? (
            <BadgeSelect<SortMode>
              value={sort}
              options={SORT_OPTIONS}
              onSelect={(next) => setSort(next)}
              ariaLabel="Sort files"
            >
              <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary">
                {SORT_LABEL[sort]}
              </span>
            </BadgeSelect>
          ) : null
        }
      />

      <FileDropzone
        thesisSymbol={thesisSymbol}
        onUploaded={() => {
          void handleUploaded();
        }}
      />

      {error ? (
        <p
          role="alert"
          className="font-body-compact text-body-compact text-regime-risk-off"
        >
          {error}
        </p>
      ) : null}

      {hydrated && files.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No files attached. Drop PDFs, screenshots, or notes here to support
          this thesis.
        </p>
      ) : null}

      {sort === "bySection" && files.length > 0 ? (
        <div className="space-y-4">
          {groupBySection(sortedFiles).map(([section, rows]) => (
            <div key={section ?? "_none"} className="space-y-2">
              <h4 className="font-label-caps text-label-caps uppercase text-text-secondary">
                {section ? SECTION_ANCHOR_LABEL[section] : "Unassigned"}
              </h4>
              <ul className="space-y-2">{rows.map(renderRow)}</ul>
            </div>
          ))}
        </div>
      ) : files.length > 0 ? (
        <ul className="space-y-2">{sortedFiles.map(renderRow)}</ul>
      ) : null}

      {files.length > 0 ? (
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between font-label-caps text-label-caps uppercase text-text-secondary">
            <span>
              {files.length} {files.length === 1 ? "file" : "files"} ·{" "}
              {formatSize(totalSize)} / {formatSize(MAX_THESIS_BYTES)}
            </span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
            <div
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className={cn(
                "h-full transition-[width]",
                progressBarColor(totalSize, MAX_THESIS_BYTES),
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this file?"
        description={
          pendingDelete
            ? `Remove "${pendingDelete.name}" (${formatSize(pendingDelete.size)}) from this thesis? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDeleteId) void handleDelete(pendingDeleteId);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

function sortFiles(files: ResearchFileMeta[], mode: SortMode): ResearchFileMeta[] {
  if (mode === "newest") {
    return [...files].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }
  // bySection — keep newest within each bucket
  return [...files].sort((a, b) => {
    const aIdx = a.sectionAnchor ? SECTION_ORDER.indexOf(a.sectionAnchor) : 99;
    const bIdx = b.sectionAnchor ? SECTION_ORDER.indexOf(b.sectionAnchor) : 99;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.uploadedAt.localeCompare(a.uploadedAt);
  });
}

function groupBySection(
  files: ResearchFileMeta[],
): [ResearchFileSectionAnchor | null, ResearchFileMeta[]][] {
  const buckets = new Map<ResearchFileSectionAnchor | null, ResearchFileMeta[]>();
  for (const f of files) {
    const key = f.sectionAnchor ?? null;
    const list = buckets.get(key) ?? [];
    list.push(f);
    buckets.set(key, list);
  }
  const out: [ResearchFileSectionAnchor | null, ResearchFileMeta[]][] = [];
  for (const section of SECTION_ORDER) {
    if (buckets.has(section)) out.push([section, buckets.get(section)!]);
  }
  if (buckets.has(null)) out.push([null, buckets.get(null)!]);
  return out;
}

interface FileRowProps {
  meta: ResearchFileMeta;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onRename: (name: string) => void;
  onOpen: () => void;
  onDownload: () => void;
  onRequestDelete: () => void;
  onUpdateCaption: (caption: string) => void;
  onUpdateSection: (section: ResearchFileSectionAnchor | undefined) => void;
}

function FileRow({
  meta,
  previewOpen,
  onTogglePreview,
  onRename,
  onOpen,
  onDownload,
  onRequestDelete,
  onUpdateCaption,
  onUpdateSection,
}: FileRowProps) {
  const Icon = iconForKind(meta.kind);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(meta.name);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(meta.caption ?? "");

  // Re-sync local drafts when the meta changes from a refresh.
  useEffect(() => {
    setNameDraft(meta.name);
  }, [meta.name]);
  useEffect(() => {
    setCaptionDraft(meta.caption ?? "");
  }, [meta.caption]);

  function commitName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === meta.name) {
      setEditingName(false);
      setNameDraft(meta.name);
      return;
    }
    onRename(trimmed);
    setEditingName(false);
  }
  function cancelName() {
    setNameDraft(meta.name);
    setEditingName(false);
  }

  function commitCaption() {
    const trimmed = captionDraft.trim();
    if (trimmed === (meta.caption ?? "")) {
      setEditingCaption(false);
      return;
    }
    onUpdateCaption(trimmed);
    setEditingCaption(false);
  }
  function cancelCaption() {
    setCaptionDraft(meta.caption ?? "");
    setEditingCaption(false);
  }

  return (
    <li className="rounded-md border border-border-subtle bg-surface-elevated p-3">
      <div className="flex flex-wrap items-start gap-3">
        <Icon className="size-5 shrink-0 text-text-secondary mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitName();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelName();
                }
              }}
              className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="File name"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="block w-full truncate text-left font-body-compact text-body-compact text-text-primary hover:underline"
              title="Click to rename"
            >
              {meta.name}
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2 font-label-caps text-label-caps uppercase text-text-secondary">
            <span>{formatSize(meta.size)}</span>
            <span aria-hidden="true">·</span>
            <span>{fmtDate(meta.uploadedAt)}</span>
            {meta.sectionAnchor ? (
              <Tag>{SECTION_ANCHOR_LABEL[meta.sectionAnchor]}</Tag>
            ) : null}
          </div>
          {editingCaption ? (
            <input
              autoFocus
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              onBlur={commitCaption}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCaption();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelCaption();
                }
              }}
              placeholder="Caption — what does this file show?"
              className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="File caption"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingCaption(true)}
              className={cn(
                "block w-full truncate text-left font-body-compact text-body-compact hover:underline",
                meta.caption
                  ? "text-text-primary"
                  : "text-text-secondary italic",
              )}
              title="Click to edit caption"
            >
              {meta.caption || "Add caption"}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <BadgeSelect<ResearchFileSectionAnchor | "">
            value={meta.sectionAnchor ?? ""}
            options={SECTION_ANCHOR_OPTIONS}
            onSelect={(next) =>
              onUpdateSection(next === "" ? undefined : next)
            }
            ariaLabel={`Section anchor for ${meta.name}`}
          >
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary">
              {meta.sectionAnchor
                ? SECTION_ANCHOR_LABEL[meta.sectionAnchor]
                : "Section"}
            </span>
          </BadgeSelect>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onTogglePreview}
            aria-pressed={previewOpen}
          >
            {previewOpen ? (
              <>
                <EyeOff className="size-4" aria-hidden="true" />
                Hide
              </>
            ) : (
              <>
                <Eye className="size-4" aria-hidden="true" />
                Preview
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpen}
            aria-label={`Open ${meta.name} in a new tab`}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Open
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDownload}
            aria-label={`Download ${meta.name}`}
          >
            <Download className="size-4" aria-hidden="true" />
            Download
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRequestDelete}
            className="text-text-secondary hover:text-destructive"
            aria-label={`Delete ${meta.name}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {previewOpen ? (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <FilePreview meta={meta} />
        </div>
      ) : null}
    </li>
  );
}
