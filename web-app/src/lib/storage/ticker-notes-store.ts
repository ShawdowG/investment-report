import type { TickerNote } from "@/lib/domain/ticker-note";
import { readJson, writeJson } from "@/lib/storage/local-storage";

const STORAGE_KEY = "ticker_notes";

type NotesRecord = Record<string, TickerNote[]>;

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

function readAll(): NotesRecord {
  const raw = readJson<unknown>(STORAGE_KEY, {});
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: NotesRecord = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const notes: TickerNote[] = [];
    for (const entry of value) {
      if (typeof entry !== "object" || entry === null) continue;
      const candidate = entry as Partial<TickerNote>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.symbol !== "string" ||
        typeof candidate.body !== "string" ||
        typeof candidate.createdAt !== "string"
      )
        continue;
      notes.push({
        id: candidate.id,
        symbol: candidate.symbol,
        body: candidate.body,
        createdAt: candidate.createdAt,
      });
    }
    out[normalizeSymbol(key)] = notes;
  }
  return out;
}

function sortNewestFirst(notes: TickerNote[]): TickerNote[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function genId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getNotes(rawSymbol: string): TickerNote[] {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return [];
  const all = readAll();
  return sortNewestFirst(all[symbol] ?? []);
}

export function addNote(rawSymbol: string, body: string): TickerNote[] {
  const symbol = normalizeSymbol(rawSymbol);
  const trimmed = body.trim();
  if (!symbol || !trimmed) return getNotes(rawSymbol);
  const all = readAll();
  const existing = all[symbol] ?? [];
  const note: TickerNote = {
    id: genId(),
    symbol,
    body: trimmed,
    createdAt: new Date().toISOString(),
  };
  all[symbol] = [...existing, note];
  writeJson(STORAGE_KEY, all);
  return sortNewestFirst(all[symbol]);
}

export function deleteNote(rawSymbol: string, id: string): TickerNote[] {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return getNotes(rawSymbol);
  const all = readAll();
  const existing = all[symbol] ?? [];
  const updated = existing.filter((n) => n.id !== id);
  if (updated.length === 0) {
    delete all[symbol];
  } else {
    all[symbol] = updated;
  }
  writeJson(STORAGE_KEY, all);
  return sortNewestFirst(updated);
}
