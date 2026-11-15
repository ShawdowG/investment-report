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

const SAFE_RASTER_IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SAFE_TEXT_MIME_TYPES = new Set([
  "text/csv",
  "text/markdown",
  "text/plain",
  "text/x-markdown",
]);

function normalizeMime(mime: string): string {
  return (mime ?? "").split(";", 1)[0].trim().toLowerCase();
}

/** Active image formats such as SVG are intentionally excluded. */
export function isSafeRasterImageMime(mime: string): boolean {
  return SAFE_RASTER_IMAGE_MIME_TYPES.has(normalizeMime(mime));
}

/**
 * Only passive raster images and known text formats may open as blob URLs.
 * Text is re-wrapped as `text/plain` by the caller before navigation.
 */
export function canOpenResearchFile(meta: ResearchFileMeta): boolean {
  const mime = normalizeMime(meta.mimeType);
  return isSafeRasterImageMime(mime) || SAFE_TEXT_MIME_TYPES.has(mime);
}

/**
 * Derive the renderable kind from a MIME type. Returns `"other"` for anything
 * we don't preview inline (Office docs, archives, etc.).
 */
export function fileKindForMime(mime: string): ResearchFileKind {
  const normalized = normalizeMime(mime);
  if (!normalized) return "other";
  if (normalized === "application/pdf") return "pdf";
  if (isSafeRasterImageMime(normalized)) return "image";
  if (normalized === "text/markdown" || normalized === "text/x-markdown") {
    return "markdown";
  }
  if (normalized.startsWith("text/")) return "text";
  return "other";
}
