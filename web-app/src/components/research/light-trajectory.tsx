"use client";

/**
 * SPEC-026 W10.C — light trajectory for a thesis.
 *
 * Builds a chronological timeline from:
 *  - the thesis's `createdAt` + initial `currentLight`
 *  - every QuarterlyReview's `{ createdAt, light }`
 *  - the thesis's `updatedAt` + current `currentLight` if `updatedAt` is
 *    later than every prior point (caps the line at the latest state)
 *
 * Renders a horizontal axis with colored dots positioned by absolute X
 * offset (no recharts — overkill for at most ~10 points). Hovering a dot
 * shows date + light + source string. Range pills (1M/3M/6M/YTD/1Y/3Y)
 * slice the underlying series.
 *
 * Empty-state contract: when fewer than 2 distinct timeline points exist
 * after slicing, render an instructional placeholder instead of a chart.
 */

import { useEffect, useMemo, useState } from "react";
import { RangePills } from "@/components/charts/range-pills";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
import type { Light } from "@/lib/domain/thesis";
import { RANGES, sliceForRange, type RangeOption } from "@/lib/quotes/chart-ranges";
import { listByThesis } from "@/lib/storage/quarterly-review-store";
import { getThesis } from "@/lib/storage/thesis-store";
import { fmtDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface LightTrajectoryProps {
  symbol: string;
}

interface TrajectoryPoint {
  date: string;
  light: Light;
  source: string;
}

const RANGE_OPTIONS: RangeOption[] = RANGES.filter((r) =>
  ["1M", "3M", "6M", "YTD", "1Y", "3Y"].includes(r.label),
);
const DEFAULT_RANGE_IDX = RANGE_OPTIONS.findIndex((r) => r.label === "1Y");

const LIGHT_DOT_COLOR: Record<Light, string> = {
  green: "bg-regime-risk-on border-regime-risk-on",
  yellow: "bg-regime-neutral border-regime-neutral",
  red: "bg-regime-risk-off border-regime-risk-off",
};

const LIGHT_LABEL: Record<Light, string> = {
  green: "Green",
  yellow: "Yellow",
  red: "Red",
};

function toIsoDate(iso: string): string {
  return iso.slice(0, 10);
}

export function LightTrajectory({ symbol }: LightTrajectoryProps) {
  const [points, setPoints] = useState<TrajectoryPoint[]>([]);
  const [ready, setReady] = useState(false);
  const [rangeIdx, setRangeIdx] = useState(
    DEFAULT_RANGE_IDX >= 0 ? DEFAULT_RANGE_IDX : RANGE_OPTIONS.length - 1,
  );

  useEffect(() => {
    const thesis = getThesis(symbol);
    if (!thesis) {
      setPoints([]);
      setReady(true);
      return;
    }
    const reviews = listByThesis(symbol);

    const raw: TrajectoryPoint[] = [];
    raw.push({
      date: toIsoDate(thesis.createdAt),
      light: thesis.currentLight,
      source: "from thesis creation",
    });
    for (const review of reviews) {
      raw.push({
        date: toIsoDate(review.createdAt),
        light: review.light,
        source: `from ${review.quarterLabel || "quarterly review"}`,
      });
    }
    const updatedDate = toIsoDate(thesis.updatedAt);
    const last = raw[raw.length - 1];
    if (!last || updatedDate > last.date) {
      raw.push({
        date: updatedDate,
        light: thesis.currentLight,
        source: "from last thesis edit",
      });
    }

    raw.sort((a, b) => a.date.localeCompare(b.date));
    setPoints(raw);
    setReady(true);
  }, [symbol]);

  const sliced = useMemo(() => {
    if (points.length === 0) return points;
    return sliceForRange(points, RANGE_OPTIONS[rangeIdx]);
  }, [points, rangeIdx]);

  if (!ready) {
    return null;
  }

  // Empty state when fewer than 2 distinct points exist *in total*. We don't
  // gate on the sliced array — if the user has 5 historical points but the
  // 1M window catches only one, the chart still has enough total data; the
  // pill change will rescue them.
  if (points.length < 2) {
    return (
      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="Light trajectory"
          caption="Tracks how your conviction has moved over time."
        />
        <p className="font-body-compact text-body-compact text-text-secondary">
          Not enough light history yet — write a quarterly review or update
          the thesis to start tracking.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-card-padding gap-3">
      <SectionHeader
        title="Light trajectory"
        caption="Each dot is a thesis save or quarterly review."
        action={
          <RangePills
            ranges={RANGE_OPTIONS}
            selectedIdx={rangeIdx}
            onSelect={setRangeIdx}
          />
        }
      />
      {sliced.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No data in this range. Widen the window to see earlier reviews.
        </p>
      ) : (
        <TimelineAxis points={sliced} />
      )}
    </Card>
  );
}

function TimelineAxis({ points }: { points: TrajectoryPoint[] }) {
  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  const firstTs = new Date(firstDate).getTime();
  const lastTs = new Date(lastDate).getTime();
  const span = Math.max(lastTs - firstTs, 1); // avoid div-by-zero on same-day pair

  return (
    <div className="space-y-2 pt-2">
      <div className="relative h-10">
        {/* Axis line */}
        <div
          aria-hidden="true"
          className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-px bg-border-subtle"
        />
        {points.map((p, i) => {
          const ts = new Date(p.date).getTime();
          const pct = ((ts - firstTs) / span) * 100;
          return (
            <div
              key={`${p.date}-${i}`}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `calc(${pct}% * 0.94 + 8px)` }}
            >
              <span
                className={cn(
                  "block size-3.5 rounded-full border-2 ring-2 ring-surface",
                  LIGHT_DOT_COLOR[p.light],
                )}
                aria-label={`${LIGHT_LABEL[p.light]} on ${p.date}`}
                role="img"
              />
              <div
                role="tooltip"
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10",
                  "hidden group-hover:block group-focus-within:block",
                  "whitespace-nowrap rounded-md border border-border-subtle bg-surface px-2 py-1 shadow-lg",
                  "font-body-compact text-body-compact text-text-primary",
                )}
              >
                <div>
                  <span className="font-data-mono">{p.date}</span> —{" "}
                  {LIGHT_LABEL[p.light]}
                </div>
                <div className="text-text-secondary text-xs">{p.source}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-text-secondary font-label-caps text-label-caps uppercase">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
      <p className="font-body-compact text-body-compact text-text-secondary">
        {points.length} point{points.length === 1 ? "" : "s"} · most recent:{" "}
        <span className="text-text-primary">
          {LIGHT_LABEL[points[points.length - 1].light]}
        </span>{" "}
        on {fmtDate(points[points.length - 1].date)}
      </p>
    </div>
  );
}
