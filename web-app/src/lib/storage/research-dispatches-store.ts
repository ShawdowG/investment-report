import type { ResearchDispatch } from "@/lib/domain/research-dispatch";
import { readJson, writeJson } from "@/lib/storage/local-storage";

const STORAGE_KEY = "research_dispatches";

function readItems(): ResearchDispatch[] {
  const raw = readJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  const items: ResearchDispatch[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Partial<ResearchDispatch>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.body !== "string" ||
      typeof candidate.createdAt !== "string"
    ) {
      continue;
    }
    items.push({
      id: candidate.id,
      title: candidate.title,
      body: candidate.body,
      createdAt: candidate.createdAt,
      ...(candidate.ticker ? { ticker: candidate.ticker } : {}),
      ...(candidate.updatedAt ? { updatedAt: candidate.updatedAt } : {}),
    });
  }
  return items;
}

function sortNewestFirst(items: ResearchDispatch[]): ResearchDispatch[] {
  return [...items].sort((a, b) => {
    const aKey = a.updatedAt ?? a.createdAt;
    const bKey = b.updatedAt ?? b.createdAt;
    return bKey.localeCompare(aKey);
  });
}

function genId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTicker(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim().toUpperCase();
  return trimmed || undefined;
}

export interface DispatchInput {
  title: string;
  body: string;
  ticker?: string;
}

export function getDispatches(): ResearchDispatch[] {
  return sortNewestFirst(readItems());
}

export function getDispatch(id: string): ResearchDispatch | null {
  return readItems().find((d) => d.id === id) ?? null;
}

export function createDispatch(input: DispatchInput): ResearchDispatch {
  const items = readItems();
  const now = new Date().toISOString();
  const next: ResearchDispatch = {
    id: genId(),
    title: input.title.trim(),
    body: input.body,
    createdAt: now,
    ...(normalizeTicker(input.ticker) ? { ticker: normalizeTicker(input.ticker)! } : {}),
  };
  try {
    const ok = writeJson(STORAGE_KEY, [next, ...items]);
    if (!ok) {
      throw new Error("localStorage write returned false (quota or unavailable)");
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create research dispatch: ${reason}`);
  }
  return next;
}

export function updateDispatch(
  id: string,
  patch: Partial<DispatchInput>,
): ResearchDispatch | null {
  const items = readItems();
  const idx = items.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const current = items[idx];
  const next: ResearchDispatch = { ...current };
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.body !== undefined) next.body = patch.body;
  if (patch.ticker !== undefined) {
    const t = normalizeTicker(patch.ticker);
    if (t) next.ticker = t;
    else delete next.ticker;
  }
  next.updatedAt = new Date().toISOString();
  items[idx] = next;
  try {
    const ok = writeJson(STORAGE_KEY, items);
    if (!ok) {
      throw new Error("localStorage write returned false (quota or unavailable)");
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to update research dispatch ${id}: ${reason}`);
  }
  return next;
}

export function deleteDispatch(id: string): void {
  const items = readItems().filter((d) => d.id !== id);
  try {
    const ok = writeJson(STORAGE_KEY, items);
    if (!ok) {
      throw new Error("localStorage write returned false (quota or unavailable)");
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to delete research dispatch ${id}: ${reason}`);
  }
}

// SPEC-016: compile-time conformance check vs the contract.
import type { ResearchRepository } from "./contracts";
const _conforms: ResearchRepository = {
  list: getDispatches,
  get: getDispatch,
  create: createDispatch,
  update: updateDispatch,
  remove: deleteDispatch,
};
void _conforms;
