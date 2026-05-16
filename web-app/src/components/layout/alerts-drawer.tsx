"use client";

/**
 * SPEC-026 W10.B — slide-from-right drawer surfaced from the TopBar's
 * bell button. Two sections — "Crossed zones" (today) and "Stale theses".
 * Mounted via createPortal so it escapes any overflow:hidden ancestor.
 * Click backdrop or hit Escape to close; clicking a row navigates and
 * the route change deactivates the drawer naturally.
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import type { ThesisAlert } from "@/lib/research/alerts";
import { Tag } from "@/components/ui/stitch";
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
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const crossed = alerts.filter((a) => a.kind === "crossed-zone");
  const stale = alerts.filter((a) => a.kind === "stale-thesis");

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Alerts">
      <button
        type="button"
        aria-label="Close alerts"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-default"
      />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-md",
          "bg-surface border-l border-border-subtle shadow-lg",
          "flex flex-col",
        )}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h2 className="font-h2 text-h2 text-text-primary">Alerts</h2>
          <button
            type="button"
            aria-label="Close alerts"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-variant transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
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
      </aside>
    </div>,
    document.body,
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
