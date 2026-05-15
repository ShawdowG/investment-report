"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen fixed left-0 top-0 bg-surface/80 backdrop-blur-md border-r border-border-subtle py-6 z-50 transition-[width] duration-200",
        collapsed ? "w-16 px-2" : "w-64 px-4",
      )}
    >
      <SidebarNav collapsed={collapsed} />
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-text-secondary hover:bg-surface-bright/50 hover:text-text-primary transition-colors"
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {!collapsed && (
          <span className="font-body-compact text-body-compact">Collapse</span>
        )}
      </button>
    </aside>
  );
}
