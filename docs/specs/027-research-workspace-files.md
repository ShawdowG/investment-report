# [SPEC-027] Research Workspace Files (Per-Thesis File Attachments via IndexedDB)

## 1. Context
SPEC-023 lets a thesis hold structured fields + multiple text notes (markdown). But the user's real workflow involves binary artifacts: 10-K and 10-Q PDFs from SEC EDGAR, earnings call transcripts, screenshots of Yahoo data tables, charts from analyst reports, and so on. Stuffing those into base64 in localStorage burns the 5 MB cap fast and produces a brittle UX.

A thesis page should feel like a research project workspace — text notes alongside the documents that back them up.

## 2. Problem
- localStorage is the wrong tool for binary blobs. Even a single 1 MB PDF base64-encoded is ~1.4 MB of JSON, eating ~30% of the per-origin budget.
- Without first-class file support, the user keeps their backing documents elsewhere (Downloads, Drive, scattered tabs) and the thesis loses the connection between claims and evidence.
- When SPEC-012 Supabase sync eventually lands, file storage will need its own bucket; pretending files are "just strings in localStorage" delays that decision and complicates the migration.

## 3. Scope

### In scope
- New IndexedDB-backed store for file attachments, keyed by thesis symbol.
- Dependency: `idb` (~3 KB) — minimal IndexedDB wrapper.
- Per-thesis file area with drag-drop upload, file list, inline preview.
- Supported file types in v1:
  - **PDFs** — rendered in an `<iframe>` (or `<object>`) using a blob URL.
  - **Images** (jpg/png/webp/gif) — `<img>` with the blob URL.
  - **Plain text + markdown** — rendered in `MarkdownBody`.
