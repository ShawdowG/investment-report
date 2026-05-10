"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "md:hidden fixed inset-0 z-50 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        tabIndex={open ? 0 : -1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface border-r border-border-subtle shadow-xl flex flex-col py-6 px-4 transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-surface-variant"
          >
            <X className="size-5" />
          </button>
        </div>
        <SidebarNav onItemClick={onClose} />
      </aside>
    </div>
  );
}
