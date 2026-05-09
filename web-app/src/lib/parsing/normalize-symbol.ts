const EXCHANGE_PREFIX_REGEX = /^(NASDAQ|NYSE|AMEX|OSL|XETRA|LSE|TSX|HKEX|SHE|SHA):/i;
const SYMBOL_SHAPE_REGEX = /^[A-Z][A-Z0-9.-]{0,9}$/;

function isMixedCase(value: string): boolean {
  return /[A-Z]/.test(value) && /[a-z]/.test(value);
}

export function normalizeSymbol(token: string): string | null {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (!trimmed) return null;

  // Strip optional exchange prefix (case-insensitive).
  const prefixMatch = EXCHANGE_PREFIX_REGEX.exec(trimmed);
  const stripped = prefixMatch ? trimmed.slice(prefixMatch[0].length) : trimmed;
  if (!stripped) return null;

  // Reject mixed-case tokens — typical firm-name words like "Apple", "Inc.".
  if (isMixedCase(stripped)) return null;

  // Convert single-letter class suffix BRK-B -> BRK.B.
  const candidate = stripped.toUpperCase().replace(/-(?=[A-Z]$)/, ".");
  if (!SYMBOL_SHAPE_REGEX.test(candidate)) return null;

  return candidate;
}
