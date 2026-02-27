/**
 * Server-only data layer.
 * Reads files from the project root (../reports/, ../data/) using Node.js fs.
 * Must only be imported by Server Components or server actions.
 */
import fs from "node:fs";
import path from "node:path";
import type { ReportItem, SearchIndex } from "@/types/reports";

// Project root is one level above web-app/
const ROOT = path.resolve(process.cwd(), "..");

export function loadSearchIndex(): SearchIndex {
  const filePath = path.join(ROOT, "data", "search-index.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);
  // Inject slug into each item if not present
  const items: ReportItem[] = (json.items || []).map(
    (item: Omit<ReportItem, "slug"> & { slug?: string }) => ({
      ...item,
      slug: item.slug ?? `${item.date}-${item.slot}`,
    })
  );
  return { generatedAt: json.generatedAt, items };
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
