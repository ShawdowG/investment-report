export interface RangeOption {
  label: string;
  /**
   * Trading bars to slice from the end. Special values:
   *   -1 = year-to-date (custom slice)
   *   -2 = full series available
   */
  bars: number;
}

export const RANGES: RangeOption[] = [
  { label: "1M", bars: 22 },
  { label: "3M", bars: 66 },
  { label: "6M", bars: 132 },
  { label: "YTD", bars: -1 },
  { label: "1Y", bars: 252 },
  { label: "3Y", bars: 756 },
  { label: "5Y", bars: 1260 },
  { label: "ALL", bars: -2 },
];

/**
 * Slice a date-sorted ascending array by the chosen range.
 * Items only need a `date` string starting with the year (YYYY-...).
 */
export function sliceForRange<T extends { date: string }>(
  data: T[],
  range: RangeOption,
): T[] {
  if (range.bars === -2) return data;
  if (range.bars === -1) {
    if (data.length === 0) return [];
    const year = data[data.length - 1].date.slice(0, 4);
    const startIdx = data.findIndex((b) => b.date.startsWith(year));
    return startIdx === -1 ? data : data.slice(startIdx);
  }
  return data.slice(-range.bars);
}
