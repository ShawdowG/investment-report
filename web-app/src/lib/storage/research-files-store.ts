/**
 * SPEC-027 W11.A — IndexedDB-backed research files store.
 *
 * One database (`investment-report`, version 1) with two object stores:
 *   - `research_files_meta`  keyPath `id`, secondary index on `thesisSymbol`.
 *   - `research_files_blobs` keyPath `id` (matches the meta row's id).
 *
 * Metadata is split from the blob so list views stay snappy — only the
 * (small) meta rows load on listing; the blob is materialised on demand for
 * previews / open / download (W11.B-C).
 *
 * All functions are async (IndexedDB is). They are SSR-safe: each guards on
 * `typeof window === "undefined"` so the module can be imported by server
 * components without crashing. Actual reads/writes only happen client-side.
 *
 * Future swap target: a Supabase Storage adapter satisfies the same
 * `ResearchFilesRepository` contract (see `./contracts.ts`).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  fileKindForMime,
  type ResearchFileMeta,
} from "@/lib/domain/research-file";

const DB_NAME = "investment-report";
const DB_VERSION = 1;
const META_STORE = "research_files_meta";
const BLOB_STORE = "research_files_blobs";
const META_BY_THESIS_INDEX = "by_thesis";

/** 25 MB per-file hard cap (SPEC-027 §3 / §6). */
const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** 200 MB per-thesis hard cap (SPEC-027 §3 / §6). */
const MAX_THESIS_BYTES = 200 * 1024 * 1024;

interface ResearchFilesDb extends DBSchema {
  research_files_meta: {
    key: string;
    value: ResearchFileMeta;
    indexes: { by_thesis: string };
  };
  research_files_blobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
}

export interface UploadFileInput {
  thesisSymbol: string;
  file: File;
  caption?: string;
  sectionAnchor?: ResearchFileMeta["sectionAnchor"];
}

const SSR_ERROR = "research-files-store: IndexedDB is only available in the browser";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function genId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

let dbPromise: Promise<IDBPDatabase<ResearchFilesDb>> | null = null;

