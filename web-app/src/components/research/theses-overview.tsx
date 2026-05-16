"use client";

/**
 * SPEC-023 W8.J — Theses overview tab on `/research`.
 *
 * Reads every persisted thesis from localStorage and renders a sorted list of
 * row cards. Sort order: red lights first, yellow next, green last. Within a
 * bucket, most-recently-updated theses come first.
 *
 * Each row shows the symbol with its light dot, the planned action chip, the
 * last-update date, and (when `updatedAt` is older than the user's configured
 * stale threshold) a small "Review me" pill. Clicking a row navigates to the
 * thesis editor; the "New thesis" button reuses the existing window.prompt
 * pattern from `research-view.tsx` so the entry point matches the rest of the
 * surface.
 */

import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/stitch";
import { getTheses } from "@/lib/storage/thesis-store";
import { getDashboardSettings } from "@/lib/storage/dashboard-settings-store";
import { LIGHT_DOT_CLASS, LIGHT_ARIA } from "@/lib/research/thesis-light";
import type { Light, PlannedAction, Thesis } from "@/lib/domain/thesis";
import { fmtDate } from "@/lib/utils/format";

const LIGHT_RANK: Record<Light, number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

const PLANNED_ACTION_LABEL: Record<PlannedAction, string> = {
  hold: "Hold",
  add: "Add",
  trim: "Trim",
  sell: "Sell",
  watch: "Watch",
};

const DAY_MS = 86_400_000;

interface ThesesOverviewProps {
  onNewThesis: () => void;
}

export function ThesesOverview({ onNewThesis }: ThesesOverviewProps) {
  const router = useRouter();
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [staleAfterDays, setStaleAfterDays] = useState<number>(90);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = getTheses();
    const list = Object.values(map);
    setTheses(list);
    setStaleAfterDays(getDashboardSettings().thesisStaleAfterDays);
    setReady(true);
  }, []);

  const sorted = useMemo(() => {
    return [...theses].sort((a, b) => {
      const lightDelta = LIGHT_RANK[a.currentLight] - LIGHT_RANK[b.currentLight];
      if (lightDelta !== 0) return lightDelta;
      // Newer first within the same bucket.
      const aTs = new Date(a.updatedAt).getTime();
      const bTs = new Date(b.updatedAt).getTime();
      return bTs - aTs;
    });
  }, [theses]);

  const now = Date.now();
  const staleThresholdMs = staleAfterDays * DAY_MS;

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading theses…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding space-y-3 text-center">
        <p className="font-body-compact text-body-compact text-text-secondary">
          No theses yet. Click <span className="font-semibold">New thesis</span>{" "}
          above to start.
        </p>
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={onNewThesis}>
            <BookOpen className="size-4 mr-1" aria-hidden="true" />
            New thesis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((thesis) => {
        const updatedTs = new Date(thesis.updatedAt).getTime();
        const stale =
          Number.isFinite(updatedTs) && now - updatedTs > staleThresholdMs;
        return (
          <li key={thesis.symbol}>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/research/thesis/${encodeURIComponent(thesis.symbol)}`,
                )
              }
              className="w-full text-left rounded-lg border border-border-subtle bg-surface px-card-padding py-3 hover:bg-surface-variant/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block size-2.5 rounded-full ${LIGHT_DOT_CLASS[thesis.currentLight]}`}
                    aria-label={LIGHT_ARIA[thesis.currentLight]}
                    role="img"
                  />
                  <span className="font-data-mono text-h2 text-text-primary">
                    {thesis.symbol}
                  </span>
                  {thesis.plannedAction ? (
                    <Tag className="shrink-0">
                      {PLANNED_ACTION_LABEL[thesis.plannedAction]}
                    </Tag>
                  ) : null}
                  {stale ? (
                    <Tag className="shrink-0 bg-regime-neutral/10 text-regime-neutral border-regime-neutral/30">
                      Review me
                    </Tag>
                  ) : null}
                </div>
                <span className="font-label-caps text-label-caps uppercase text-text-secondary shrink-0">
                  Updated {fmtDate(thesis.updatedAt)}
                </span>
              </div>
              {thesis.thesisPoints.length > 0 ? (
                <p className="mt-2 font-body-compact text-body-compact text-text-secondary line-clamp-2">
                  {thesis.thesisPoints[0]}
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
