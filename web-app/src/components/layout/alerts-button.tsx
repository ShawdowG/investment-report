"use client";

/**
 * SPEC-026 W10.B — TopBar bell button that opens the alerts drawer.
 *
 * Trade-off on snapshot access (option (c) from the spec):
 *  - The app is statically exported; there's no `/api/snapshots` endpoint
 *    the client could hit to recompute crossed-zone alerts on demand.
 *  - Passing snapshots through context from the build-time-rendered shell
 *    would require either materialising the (~23-symbol) map into every
 *    page or marking AppShell as needing dynamic snapshot props, both of
 *    which leak server data through the layout.
 *  - Instead the dashboard's CrossedZonesCard writes the *count* of
 *    currently-crossed zones to localStorage("thesis_crossed_zone_count")
 *    on each mount. This component reads that count and adds it to the
 *    stale-thesis count it computes client-side from getTheses() alone.
 *
 * Caveat: if the user opens a non-dashboard page first, the crossed count
 * reflects the previous visit's snapshot. The dashboard is the first
 * thing the user lands on, so this is acceptable for v1.
 *
 * The drawer itself only enumerates stale theses by detail; crossed zones
 * appear as a one-line summary linking to /research where the full
 * CrossedZonesCard lives.
 */

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { AlertsDrawer } from "./alerts-drawer";
import type { ThesisAlert } from "@/lib/research/alerts";
import { buildAlerts } from "@/lib/research/alerts";
import { getTheses } from "@/lib/storage/thesis-store";
import { getDashboardSettings } from "@/lib/storage/dashboard-settings-store";

const CROSSED_COUNT_KEY = "thesis_crossed_zone_count";

function readCrossedCount(): number {
  try {
    const raw = window.localStorage.getItem(CROSSED_COUNT_KEY);
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function AlertsButton() {
  const [staleAlerts, setStaleAlerts] = useState<ThesisAlert[]>([]);
  const [crossedCount, setCrossedCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    const theses = Object.values(getTheses());
    const settings = getDashboardSettings();
    // Build alerts with an empty snapshot map — only stale alerts come out.
    const alerts = buildAlerts(
      theses,
      {},
      settings.thesisProximityPct,
      settings.thesisStaleAfterDays,
    );
    setStaleAlerts(alerts.filter((a) => a.kind === "stale-thesis"));
    setCrossedCount(readCrossedCount());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    // Re-read the crossed count whenever the user opens the drawer or the
    // dashboard rewrites the value via a `storage` event from another tab.
    function onStorage(e: StorageEvent) {
      if (e.key === CROSSED_COUNT_KEY) {
        setCrossedCount(readCrossedCount());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  function handleOpen() {
    refresh();
    setOpen(true);
  }

  const total = staleAlerts.length + crossedCount;
  const showBadge = mounted && total > 0;

  // Synthesise a one-line "summary" alert when crossed zones exist.
  // The drawer can still link to the dashboard / thesis where the full
  // table renders.
  const allAlerts: ThesisAlert[] = [
    ...(crossedCount > 0
      ? [
          {
            kind: "crossed-zone" as const,
            symbol: "—",
            detail: `${crossedCount} thesis level${
              crossedCount === 1 ? "" : "s"
            } within range — open the dashboard for details`,
            href: "/",
          },
        ]
      : []),
    ...staleAlerts,
  ];

  return (
    <>
      <button
        type="button"
        aria-label={
          showBadge ? `Notifications — ${total} unread` : "Notifications"
        }
        onClick={handleOpen}
        className="relative text-text-secondary hover:text-text-primary transition-colors p-2 rounded-full hover:bg-surface-variant"
      >
        <Bell className="size-5" />
        {showBadge ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 min-w-4 h-4 rounded-full bg-regime-risk-off text-[10px] leading-4 text-white font-semibold px-1 flex items-center justify-center"
          >
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>
      <AlertsDrawer
        open={open}
        onClose={() => setOpen(false)}
        alerts={allAlerts}
      />
    </>
  );
}