function getDb(): Promise<IDBPDatabase<ResearchFilesDb>> {
  if (!isBrowser()) {
    return Promise.reject(new Error(SSR_ERROR));
  }
  if (!dbPromise) {
    dbPromise = openDB<ResearchFilesDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(META_STORE)) {
          const metaStore = db.createObjectStore(META_STORE, { keyPath: "id" });
          metaStore.createIndex(META_BY_THESIS_INDEX, "thesisSymbol", {
            unique: false,
          });
        }
        if (!db.objectStoreNames.contains(BLOB_STORE)) {
          db.createObjectStore(BLOB_STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function listFiles(
  thesisSymbol: string,
): Promise<ResearchFileMeta[]> {
  if (!isBrowser()) return [];
  const sym = normalizeSymbol(thesisSymbol);
  if (!sym) return [];
  const db = await getDb();
  const rows = await db.getAllFromIndex(META_STORE, META_BY_THESIS_INDEX, sym);
  // Newest first — matches the rest of the app's note/dispatch ordering.
  return [...rows].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getFile(
  id: string,
): Promise<{ meta: ResearchFileMeta; blob: Blob } | null> {
  if (!isBrowser()) return null;
  if (!id) return null;
  const db = await getDb();
  const meta = await db.get(META_STORE, id);
  if (!meta) return null;
  const blobRow = await db.get(BLOB_STORE, id);
  if (!blobRow) return null;
  return { meta, blob: blobRow.blob };
}

export async function uploadFile(
  input: UploadFileInput,
): Promise<ResearchFileMeta> {
  if (!isBrowser()) {
    throw new Error(SSR_ERROR);
  }
  const sym = normalizeSymbol(input.thesisSymbol);
  if (!sym) {
    throw new Error("Failed to upload file: thesisSymbol is required");
  }
  const file = input.file;
  if (!file) {
    throw new Error("Failed to upload file: file is required");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large — 25 MB max");
  }
  const currentTotal = await totalSizeForThesis(sym);
  if (currentTotal + file.size > MAX_THESIS_BYTES) {
    throw new Error("Thesis attachment quota exceeded");
  }

  const meta: ResearchFileMeta = {
    id: genId(),
    thesisSymbol: sym,
    name: file.name || "untitled",
    mimeType: file.type || "",
    kind: fileKindForMime(file.type || ""),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    ...(input.caption ? { caption: input.caption } : {}),
    ...(input.sectionAnchor ? { sectionAnchor: input.sectionAnchor } : {}),
  };

  const db = await getDb();
  const tx = db.transaction([META_STORE, BLOB_STORE], "readwrite");
  await Promise.all([
    tx.objectStore(META_STORE).put(meta),
    tx.objectStore(BLOB_STORE).put({ id: meta.id, blob: file }),
    tx.done,
  ]);
  return meta;
}

export async function deleteFile(id: string): Promise<void> {
  if (!isBrowser()) return;
  if (!id) return;
  const db = await getDb();
  const tx = db.transaction([META_STORE, BLOB_STORE], "readwrite");
  await Promise.all([
    tx.objectStore(META_STORE).delete(id),
    tx.objectStore(BLOB_STORE).delete(id),
    tx.done,
  ]);
}

export async function renameFile(
  id: string,
  name: string,
): Promise<ResearchFileMeta> {
  if (!isBrowser()) {
    throw new Error(SSR_ERROR);
  }
  if (!id) {
    throw new Error("Failed to rename file: id is required");
  }
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    throw new Error("Failed to rename file: name is required");
  }
  const db = await getDb();
  const existing = await db.get(META_STORE, id);
  if (!existing) {
    throw new Error(`Failed to rename file: no file with id ${id}`);
  }
  const next: ResearchFileMeta = { ...existing, name: trimmed };
  await db.put(META_STORE, next);
  return next;
}

export async function updateMeta(
  id: string,
  patch: Partial<Pick<ResearchFileMeta, "caption" | "sectionAnchor">>,
): Promise<ResearchFileMeta> {
  if (!isBrowser()) {
    throw new Error(SSR_ERROR);
  }
  if (!id) {
    throw new Error("Failed to update file meta: id is required");
  }
  const db = await getDb();
  const existing = await db.get(META_STORE, id);
  if (!existing) {
    throw new Error(`Failed to update file meta: no file with id ${id}`);
  }
  const next: ResearchFileMeta = { ...existing };
  if ("caption" in patch) {
    if (patch.caption && patch.caption.trim()) {
      next.caption = patch.caption;
    } else {
      delete next.caption;
    }
  }
  if ("sectionAnchor" in patch) {
    if (patch.sectionAnchor) {
      next.sectionAnchor = patch.sectionAnchor;
    } else {
      delete next.sectionAnchor;
    }
  }
  await db.put(META_STORE, next);
  return next;
}

export async function totalSizeForThesis(
  thesisSymbol: string,
): Promise<number> {
  if (!isBrowser()) return 0;
  const sym = normalizeSymbol(thesisSymbol);
  if (!sym) return 0;
  const db = await getDb();
  const rows = await db.getAllFromIndex(META_STORE, META_BY_THESIS_INDEX, sym);
  return rows.reduce((acc, row) => acc + (row.size ?? 0), 0);
}

/**
 * Wipe every attachment (meta + blob) across all theses. Backs the "Wipe all
 * files" button on /settings (W11.E; UI not built yet).
 */
export async function deleteAllFiles(): Promise<void> {
  if (!isBrowser()) return;
  const db = await getDb();
  const tx = db.transaction([META_STORE, BLOB_STORE], "readwrite");
  await Promise.all([
    tx.objectStore(META_STORE).clear(),
    tx.objectStore(BLOB_STORE).clear(),
    tx.done,
  ]);
}

// SPEC-016 / SPEC-027: compile-time conformance check vs the contract.
import type { ResearchFilesRepository } from "./contracts";
const _conforms: ResearchFilesRepository = {
  list: listFiles,
  get: getFile,
  upload: uploadFile,
  delete: deleteFile,
  rename: renameFile,
  updateMeta,
  totalSize: totalSizeForThesis,
};
void _conforms;
