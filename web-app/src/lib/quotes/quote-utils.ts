import type { QuoteBar } from "./types";

export interface Delta {
  abs: number;
  pct: number;
}

export function lastClose(daily: QuoteBar[]): number | null {
  return daily.length > 0 ? daily[daily.length - 1].close : null;
}

export function dayDelta(daily: QuoteBar[]): Delta | null {
  if (daily.length < 2) return null;
  const last = daily[daily.length - 1].close;
  const prev = daily[daily.length - 2].close;
  if (prev === 0) return null;
  return { abs: last - prev, pct: ((last - prev) / prev) * 100 };
}

export function deltaSinceBars(daily: QuoteBar[], n: number): Delta | null {
  if (daily.length < n + 1) return null;
  const last = daily[daily.length - 1].close;
  const past = daily[daily.length - 1 - n].close;
  if (past === 0) return null;
  return { abs: last - past, pct: ((last - past) / past) * 100 };
}

export function rangeHighLow(daily: QuoteBar[]): { high: number; low: number } | null {
  if (daily.length === 0) return null;
  let high = -Infinity;
  let low = Infinity;
  for (const bar of daily) {
    const h = bar.high ?? bar.close;
    const l = bar.low ?? bar.close;
    if (h > high) high = h;
    if (l < low) low = l;
  }
  if (!isFinite(high) || !isFinite(low)) return null;
  return { high, low };
}

export function ytdDelta(daily: QuoteBar[]): Delta | null {
  if (daily.length === 0) return null;
  const lastBar = daily[daily.length - 1];
  const year = lastBar.date.slice(0, 4);
  const startIdx = daily.findIndex((b) => b.date.startsWith(year));
  if (startIdx === -1) return null;
  const start = daily[startIdx].close;
  if (start === 0) return null;
  return { abs: lastBar.close - start, pct: ((lastBar.close - start) / start) * 100 };
}
