import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');

/** Sanitize a report slug to safe URL characters (alphanumeric + hyphens) */
export function sanitizeSlug(date, slot) {
  return `${date}-${slot}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

export async function loadSearchIndex() {
  const file = path.join(repoRoot, 'data', 'search-index.json');
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

export async function loadByDate(date) {
  const file = path.join(repoRoot, 'data', 'by-date', `${date}.json`);
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

export async function loadReportMarkdown(date, slot) {
  const file = path.join(repoRoot, 'reports', 'daily', `${date}-${slot}.md`);
  return fs.readFile(file, 'utf8');
}
