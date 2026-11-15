import { afterEach, describe, expect, it } from "vitest";
import { applyImport, buildExportPayload, parseImportText } from "./export-import";
import { DATASET_REGISTRY } from "./registry";
import {
  deleteAllFiles,
  getFile,
  replaceAllFilesFromBackup,
} from "./research-files-store";

function readBlobText(blob: Blob): Promise<string> {
  const modernBlob = blob as Blob & { text?: () => Promise<string> };
  if (modernBlob.text) return modernBlob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

afterEach(async () => {
  await deleteAllFiles();
});

describe("backup import and export", () => {
  it("round-trips all local datasets, unknown fields, metadata, and blob bytes", async () => {
    const thesis = { NVDA: { symbol: "NVDA", createdAt: "a", updatedAt: "b", future: { keep: true } } };
    localStorage.setItem(DATASET_REGISTRY.theses.key, JSON.stringify(thesis));
    localStorage.setItem(DATASET_REGISTRY.watchlist.key, JSON.stringify([{ symbol: "NVDA", future: 7 }]));
    await replaceAllFilesFromBackup([{
      meta: { id: "file-1", thesisSymbol: "NVDA", name: "note.txt", mimeType: "text/plain", kind: "text", size: 5, uploadedAt: "2026-01-01T00:00:00Z" },
      blob: new Blob(["hello"], { type: "text/plain" }),
    }]);

    const payload = await buildExportPayload(new Date("2026-11-14T00:00:00Z"));
    localStorage.clear();
    await deleteAllFiles();
    await applyImport(payload);

    expect(JSON.parse(localStorage.getItem(DATASET_REGISTRY.theses.key)!)).toEqual(thesis);
    expect(JSON.parse(localStorage.getItem(DATASET_REGISTRY.watchlist.key)!)).toEqual([{ symbol: "NVDA", future: 7 }]);
    const restored = await getFile("file-1");
    expect(restored?.meta.name).toBe("note.txt");
    expect(restored ? await readBlobText(restored.blob) : null).toBe("hello");
  });

  it("imports a v1 backup without deleting datasets that v1 did not contain", async () => {
    localStorage.setItem(DATASET_REGISTRY.theses.key, JSON.stringify({ KEEP: { future: true } }));
    const parsed = parseImportText(JSON.stringify({
      schema: "investment-report-v1",
      data: { watchlist: [{ symbol: "AAPL" }] },
    }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await applyImport(parsed.payload);
    expect(JSON.parse(localStorage.getItem(DATASET_REGISTRY.watchlist.key)!)).toEqual([{ symbol: "AAPL" }]);
    expect(JSON.parse(localStorage.getItem(DATASET_REGISTRY.theses.key)!)).toEqual({ KEEP: { future: true } });
  });
});
