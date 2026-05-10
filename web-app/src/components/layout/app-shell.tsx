import * as React from "react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-background text-text-primary min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 w-full max-w-container-max mx-auto p-margin-mobile md:p-gutter pb-24 md:pb-gutter">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
