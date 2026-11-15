"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in destructive (red) variant. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Themed replacement for the browser's native `confirm()` — Radix-free, portal-rendered,
 * fully keyboard-accessible. Promoted as W0.4 so /strategies and /settings can drop
 * `window.confirm()` calls that look out of place in dark mode.
 *
 * Behavior:
 *   - Backdrop click or Escape → cancel.
 *   - Tab cycles between Cancel and Confirm (simple two-button focus trap).
 *   - On open, focuses Cancel so destructive confirmation is deliberate; on close, restores focus.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    cancelRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const active = document.activeElement;
      if (active === confirmRef.current) cancelRef.current?.focus();
      else confirmRef.current?.focus();
    }
  }

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={onKeyDown}
        className="max-h-[calc(100dvh-2rem)] w-[90vw] max-w-md overflow-y-auto rounded-lg border border-border-subtle bg-surface p-card-padding shadow-xl"
      >
        <h2
          id={titleId}
          className="font-h2 text-h2 text-text-primary"
        >
          {title}
        </h2>
        {description ? (
          <div
            id={descriptionId}
            className="mt-2 font-body-compact text-body-compact text-text-secondary"
          >
            {description}
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            className={cn(destructive && "bg-regime-risk-off hover:bg-regime-risk-off/90 text-white")}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
