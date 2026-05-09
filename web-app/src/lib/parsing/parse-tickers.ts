import { normalizeSymbol } from "./normalize-symbol";

export interface ParseResult {
  accepted: string[];
  unknown: string[];
}

const TOKEN_SEPARATOR_REGEX = /[\s,;]+/;

export function parseTickers(input: string): ParseResult {
  if (typeof input !== "string") return { accepted: [], unknown: [] };

  const tokens = input.split(TOKEN_SEPARATOR_REGEX).filter((t) => t.length > 0);
  const acceptedSet = new Set<string>();
  const unknown: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeSymbol(token);
    if (normalized) {
      acceptedSet.add(normalized);
    } else {
      unknown.push(token);
    }
  }

  const accepted = [...acceptedSet].sort((a, b) => a.localeCompare(b));
  return { accepted, unknown };
}
