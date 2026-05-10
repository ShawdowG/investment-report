"use client";

import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface/80 backdrop-blur-md border-r border-border-subtle py-6 px-4 z-50">
      <SidebarNav />
    </aside>
  );
}
