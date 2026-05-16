"use client";

/**
 * SPEC-027 W11.B — Drag-drop file dropzone for per-thesis attachments.
 *
 * Handles both drag-drop and click-to-browse uploads, calling the
 * IndexedDB-backed `uploadFile()` for each file. Hard limits (25 MB per file,
 * 200 MB per thesis) are enforced inside the store — we just surface whatever
 * error the store throws inline. The soft-warning threshold (10 MB) is purely
 * a UX nudge so the user knows the upload is intentionally big.
 *
 * The dropzone is intentionally dumb about list state — the parent owns the
 * `ResearchFileMeta[]` and refreshes via the `onUploaded` callback.
 */

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Upload } from "lucide-react";
import {
  uploadFile,
} from "@/lib/storage/research-files-store";
import type { ResearchFileMeta } from "@/lib/domain/research-file";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  thesisSymbol: string;
  onUploaded: (meta: ResearchFileMeta) => void;
  /** Optional: hide the helper text (used when files-section already has its own copy). */
  compact?: boolean;
}

const SOFT_WARN_BYTES = 10 * 1024 * 1024;

interface PerFileStatus {
  name: string;
  state: "uploading" | "ok" | "error" | "warn";
  message?: string;
}

export function FileDropzone({
  thesisSymbol,
  onUploaded,
  compact = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statuses, setStatuses] = useState<PerFileStatus[]>([]);

  async function handleFiles(fileList: FileList | File[] | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Seed status rows so the UI immediately reflects what's happening.
    const seeded: PerFileStatus[] = files.map((f) => ({
      name: f.name,
      state: "uploading",
    }));
    setStatuses(seeded);

    const results: PerFileStatus[] = [];
    for (const file of files) {
      try {
        const meta = await uploadFile({ thesisSymbol, file });
        onUploaded(meta);
        if (file.size > SOFT_WARN_BYTES) {
          results.push({
            name: file.name,
            state: "warn",
            message: "Large file — uploaded, but consider trimming if possible",
          });
        } else {
          results.push({ name: file.name, state: "ok" });
        }
      } catch (err) {
        results.push({
          name: file.name,
          state: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
    setStatuses(results);

    // Auto-clear the success rows after a beat so they don't accumulate.
    const allClean = results.every((r) => r.state === "ok");
    if (allClean) {
      setTimeout(() => setStatuses([]), 1800);
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    // Only clear if leaving the dropzone itself, not a child element.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }
  function onPick() {
    inputRef.current?.click();
  }
  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    void handleFiles(e.target.files);
    // Reset so picking the same file twice still fires.
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={onPick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-label="Drop files here or click to browse"
        className={cn(
          "rounded-md border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          dragOver
            ? "border-primary bg-surface-elevated"
            : "border-border-subtle bg-surface-variant/30 hover:bg-surface-variant/50",
        )}
      >
        <Upload
          className="mx-auto mb-2 size-6 text-text-secondary"
          aria-hidden="true"
        />
        <p className="font-body-compact text-body-compact text-text-primary">
          Drop files here or <span className="underline">click to browse</span>
        </p>
        {!compact ? (
          <p className="mt-1 font-label-caps text-label-caps uppercase text-text-secondary">
            PDFs · Images · Text · Markdown — 25 MB per file, 200 MB per thesis
          </p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={onInputChange}
        />
      </div>

      {statuses.length > 0 ? (
        <ul className="space-y-1">
          {statuses.map((s, i) => (
            <li
              key={`${s.name}-${i}`}
              className={cn(
                "font-body-compact text-body-compact",
                s.state === "error" && "text-regime-risk-off",
                s.state === "warn" && "text-regime-neutral",
                s.state === "ok" && "text-regime-risk-on",
                s.state === "uploading" && "text-text-secondary",
              )}
            >
              {s.state === "uploading"
                ? `Uploading ${s.name}…`
                : s.state === "ok"
                  ? `Uploaded ${s.name}`
                  : s.state === "warn"
                    ? `${s.name} — ${s.message}`
                    : `${s.name} — ${s.message ?? "Upload failed"}`}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