- Per-file metadata: name, mime type, size (bytes), uploadedAt, optional user caption, optional thesis-section anchor (e.g. "this file supports §4 fundamentals").
- Repository contract pattern so a future Supabase Storage swap is a single-file change (SPEC-012's Storage row).
- Hard cap per file: 25 MB (most 10-K PDFs are well under 10 MB). Soft warning at 10 MB. Hard cap per thesis: 200 MB. Configurable in `/settings`.
- Delete / rename per file. No editing of file contents in-app.
- "Open in new tab" + "Download" actions.

### Out of scope
- OCR or text extraction from PDFs (no full-text search inside attachments).
- Office docs (.docx, .xlsx, .pptx) — render as "download only" with a generic icon. Don't attempt to display.
- Versioning of files (each upload is a new file; renames don't keep history).
- Sharing files across theses (each file belongs to exactly one thesis).
- Server-side antivirus scanning. Files are user-supplied for personal use; treat them as trusted on this device.
- Cross-device sync — SPEC-012 follow-up.

## 4. User stories
- As a thesis author, I want to attach the company's latest 10-K PDF to my thesis so I can re-open it from inside the app instead of digging through Downloads.
- As a thesis author, I want to drop screenshots of fundamentals tables onto the thesis and see them inline.
- As a thesis author, I want files tied to a thesis section so I remember which evidence supports which claim.
- As a future Supabase user, I want my files to migrate cleanly to cloud storage when sync lands.

## 5. Data contracts

```ts
// lib/domain/research-file.ts

export type ResearchFileKind = "pdf" | "image" | "text" | "markdown" | "other";

export interface ResearchFileMeta {
  id: string;                // uuid
  thesisSymbol: string;      // FK to Thesis.symbol
  name: string;              // original filename
  mimeType: string;          // e.g. "application/pdf"
  kind: ResearchFileKind;    // derived from mimeType
  size: number;              // bytes
  uploadedAt: string;
  caption?: string;          // user-supplied label
  sectionAnchor?:            // optional link to a thesis section
    | "fundamentals"
    | "marketPosition"
    | "valuation"
    | "scenarios"
    | "tradePlan"
    | "general";
}

// The blob itself lives separately from metadata for fast metadata queries.
export interface ResearchFileBlob {
  id: string;
  blob: Blob;
}
```

```ts
// lib/storage/research-files-store.ts (sketch, async because IndexedDB is)
export async function listFiles(thesisSymbol: string): Promise<ResearchFileMeta[]>;
export async function getFile(id: string): Promise<{ meta: ResearchFileMeta; blob: Blob } | null>;
export async function uploadFile(input: {
  thesisSymbol: string;
  file: File;                 // from input or drop
  caption?: string;
  sectionAnchor?: ResearchFileMeta["sectionAnchor"];
}): Promise<ResearchFileMeta>;
export async function deleteFile(id: string): Promise<void>;
export async function renameFile(id: string, name: string): Promise<ResearchFileMeta>;
export async function updateMeta(id: string, patch: Partial<Pick<ResearchFileMeta, "caption" | "sectionAnchor">>): Promise<ResearchFileMeta>;
export async function totalSizeForThesis(thesisSymbol: string): Promise<number>;
```

```ts
// lib/storage/contracts.ts addition
export interface ResearchFilesRepository {
  list: typeof listFiles;
  get: typeof getFile;
  upload: typeof uploadFile;
  delete: typeof deleteFile;
  rename: typeof renameFile;
  updateMeta: typeof updateMeta;
  totalSize: typeof totalSizeForThesis;
}
```

IndexedDB layout: one database `investment-report`, two object stores `research_files_meta` (indexed by `thesisSymbol`) and `research_files_blobs` (keyPath `id`).

## 6. UX notes
- New "Files" section on the thesis page, sits between Notes and Quarterly reviews.
- Drag-drop dropzone with a "Choose files" fallback button. Multi-file accepted.
- File list: rows with icon (per kind), name (rename in place), size, uploaded date, optional caption, section anchor pill, "Preview", "Open", "Download", "Delete".
- Preview opens inline:
  - PDFs in a constrained-height `<iframe>` with "Open full-screen" link.
  - Images in `<img>` (max-height ~600px) with click-to-zoom.
  - Text/markdown rendered with `MarkdownBody`.
  - Other → "No preview — Open or Download".
- Thesis page footer: "Files: 4 (8.2 MB / 200 MB)" running total with progress bar coloring (green/amber/red as usage rises).
- `/settings` gets a "Research files" card: current usage across all theses, per-thesis breakdown, "Wipe all files" button (with confirm).

## 7. Acceptance criteria
- [ ] AC1: Drag a PDF onto the thesis "Files" zone — it uploads, appears in the list, and previews inline.
- [ ] AC2: Refresh the page — the file is still listed and still previewable.
- [ ] AC3: Delete a file — it disappears from the list and is no longer present in IndexedDB.
- [ ] AC4: Uploading a file >25 MB fails with a visible error. Uploading a file >10 MB succeeds with a "Large file" warning.
- [ ] AC5: Total-size counter updates accurately after upload/delete.
- [ ] AC6: Renaming a file persists across refresh.
- [ ] AC7: `_conforms` assertion on `ResearchFilesRepository` passes `tsc --noEmit`. `npm run build` passes.
- [ ] AC8: Files are scoped to thesis symbol — listing files for `AAPL` does not return `MSFT` files.

## 8. Test plan
- **Unit:** store CRUD against a fake IndexedDB (use `fake-indexeddb` in tests or a thin abstraction we can mock).
- **Component:** dropzone accepts file events; file list renders rows; preview component dispatches by mime type.
- **Manual:** upload one PDF + one PNG + one .txt to a real thesis; verify previews; close browser and reopen; verify persistence.

## 9. Rollout plan
- W11.A: `idb` dep + IndexedDB store + repository contract.
- W11.B: Upload/list/delete UI on the thesis page (no preview yet).
- W11.C: Inline previews per kind.
- W11.D: Section anchors + caption editing.
- W11.E: Settings card (usage + wipe).

## 10. Risks
- **Risiko:** IndexedDB quota varies by browser and OS. A user with a big disk has 50 %+ available; a guest mode may have <100 MB. Uploads can fail unpredictably.
  **Mitigasjon:** Surface `navigator.storage.estimate()` in the settings card. Fail uploads gracefully with the actual error.
- **Risiko:** Rendering arbitrary PDFs in an `<iframe>` exposes the user to malicious-document attacks if they ever upload an untrusted PDF.
  **Mitigasjon:** PDFs render with `sandbox="allow-same-origin"` and no `allow-scripts`. Users are responsible for what they upload (personal-use app).
- **Risiko:** Future Supabase Storage swap will hit per-bucket limits and the upload contract may need to become Promise-based with retry; the IndexedDB version is already async so the surface is the same.
  **Mitigasjon:** Repository contract is async from day one; swap is a parallel module satisfying the same interface (per SPEC-016 pattern).
- **Risiko:** Migrations — if we change the IndexedDB schema, existing files must survive.
  **Mitigasjon:** Use `idb`'s versioning hooks. Bump version + run a migration callback when schema changes.
