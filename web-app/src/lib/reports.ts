/**
 * Data layer for report content.
 * search-index.json is imported directly (bundled at build time, no fs at runtime).
 * Markdown files are read via fs only during Next.js static export build.
 */
import fs from "node:fs";
import path from "node:path";
import type { ReportItem, SearchIndex } from "@/types/reports";

// Direct JSON import — bundled by Turbopack/webpack at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _rawIndex = require("../../../data/search-index.json") as {
  generatedAt: string;
  items: (Omit<ReportItem, "slug"> & { slug?: string; [key: string]: unknown })[];
};

// Project root is one level above web-app/ — only used at build time.
const ROOT = path.resolve(process.cwd(), "..");

export function loadSearchIndex(): SearchIndex {
  const items: ReportItem[] = (_rawIndex.items ?? []).map((item) => ({
    ...(item as object),
    slug: item.slug ?? `${item.date}-${item.slot}`,
  })) as ReportItem[];
  return { generatedAt: _rawIndex.generatedAt, items };
}

export function loadReportMarkdown(date: string, slot: string): string | null {
  const filePath = path.join(ROOT, "reports", "daily", `${date}-${slot}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

/** Parse YAML-style frontmatter from a markdown string. */
export function parseFrontmatter(content: string): {
  meta: Record<string, string | string[]>;
  body: string;
} {
  if (!content.startsWith("---\n")) return { meta: {}, body: content };
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return { meta: {}, body: content };
  const raw = content.slice(4, end).split("\n");
  const meta: Record<string, string | string[]> = {};
  for (const line of raw) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v: string | string[] = line.slice(idx + 1).trim();
    if (typeof v === "string" && v.startsWith("[") && v.endsWith("]")) {
      v = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    meta[k] = v;
  }
  return { meta, body: content.slice(end + 5) };
}

/** Extract a named section from the report body (lines between ## headings). */
export function extractSection(body: string, startLabel: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim().startsWith(startLabel));
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith("## ")) break;
    out.push(lines[i]);
  }
  return out;
}
