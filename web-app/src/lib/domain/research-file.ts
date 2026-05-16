/**
 * SPEC-027 research file domain.
 *
 * Per-thesis binary/document attachments live in IndexedDB (see
 * `web-app/src/lib/storage/research-files-store.ts`). Metadata is split from
 * the blob so listing is fast — only the `ResearchFileMeta` rows are fetched
 * for the file list; the blob is materialised on-demand for previews / open /
 * download.
 *
 * Symbols are stored uppercase to mirror `Thesis.symbol`.
 */

export type ResearchFileKind = "pdf" | "image" | "text" | "markdown" | "other";

export type ResearchFileSectionAnchor =
  | "fundamentals"
  | "marketPosition"
  | "valuation"
  | "scenarios"
  | "tradePlan"
  | "general";

export interface ResearchFileMeta {
  /** Stable UUID — also the key into the blob store. */
  id: string;
  /** FK to `Thesis.symbol` (always uppercase). */
  thesisSymbol: string;
  /** Original filename as supplied by the upload. */
  name: string;
  /** MIME type from the `File` object. Empty string is tolerated. */
  mimeType: string;
  /** Derived from `mimeType` via {@link fileKindForMime}. */
  kind: ResearchFileKind;
  /** Bytes. */
  size: number;
  /** ISO timestamp at upload time. */
  uploadedAt: string;
  /** Optional user-supplied caption. */
  caption?: string;
  /** Optional anchor linking the file to a thesis-page section. */
  sectionAnchor?: ResearchFileSectionAnchor;
}

/**
 * Derive the renderable kind from a MIME type. Returns `"other"` for anything
 * we don't preview inline (Office docs, archives, etc.).
 */
export function fileKindForMime(mime: string): ResearchFileKind {
  const normalized = (mime ?? "").trim().toLowerCase();
  if (!normalized) return "other";
  if (normalized === "application/pdf") return "pdf";
  if (normalized.startsWith("image/")) return "image";
  if (normalized === "text/markdown" || normalized === "text/x-markdown") {
    return "markdown";
  }
  if (normalized.startsWith("text/")) return "text";
  return "other";
}
