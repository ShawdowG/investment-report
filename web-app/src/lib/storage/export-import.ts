import type { ResearchFileMeta } from "@/lib/domain/research-file";
import {
  listAllFilesForBackup,
  replaceAllFilesFromBackup,
  type ResearchFileBackupEntry,
} from "./research-files-store";
import { readJsonResult, removeKey, writeJson } from "./local-storage";
import { DATASET_IDS, DATASET_REGISTRY, type DatasetId } from "./registry";

export const EXPORT_SCHEMA = "investment-report-v2" as const;
export const LEGACY_EXPORT_SCHEMA = "investment-report-v1" as const;

type ExportData = Record<DatasetId, unknown>;

export interface EncodedResearchFile {
  meta: ResearchFileMeta;
  blob: { type: string; base64: string };
}

export interface ExportPayload {
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  data: ExportData;
  files: EncodedResearchFile[];
}

export interface LegacyExportPayload {
  schema: typeof LEGACY_EXPORT_SCHEMA;
  exportedAt?: string;
  data: Partial<ExportData>;
}

export type ImportPayload = ExportPayload | LegacyExportPayload;

function readDataset(id: DatasetId): unknown {
  const entry = DATASET_REGISTRY[id];
  const result = readJsonResult<unknown>(entry.key);
  if (!result.ok) throw new Error(result.message);
  return result.status === "missing" ? entry.defaultValue : result.value;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function encodeFile(entry: ResearchFileBackupEntry): Promise<EncodedResearchFile> {
  const blob = entry.blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
  const buffer = blob.arrayBuffer
    ? await blob.arrayBuffer()
    : await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("Could not read attachment."));
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(blob);
      });
  return {
    meta: entry.meta,
    blob: {
      type: entry.blob.type,
      base64: bytesToBase64(new Uint8Array(buffer)),
    },
  };
}

function decodeFiles(files: EncodedResearchFile[]): ResearchFileBackupEntry[] {
  return files.map((entry) => ({
    meta: entry.meta,
    blob: new Blob([base64ToBytes(entry.blob.base64)], { type: entry.blob.type }),
  }));
}

export async function buildExportPayload(now = new Date()): Promise<ExportPayload> {
  const data = Object.fromEntries(DATASET_IDS.map((id) => [id, readDataset(id)])) as ExportData;
  const files = await Promise.all((await listAllFilesForBackup()).map(encodeFile));
  return { schema: EXPORT_SCHEMA, exportedAt: now.toISOString(), data, files };
}

function formatDateStamp(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function exportAllData(): Promise<void> {
  if (typeof window === "undefined") throw new Error("Export is only available in the browser.");
  const payload = await buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `investment-report-export-${formatDateStamp(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type ImportValidationResult =
  | { ok: true; payload: ImportPayload }
  | { ok: false; reason: string };

export function parseImportText(raw: string): ImportValidationResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "File is not valid JSON." };
  }
  if (typeof candidate !== "object" || candidate === null) {
    return { ok: false, reason: "Top-level value must be an object." };
  }
  const object = candidate as Record<string, unknown>;
  if (object.schema !== EXPORT_SCHEMA && object.schema !== LEGACY_EXPORT_SCHEMA) {
    return { ok: false, reason: "Unrecognized backup schema marker." };
  }
  if (typeof object.data !== "object" || object.data === null || Array.isArray(object.data)) {
    return { ok: false, reason: "Missing 'data' object." };
  }
  if (object.schema === EXPORT_SCHEMA && !Array.isArray(object.files)) {
    return { ok: false, reason: "Version 2 backup is missing its files array." };
  }
  return { ok: true, payload: candidate as ImportPayload };
}

function backupLocalValues(ids: DatasetId[]): Map<string, string | null> {
  const backup = new Map<string, string | null>();
  for (const id of ids) backup.set(DATASET_REGISTRY[id].key, localStorage.getItem(DATASET_REGISTRY[id].key));
  return backup;
}

function restoreLocalValues(backup: Map<string, string | null>): void {
  for (const [key, value] of backup) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }
}

/** Legacy backups update only fields they contain; omitted personal data is retained. */
export async function applyImport(payload: ImportPayload): Promise<void> {
  if (typeof window === "undefined") throw new Error("Import is only available in the browser.");
  const ids = DATASET_IDS.filter((id) => Object.hasOwn(payload.data, id));
  const localBackup = backupLocalValues(ids);
  const fileBackup = payload.schema === EXPORT_SCHEMA ? await listAllFilesForBackup() : null;
  try {
    for (const id of ids) {
      const value = payload.data[id];
      if (value === undefined || value === null) removeKey(DATASET_REGISTRY[id].key);
      else writeJson(DATASET_REGISTRY[id].key, value);
    }
    if (payload.schema === EXPORT_SCHEMA) {
      await replaceAllFilesFromBackup(decodeFiles(payload.files));
    }
  } catch (error) {
    restoreLocalValues(localBackup);
    if (fileBackup) {
      try {
        await replaceAllFilesFromBackup(fileBackup);
      } catch {
        // The original error remains the actionable failure.
      }
    }
    throw error;
  }
}
