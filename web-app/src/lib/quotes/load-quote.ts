import fs from "node:fs";
import path from "node:path";
import type { QuoteSeries } from "./types";

const ROOT = path.resolve(process.cwd(), "..");
const QUOTES_DIR = path.join(ROOT, "data", "quotes");

export function listQuoteSymbols(): string[] {
  if (!fs.existsSync(QUOTES_DIR)) return [];
  return fs
    .readdirSync(QUOTES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

export function loadQuote(symbol: string): QuoteSeries | null {
  const filePath = path.join(QUOTES_DIR, `${symbol}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as QuoteSeries;
    if (!raw.symbol || !Array.isArray(raw.daily)) return null;
    return raw;
  } catch {
    return null;
  }
}
