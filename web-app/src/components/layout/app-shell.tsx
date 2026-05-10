"use client";

import * as React from "react";
import { useState } from "react";
import { MobileDrawer } from "./mobile-drawer";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-background text-text-primary min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TopBar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 w-full max-w-container-max mx-auto p-margin-mobile md:p-gutter">
          {children}
        </main>
      </div>
    </div>
  );
}
