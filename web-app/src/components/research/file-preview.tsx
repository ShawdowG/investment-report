"use client";

/**
 * SPEC-027 W11.C — Inline preview per file kind.
 *
 * Receives a `ResearchFileMeta` row, materialises the underlying blob from
 * IndexedDB, and renders a kind-appropriate preview:
 *
 *  - `pdf`      → `<iframe sandbox="allow-same-origin">` (no scripts, per §10
 *                  threat model)
 *  - `image`    → `<img>` with a constrained max-height, click → blob URL in
 *                  a new tab
 *  - `text` /
 *    `markdown` → blob.text(), rendered as either `<pre>` or `<MarkdownBody>`,
 *                  truncated to 5000 chars with an "Open file" link if longer
 *  - `other`    → "No preview available — Download to view"
 *
 * Memory: the blob URL is created in `useEffect` and revoked on unmount, so
 * toggling the preview off (which unmounts this component) reclaims the
 * URL immediately. We also re-issue the URL whenever the meta id changes.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFile } from "@/lib/storage/research-files-store";
import type { ResearchFileMeta } from "@/lib/domain/research-file";
import { MarkdownBody } from "./markdown-body";

interface FilePreviewProps {
  meta: ResearchFileMeta;
}

const TEXT_PREVIEW_LIMIT = 5000;

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; blob: Blob; blobUrl: string; text: string | null };

export function FilePreview({ meta }: FilePreviewProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    async function load() {
      try {
        const got = await getFile(meta.id);
        if (cancelled) return;
        if (!got) {
          setState({ kind: "error", message: "File not found in storage" });
          return;
        }
        url = URL.createObjectURL(got.blob);
        let text: string | null = null;
        if (meta.kind === "text" || meta.kind === "markdown") {
          text = await got.blob.text();
        }
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        setState({ kind: "ready", blob: got.blob, blobUrl: url, text });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load preview",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [meta.id, meta.kind]);

  if (state.kind === "loading") {
    return (
      <p className="font-body-compact text-body-compact text-text-secondary">
        Loading preview…
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="font-body-compact text-body-compact text-regime-risk-off">
        Preview failed — {state.message}
      </p>
    );
  }

  const { blobUrl, text } = state;

  if (meta.kind === "pdf") {
    return (
      <div className="space-y-2">
        <iframe
          src={blobUrl}
          title={`PDF: ${meta.name}`}
          sandbox="allow-same-origin"
          className="w-full rounded-md border border-border-subtle bg-surface"
          style={{ height: 480 }}
        />
        <a
          href={blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-body-compact text-body-compact text-text-secondary hover:text-text-primary underline"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  if (meta.kind === "image") {
    return (
      <a
        href={blobUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        aria-label={`Open ${meta.name} full size`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl}
          alt={meta.caption || meta.name}
          className="max-w-full rounded-md border border-border-subtle bg-surface"
          style={{ maxHeight: 600 }}
        />
      </a>
    );
  }

  if (meta.kind === "markdown") {
    const body = text ?? "";
    const truncated = body.length > TEXT_PREVIEW_LIMIT;
    const display = truncated ? body.slice(0, TEXT_PREVIEW_LIMIT) : body;
    return (
      <div className="space-y-2">
        <MarkdownBody source={display} />
        {truncated ? (
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-body-compact text-body-compact text-text-secondary hover:text-text-primary underline"
          >
            Open file to see more
          </a>
        ) : null}
      </div>
    );
  }

  if (meta.kind === "text") {
    const body = text ?? "";
    const truncated = body.length > TEXT_PREVIEW_LIMIT;
    const display = truncated ? body.slice(0, TEXT_PREVIEW_LIMIT) : body;
    return (
      <div className="space-y-2">
        <pre className="max-h-[480px] overflow-auto rounded-md border border-border-subtle bg-surface p-3 font-data-mono text-data-mono text-text-primary whitespace-pre-wrap">
          {display}
        </pre>
        {truncated ? (
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-body-compact text-body-compact text-text-secondary hover:text-text-primary underline"
          >
            Open file to see more
          </a>
        ) : null}
      </div>
    );
  }

  // other — no inline preview
  return (
    <div className="space-y-2">
      <p className="font-body-compact text-body-compact text-text-secondary">
        No preview available for this file type.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = meta.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }}
      >
        Download to view
      </Button>
    </div>
  );
}
