"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Pill-shaped toggle button used by filter rows and sort toggles.
 * Visual styling mirrors the W2.5 focus ring used across the app.
 */
export function Chip({ active, onClick, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        active
          ? "bg-primary-container text-on-primary-container border-primary-container"
          : "bg-surface-variant text-text-secondary border-border-subtle hover:text-text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}
