"use client";

/**
 * SPEC-026 W10.B — slide-from-right drawer surfaced from the TopBar's
 * bell button. Two sections — "Crossed zones" (today) and "Stale theses".
 * Mounted via createPortal so it escapes any overflow:hidden ancestor.
 * Click backdrop or hit Escape to close; clicking a row navigates and
 * the route change deactivates the drawer naturally.
 */

import Link from "next/link";
import type { ThesisAlert } from "@/lib/research/alerts";
import { Tag } from "@/components/ui/stitch";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AlertsDrawerProps {
  open: boolean;
  onClose: () => void;
  alerts: ThesisAlert[];
}

const KIND_LABEL: Record<ThesisAlert["kind"], string> = {
  "crossed-zone": "Crossed",
  "stale-thesis": "Stale",
};

const KIND_TONE: Record<ThesisAlert["kind"], string> = {
  "crossed-zone": "text-regime-risk-on border-regime-risk-on/30 bg-regime-risk-on/10",
  "stale-thesis": "text-regime-neutral border-regime-neutral/30 bg-regime-neutral/10",
};

export function AlertsDrawer({ open, onClose, alerts }: AlertsDrawerProps) {
  const crossed = alerts.filter((a) => a.kind === "crossed-zone");
  const stale = alerts.filter((a) => a.kind === "stale-thesis");

  return (
    <Sheet
      open={open}
      title="Alerts"
      description="Personal thesis levels and research that may need attention."
      onClose={onClose}
    >
      <div className="space-y-5">
        {alerts.length === 0 ? (
          <p className="font-body-compact text-body-compact text-text-secondary">
            Nothing needs your attention right now.
          </p>
        ) : (
          <>
            <Section
              title="Crossed zones (today)"
              rows={crossed}
              onLinkClick={onClose}
              emptyHint="No thesis levels are in range right now."
            />
            <Section
              title="Stale theses"
              rows={stale}
              onLinkClick={onClose}
              emptyHint="Every thesis is fresh."
            />
          </>
        )}
      </div>
    </Sheet>
  );
}

function Section({
  title,
  rows,
  onLinkClick,
  emptyHint,
}: {
  title: string;
  rows: ThesisAlert[];
  onLinkClick: () => void;
  emptyHint: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-label-caps text-label-caps uppercase text-text-secondary">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((alert, idx) => (
            <li key={`${alert.symbol}-${alert.kind}-${idx}`}>
              <Link
                href={alert.href}
                onClick={onLinkClick}
                className={cn(
                  "block rounded-md border border-border-subtle bg-surface-variant px-3 py-2",
                  "hover:border-primary/60 transition-colors",
                )}
              >
                <div className="flex items-center gap-2">
                  <Tag className={cn("font-label-caps", KIND_TONE[alert.kind])}>
                    {KIND_LABEL[alert.kind]}
                  </Tag>
                  <span className="font-data-mono text-data-mono text-text-primary">
                    {alert.symbol}
                  </span>
                </div>
                <p className="pt-1 font-body-compact text-body-compact text-text-secondary">
                  {alert.detail}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
