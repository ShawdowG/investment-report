"use client";

/**
 * SPEC-027 W11.B — Placeholder preview component.
 *
 * This minimal stub lets the files section render without crashing while
 * still showing the user that an inline preview is coming. The real per-kind
 * preview (PDF iframe, image, markdown, text) lands in W11.C.
 */

import type { ResearchFileMeta } from "@/lib/domain/research-file";

interface FilePreviewProps {
  meta: ResearchFileMeta;
}

export function FilePreview({ meta }: FilePreviewProps) {
  return (
    <p className="font-body-compact text-body-compact text-text-secondary">
      Preview for {meta.name} — inline previews ship in W11.C.
    </p>
  );
}
