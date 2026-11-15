export interface QuoteFreshness {
  status: "fresh" | "stale" | "missing" | "invalid";
  businessDaysOld: number | null;
  ingestionHoursOld: number | null;
  reasons: string[];
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function businessDaysBetween(from: Date, to: Date): number {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  if (end <= start) return 0;
  let days = 0;
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

export function assessQuoteFreshness(input: {
  latestBarDate?: string;
  generatedAt?: string;
  now: Date;
  maxBusinessDays?: number;
  maxIngestionHours?: number;
}): QuoteFreshness {
  const bar = parseDate(input.latestBarDate);
  if (!input.latestBarDate) {
    return { status: "missing", businessDaysOld: null, ingestionHoursOld: null, reasons: ["No trading bar is available."] };
  }
  if (!bar) {
    return { status: "invalid", businessDaysOld: null, ingestionHoursOld: null, reasons: ["Trading bar date is invalid."] };
  }
  const generated = parseDate(input.generatedAt);
  if (input.generatedAt && !generated) {
    return { status: "invalid", businessDaysOld: null, ingestionHoursOld: null, reasons: ["Ingestion timestamp is invalid."] };
  }
  const businessDaysOld = businessDaysBetween(bar, input.now);
  const ingestionHoursOld = generated
    ? Math.max(0, (input.now.getTime() - generated.getTime()) / 3_600_000)
    : null;
  const reasons: string[] = [];
  if (businessDaysOld > (input.maxBusinessDays ?? 2)) reasons.push("The latest trading bar is stale.");
  if (ingestionHoursOld !== null && ingestionHoursOld > (input.maxIngestionHours ?? 72)) {
    reasons.push("The quote ingestion is stale.");
  }
  return {
    status: reasons.length > 0 ? "stale" : "fresh",
    businessDaysOld,
    ingestionHoursOld,
    reasons,
  };
}
