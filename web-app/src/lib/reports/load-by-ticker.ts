import fs from "node:fs";
import path from "node:path";
import type { ReportItem } from "@/types/reports";

const ROOT = path.resolve(process.cwd(), "..");
const BY_TICKER_DIR = path.join(ROOT, "data", "by-ticker");

function ensureSlug(item: ReportItem & { slug?: string }): ReportItem {
  return { ...item, slug: item.slug ?? `${item.date}-${item.slot}` } as ReportItem;
}

export function listAvailableTickers(): string[] {
  if (!fs.existsSync(BY_TICKER_DIR)) return [];
  return fs
    .readdirSync(BY_TICKER_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

export function loadByTicker(symbol: string): ReportItem[] | null {
  const filePath = path.join(BY_TICKER_DIR, `${symbol}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as ReportItem[];
    if (!Array.isArray(raw)) return null;
    return raw.map(ensureSlug);
  } catch {
    return null;
  }
}

export function suggestSymbols(query: string, limit = 3): string[] {
  if (!query) return [];
  const upper = query.toUpperCase();
  const all = listAvailableTickers();
  const direct = all.filter((s) => s.startsWith(upper));
  if (direct.length >= limit) return direct.slice(0, limit);
  const substring = all.filter((s) => s.includes(upper) && !direct.includes(s));
  return [...direct, ...substring].slice(0, limit);
}
