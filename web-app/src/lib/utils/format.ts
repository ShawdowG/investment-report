/**
 * Shared formatters. Per W0.2 — consolidates `fmtMoney` / `fmtDate` etc. that
 * were duplicated across portfolio-table, portfolio-impact-card, dispatch-list,
 * dispatch-view, ticker-dispatches, watchlist-table, and the dashboard charts.
 *
 * Migrate call sites incrementally — every page's polish workstream picks up
 * its own callers (see BACKLOG.md W1.2, W3.*, W8.G, etc.).
 */

/** "$1,234.56" — minimum 2 decimals. */
export function fmtMoney(n: number, currency: string = "USD"): string {
  const sym = currency === "USD" ? "$" : "";
  return `${sym}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "+$1,234.56" / "−$1,234.56" / "$0.00" — signed money with a leading sign. */
export function fmtMoneySigned(n: number, currency: string = "USD"): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const sym = currency === "USD" ? "$" : "";
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${sym}${abs}`;
}

/** "$1,234" — whole-dollar formatter for chart axes that don't need cents. */
export function fmtMoneyCompact(n: number, currency: string = "USD"): string {
  const sym = currency === "USD" ? "$" : "";
  const sign = n < 0 ? "-" : "";
  return `${sign}${sym}${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** "+12.34%" / "−1.20%" / "0.00%" — signed percent with two decimals. */
export function fmtPct(n: number, decimals: number = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

/** "2026-05-16" — accepts ISO date / datetime strings, returns the date portion. */
export function fmtDate(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/** "2026-05-16 21:45" — accepts ISO datetime strings, returns YYYY-MM-DD HH:MM. */
export function fmtDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "5m ago" / "3h ago" / "2d ago" / "2026-05-01" — human-friendly relative
 * timestamp for news rows (SPEC-029 W13.E). Falls back to `fmtDate` once the
 * article is 30+ days old so the user gets a real date instead of "65d ago".
 *
 * The reference "now" is injectable for tests / static builds; defaults to
 * `Date.now()` so callers don't have to thread it through.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return fmtDate(iso);
}
