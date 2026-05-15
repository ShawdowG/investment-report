"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

const STORAGE_KEY = "sidebar_collapsed";

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Pre-hydration: render the expanded default to avoid layout shift mismatch.
  const isCollapsed = mounted && collapsed;

  return (
    <div className="bg-background text-text-primary min-h-screen flex flex-col md:flex-row">
      <Sidebar collapsed={isCollapsed} onToggle={toggle} />
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-[margin-left] duration-200",
          isCollapsed ? "md:ml-16" : "md:ml-64",
        )}
      >
        <TopBar />
        <main className="flex-1 w-full max-w-container-max mx-auto p-margin-mobile md:p-gutter pb-24 md:pb-gutter">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
